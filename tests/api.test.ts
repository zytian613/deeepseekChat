import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import type { StreamEvent } from "@/lib/types";
import { GET as listConversations, POST as createConversation } from "@/app/api/conversations/route";
import {
  GET as getConversation,
  PATCH as patchConversation,
  DELETE as deleteConversation,
} from "@/app/api/conversations/[id]/route";
import { GET as listPrompts, POST as createPrompt } from "@/app/api/prompts/route";
import {
  PATCH as patchPrompt,
  DELETE as deletePrompt,
} from "@/app/api/prompts/[id]/route";
import { POST as chat } from "@/app/api/chat/route";

const BASE = "http://localhost";

function req(method: string, path: string, body?: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function readStream(res: Response): Promise<StreamEvent[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as StreamEvent);
}

async function clearDb() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.promptTemplate.deleteMany();
}

beforeEach(clearDb);
afterEach(clearDb);

describe("会话 CRUD", () => {
  it("创建 / 列表 / 详情 / 重命名 / 删除", async () => {
    const created = await createConversation(req("POST", "/api/conversations", { title: "测试会话" }));
    expect(created.status).toBe(201);
    const { conversation } = await created.json();
    expect(conversation.title).toBe("测试会话");

    const list = await listConversations(req("GET", "/api/conversations"));
    const { conversations } = await list.json();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe(conversation.id);

    const detail = await getConversation(new Request(`${BASE}/x`), params(conversation.id));
    const detailJson = await detail.json();
    expect(detailJson.conversation.messages).toEqual([]);

    const renamed = await patchConversation(req("PATCH", "/x", { title: "新标题" }), params(conversation.id));
    const renamedJson = await renamed.json();
    expect(renamedJson.conversation.title).toBe("新标题");

    const del = await deleteConversation(new Request(`${BASE}/x`), params(conversation.id));
    expect(del.status).toBe(200);

    const after = await listConversations(req("GET", "/api/conversations"));
    const afterJson = await after.json();
    expect(afterJson.conversations).toHaveLength(0);
  });

  it("搜索标题与消息内容", async () => {
    await createConversation(req("POST", "/api/conversations", { title: "关于天气" }));
    await createConversation(req("POST", "/api/conversations", { title: "关于编程" }));
    const res = await listConversations(new Request(`${BASE}/api/conversations?q=天气`));
    const { conversations } = await res.json();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe("关于天气");
  });
});

describe("提示词模板 CRUD", () => {
  it("创建 / 列表 / 更新 / 删除，tags 往返", async () => {
    const created = await createPrompt(
      req("POST", "/api/prompts", { name: "翻译", content: "翻译：{{text}}", tags: ["翻译", "工具"] }),
    );
    expect(created.status).toBe(201);
    const { prompt } = await created.json();
    expect(prompt.tags).toEqual(["翻译", "工具"]);

    const list = await listPrompts(new Request(`${BASE}/api/prompts`));
    const { prompts } = await list.json();
    expect(prompts).toHaveLength(1);

    const updated = await patchPrompt(
      req("PATCH", "/x", { content: "请翻译 {{text}}" }),
      params(prompt.id),
    );
    const updatedJson = await updated.json();
    expect(updatedJson.prompt.content).toBe("请翻译 {{text}}");

    const del = await deletePrompt(new Request(`${BASE}/x`), params(prompt.id));
    expect(del.status).toBe(200);
  });
});

describe("聊天流式接口（mock）", () => {
  it("新建会话并流式返回完整事件", async () => {
    const res = await chat(req("POST", "/api/chat", { content: "你好" }));
    expect(res.status).toBe(200);

    const events = await readStream(res);
    const meta = events.find((e) => e.type === "meta");
    const deltas = events.filter((e) => e.type === "delta");
    const done = events.find((e) => e.type === "done");

    expect(meta).toBeTruthy();
    expect(meta?.type === "meta" && meta.conversationId).toBeTruthy();
    expect(deltas.length).toBeGreaterThan(0);
    expect(done).toBeTruthy();

    // 校验落库
    if (meta?.type !== "meta") throw new Error("无 meta");
    const conversation = await prisma.conversation.findUnique({
      where: { id: meta.conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    expect(conversation).toBeTruthy();
    expect(conversation!.messages).toHaveLength(2);
    expect(conversation!.messages[0].role).toBe("user");
    expect(conversation!.messages[1].role).toBe("assistant");
    expect(conversation!.messages[1].content.length).toBeGreaterThan(0);
    expect(conversation!.title).toBe("你好");
  });

  it("重新生成：复用最后一条 user，替换 assistant", async () => {
    const first = await chat(req("POST", "/api/chat", { content: "第一个问题" }));
    const meta = (await readStream(first)).find((e) => e.type === "meta");
    if (meta?.type !== "meta") throw new Error("无 meta");

    const second = await chat(
      req("POST", "/api/chat", {
        conversationId: meta.conversationId,
        content: "第一个问题",
        regenerate: true,
      }),
    );
    await readStream(second);

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: meta.conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    // 仍只有 1 user + 1 assistant（重新生成没有新增 user）
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0].role).toBe("user");
    expect(conversation.messages[1].role).toBe("assistant");
  });

  it("编辑历史 user 消息后截断后续消息", async () => {
    const first = await chat(req("POST", "/api/chat", { content: "问题A" }));
    const meta = (await readStream(first)).find((e) => e.type === "meta");
    if (meta?.type !== "meta") throw new Error("无 meta");

    // 编辑 user 消息，改成新内容
    const edited = await chat(
      req("POST", "/api/chat", {
        conversationId: meta.conversationId,
        editMessageId: meta.userMessageId,
        content: "问题B（已编辑）",
      }),
    );
    await readStream(edited);

    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: meta.conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0].content).toBe("问题B（已编辑）");
    expect(conversation.messages[1].role).toBe("assistant");
  });

  it("缺少内容时返回 400", async () => {
    const res = await chat(req("POST", "/api/chat", { content: "  " }));
    expect(res.status).toBe(400);
  });
});
