import { prisma } from "@/lib/db";
import { fail } from "@/lib/api";
import { chatRequestSchema } from "@/lib/validators";
import { streamChat, getConfig, MissingApiKeyError } from "@/lib/deepseek";
import { buildContextMessages, toContextMessages } from "@/lib/context";
import { generateTitle, estimateTokens } from "@/lib/utils";
import type { StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SYSTEM_PROMPT =
  "你是一个乐于助人的 AI 助手，请用清晰、准确的中文回答用户的问题。";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数校验失败", 400);
  }

  const config = getConfig();
  // 未配置 API Key 且非 mock 模式时，直接返回明确错误（不落库）。
  if (!config.mock && !config.apiKey) {
    return fail(
      "未配置 DEEPSEEK_API_KEY。请在 .env.local 中填写真实 Key，或将 MOCK_LLM 设为 true 使用模拟模式。",
      500,
    );
  }

  const {
    content,
    temperature,
    systemPrompt,
    editMessageId,
    regenerate,
  } = parsed.data;
  const model = parsed.data.model || config.model;

  // 1. 确定会话。
  let convId = parsed.data.conversationId;

  if (editMessageId) {
    const target = await prisma.message.findUnique({ where: { id: editMessageId } });
    if (!target || target.role !== "user") return fail("待编辑的消息不存在", 404);
    convId = target.conversationId;
  } else if (convId) {
    const exists = await prisma.conversation.findUnique({
      where: { id: convId },
      select: { id: true },
    });
    if (!exists) return fail("会话不存在", 404);
    } else {
    // 检查 content 是否存在，防止 undefined 传入 generateTitle
    const safeContent = content || "新会话"; 
    
    const conversation = await prisma.conversation.create({
      data: { title: generateTitle(safeContent) },
    });
    convId = conversation.id;
  }

  if (!convId) return fail("缺少会话 ID", 400);

  // 2. 处理 user 消息（普通 / 编辑重发 / 重新生成）。
  let userMessageId: string;

  if (editMessageId) {
    const target = await prisma.message.findUniqueOrThrow({
      where: { id: editMessageId },
    });
    await prisma.message.update({
      where: { id: editMessageId },
      data: { content, model },
    });
    // 截断后续消息
    await prisma.message.deleteMany({
      where: { conversationId: convId, createdAt: { gt: target.createdAt } },
    });
    userMessageId = editMessageId;
  } else if (regenerate) {
    const lastUser = await prisma.message.findFirst({
      where: { conversationId: convId, role: "user" },
      orderBy: { createdAt: "desc" },
    });
    if (!lastUser) return fail("没有可重新生成的消息", 400);
    await prisma.message.deleteMany({
      where: { conversationId: convId, createdAt: { gt: lastUser.createdAt } },
    });
    userMessageId = lastUser.id;
  } else {
    const userMessage = await prisma.message.create({
      data: { conversationId: convId, role: "user", content, model },
    });
    userMessageId = userMessage.id;
  }

  // 3. 读取历史消息（最近 100 条，转升序）。
  const history = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  history.reverse();

  // 4. 组装上下文。
  const messages = buildContextMessages(
    systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    toContextMessages(history.map((m) => ({ role: m.role, content: m.content }))),
  );

  // 5. 创建 assistant 占位消息，拿到 id 用于 meta 事件。
  const assistantMessage = await prisma.message.create({
    data: { conversationId: convId, role: "assistant", content: "", model },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          // 客户端已断开，忽略写入错误。
        }
      };

      let fullContent = "";
      let fullReasoning = "";

      try {
        send({
          type: "meta",
          conversationId: convId,
          userMessageId,
          assistantMessageId: assistantMessage.id,
        });

        const result = await streamChat(messages, {
          model,
          temperature,
          signal: request.signal,
          onDelta: (t) => {
            fullContent += t;
            send({ type: "delta", content: t });
          },
          onReasoningDelta: (t) => {
            fullReasoning += t;
            send({ type: "reasoning_delta", content: t });
          },
        });

        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: result.content,
            reasoningContent: result.reasoningContent || null,
            model: result.model,
            tokenCount: estimateTokens(result.content),
          },
        });
        send({ type: "done", messageId: assistantMessage.id });
      } catch (err) {
        const clientAborted = request.signal.aborted;
        if (fullContent || fullReasoning) {
          // 流式中断：保存已生成内容。
          await prisma.message
            .update({
              where: { id: assistantMessage.id },
              data: {
                content: fullContent,
                reasoningContent: fullReasoning || null,
                model,
                tokenCount: estimateTokens(fullContent),
              },
            })
            .catch(() => {});
        } else {
          // 未生成任何内容：删除空占位消息。
          await prisma.message
            .delete({ where: { id: assistantMessage.id } })
            .catch(() => {});
        }
        if (!clientAborted) {
          const message =
            err instanceof MissingApiKeyError
              ? err.message
              : err instanceof Error
                ? err.message
                : "生成失败，请稍后重试";
          send({ type: "error", message });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // 已关闭则忽略。
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
