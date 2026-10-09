import { prisma } from "@/lib/db";
import { fail, json, serializeConversation } from "@/lib/api";
import { createConversationSchema, parseSearchQuery } from "@/lib/validators";

// 会话列表：按更新时间倒序，支持 ?q= 按标题和消息内容搜索。
export async function GET(request: Request) {
  const q = parseSearchQuery(new URL(request.url).searchParams.get("q"));

  if (q) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { messages: { some: { content: { contains: q } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
    return json({ conversations: conversations.map(serializeConversation) });
  }

  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return json({ conversations: conversations.map(serializeConversation) });
}

// 新建会话。
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数校验失败", 400);
  }

  const title = parsed.data.title || "新会话";
  const conversation = await prisma.conversation.create({
    data: { title },
  });
  return json({ conversation: serializeConversation(conversation) }, { status: 201 });
}
