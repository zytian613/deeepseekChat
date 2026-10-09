import { prisma } from "@/lib/db";
import { fail, json, serializeConversation } from "@/lib/api";
import { updateConversationSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

// 会话详情（含消息，按创建时间升序）。
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return fail("会话不存在", 404);
  return json({ conversation: serializeConversation(conversation) });
}

// 重命名会话。
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  const parsed = updateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数校验失败", 400);
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title: parsed.data.title },
  });
  return json({ conversation: serializeConversation(conversation) });
}

// 删除会话（级联删除其消息）。
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return json({ ok: true });
}
