// 客户端/服务端共享的类型定义（与 Prisma 模型对应，避免前端直接依赖 Prisma 类型）。

export type Role = "system" | "user" | "assistant";

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  reasoningContent?: string | null;
  model?: string | null;
  tokenCount?: number | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  description?: string | null;
  tags?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

/** /api/chat 流式事件 */
export type StreamEvent =
  | { type: "meta"; conversationId: string; userMessageId: string; assistantMessageId: string }
  | { type: "delta"; content: string }
  | { type: "reasoning_delta"; content: string }
  | { type: "done"; messageId: string }
  | { type: "error"; message: string };

export interface ChatRequest {
  conversationId?: string;
  content: string;
  model?: string;
  temperature?: number;
  systemPrompt?: string;
}
