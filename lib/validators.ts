import { z } from "zod";

/** 角色枚举校验。 */
export const roleSchema = z.enum(["system", "user", "assistant"]);

/** POST /api/chat 请求体校验。 */
export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  content: z.string().trim().min(1, "消息内容不能为空").max(100000),
  model: z.string().trim().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().max(100000).optional(),
  // 编辑历史 user 消息后重发（更新该条并截断后续消息）
  editMessageId: z.string().optional(),
  // 重新生成最后一条 assistant 回复
  regenerate: z.boolean().optional(),
});

/** POST /api/conversations 请求体校验。 */
export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

/** PATCH /api/conversations/:id 请求体校验。 */
export const updateConversationSchema = z.object({
  title: z.string().trim().min(1, "标题不能为空").max(200),
});

/** POST /api/prompts 请求体校验。 */
export const createPromptSchema = z.object({
  name: z.string().trim().min(1, "名称不能为空").max(100),
  content: z.string().trim().min(1, "内容不能为空").max(100000),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
});

/** PATCH /api/prompts/:id 请求体校验。 */
export const updatePromptSchema = createPromptSchema.partial();

/** 查询参数：搜索关键词。 */
export function parseSearchQuery(q: unknown): string {
  if (typeof q !== "string") return "";
  return q.trim().slice(0, 200);
}

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
