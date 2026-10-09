import type { Conversation, Message, PromptTemplate } from "@/lib/types";
import { parseTags } from "@/lib/utils";

/** 统一 JSON 响应（使用 Web 标准 Response，便于测试）。 */
export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init?.headers ?? {}) },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ error: message }, { status });
}

type DbMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  reasoningContent: string | null;
  model: string | null;
  tokenCount: number | null;
  createdAt: Date;
};

type DbConversation = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: DbMessage[];
};

type DbPrompt = {
  id: string;
  name: string;
  content: string;
  description: string | null;
  tags: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeMessage(m: DbMessage): Message {
  return {
    id: m.id,
    conversationId: m.conversationId,
    role: m.role as Message["role"],
    content: m.content,
    reasoningContent: m.reasoningContent,
    model: m.model,
    tokenCount: m.tokenCount,
    createdAt: m.createdAt.toISOString(),
  };
}

export function serializeConversation(c: DbConversation): Conversation {
  return {
    id: c.id,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    messages: c.messages?.map(serializeMessage),
  };
}

export function serializePrompt(p: DbPrompt): PromptTemplate {
  return {
    id: p.id,
    name: p.name,
    content: p.content,
    description: p.description,
    tags: parseTags(p.tags),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
