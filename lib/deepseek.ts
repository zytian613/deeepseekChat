import OpenAI from "openai";
import type { ContextMessage } from "@/lib/context";

export interface DeepSeekConfig {
  apiKey: string | undefined;
  baseURL: string;
  model: string;
  mock: boolean;
}

export function getConfig(): DeepSeekConfig {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    mock: process.env.MOCK_LLM === "true",
  };
}

export interface StreamOptions {
  model?: string;
  temperature?: number;
  signal?: AbortSignal;
  onDelta?: (content: string) => void;
  onReasoningDelta?: (content: string) => void;
}

export interface StreamResult {
  content: string;
  reasoningContent: string;
  model: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function lastUserContent(messages: ContextMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function mockReply(userContent: string): string {
  const brief = userContent.replace(/\s+/g, " ").trim().slice(0, 60);
  return [
    `（Mock 模式回复）已收到你的消息${brief ? `：「${brief}」` : ""}。`,
    "",
    "当前未配置 DEEPSEEK_API_KEY，因此使用本地模拟流式输出。",
    "请编辑 `.env.local`：填入真实的 `DEEPSEEK_API_KEY`，并将 `MOCK_LLM` 设为 `false`，即可获得 DeepSeek 的真实回复。",
  ].join("\n");
}

function chunkText(text: string, size: number): string[] {
  const parts: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    parts.push(text.slice(i, i + size));
  }
  return parts;
}

/** 缺少 API Key 时抛出的明确错误。 */
export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "未配置 DEEPSEEK_API_KEY。请在 .env.local 中填写真实 Key，或将 MOCK_LLM 设为 true 使用模拟模式。",
    );
    this.name = "MissingApiKeyError";
  }
}

/**
 * 调用 DeepSeek（OpenAI 兼容）并流式返回。
 * - MOCK_LLM=true 时走本地 mock 流；
 * - 无 API Key 且非 mock 时抛出 MissingApiKeyError；
 * - 支持 deepseek-reasoner 的 reasoning_content 与 content 分离。
 */
export async function streamChat(
  messages: ContextMessage[],
  opts: StreamOptions = {},
): Promise<StreamResult> {
  const config = getConfig();
  const model = opts.model || config.model;

  if (config.mock) {
    const reply = mockReply(lastUserContent(messages));
    let content = "";
    for (const part of chunkText(reply, 12)) {
      if (opts.signal?.aborted) break;
      await sleep(10);
      if (opts.signal?.aborted) break;
      content += part;
      opts.onDelta?.(part);
    }
    return { content, reasoningContent: "", model };
  }

  if (!config.apiKey) {
    throw new MissingApiKeyError();
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const stream = await client.chat.completions.create(
    {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: opts.temperature ?? 0.7,
      stream: true,
    },
    { signal: opts.signal },
  );

  let content = "";
  let reasoningContent = "";

  for await (const chunk of stream) {
    const delta = (chunk.choices[0]?.delta ?? {}) as {
      content?: string | null;
      reasoning_content?: string | null;
    };
    if (delta.reasoning_content) {
      reasoningContent += delta.reasoning_content;
      opts.onReasoningDelta?.(delta.reasoning_content);
    }
    if (delta.content) {
      content += delta.content;
      opts.onDelta?.(delta.content);
    }
  }

  return { content, reasoningContent, model };
}
