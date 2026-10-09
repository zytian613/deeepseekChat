import { prisma } from "@/lib/db";
import { fail, json, serializePrompt } from "@/lib/api";
import { updatePromptSchema } from "@/lib/validators";
import { serializeTags } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

// 更新模板（部分字段）。
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  const parsed = updatePromptSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数校验失败", 400);
  }

  const data = parsed.data;
  const prompt = await prisma.promptTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      ...(data.tags !== undefined ? { tags: serializeTags(data.tags) } : {}),
    },
  });
  return json({ prompt: serializePrompt(prompt) });
}

// 删除模板。
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.promptTemplate.delete({ where: { id } });
  return json({ ok: true });
}
