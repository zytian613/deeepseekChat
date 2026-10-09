import { prisma } from "@/lib/db";
import { fail, json, serializePrompt } from "@/lib/api";
import { createPromptSchema, parseSearchQuery } from "@/lib/validators";
import { serializeTags } from "@/lib/utils";

// 提示词模板列表：支持 ?q= 搜索（名称/内容/描述/标签）与 ?tag= 标签筛选。
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = parseSearchQuery(url.searchParams.get("q"));
  const tag = url.searchParams.get("tag")?.trim();

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { content: { contains: q } },
            { description: { contains: q } },
            { tags: { contains: q } },
          ],
        }
      : {}),
    ...(tag ? { tags: { contains: tag } } : {}),
  };

  const prompts = await prisma.promptTemplate.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return json({ prompts: prompts.map(serializePrompt) });
}

// 新建模板。
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  const parsed = createPromptSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "参数校验失败", 400);
  }

  const prompt = await prisma.promptTemplate.create({
    data: {
      name: parsed.data.name,
      content: parsed.data.content,
      description: parsed.data.description ?? null,
      tags: serializeTags(parsed.data.tags),
    },
  });
  return json({ prompt: serializePrompt(prompt) }, { status: 201 });
}
