import { estimateTokens } from "@/lib/utils";

export interface ContextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface BuildContextOptions {
  /** 保留的最近消息条数（不含 system）。 */
  maxMessages?: number;
  /** 上下文 token 预算。 */
  maxTokens?: number;
}

const DEFAULT_MAX_MESSAGES = 20;
const DEFAULT_MAX_TOKENS = 8192;
/** 每条消息附加少量协议开销（角色/分隔符），估算更贴近真实 token。 */
const MESSAGE_OVERHEAD = 4;

function msgTokens(m: ContextMessage): number {
  return estimateTokens(m.content) + MESSAGE_OVERHEAD;
}

/**
 * 组装发送给大模型的消息上下文：
 * 1. 保留 system prompt 在最前；
 * 2. 优先保留最近 maxMessages 条消息；
 * 3. 超出 token 预算时从旧到新截断；
 * 4. 至少保留最近一条 user 消息。
 */
export function buildContextMessages(
  systemPrompt: string | undefined,
  messages: ContextMessage[],
  options: BuildContextOptions = {},
): ContextMessage[] {
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

  const result: ContextMessage[] = [];
  if (systemPrompt && systemPrompt.trim()) {
    result.push({ role: "system", content: systemPrompt.trim() });
  }

  const recent = messages.slice(-maxMessages);

  // 受保护消息：最近一条 user 消息在 recent 中的下标
  let protectedIdx = -1;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].role === "user") {
      protectedIdx = i;
      break;
    }
  }

  let total = result.reduce((s, m) => s + msgTokens(m), 0);
  const kept = new Array<boolean>(recent.length).fill(true);
  total += recent.reduce((s, m) => s + msgTokens(m), 0);

  // 从旧到新丢弃可丢弃的消息，直到满足预算
  for (let i = 0; i < recent.length && total > maxTokens; i++) {
    if (i === protectedIdx) continue; // 永不丢弃最近一条 user 消息
    if (kept[i]) {
      kept[i] = false;
      total -= msgTokens(recent[i]);
    }
  }

  for (let i = 0; i < recent.length; i++) {
    if (kept[i]) result.push(recent[i]);
  }
  return result;
}

/** 将数据库消息映射为上下文消息。 */
export function toContextMessages(
  messages: { role: string; content: string }[],
): ContextMessage[] {
  return messages
    .filter(
      (m): m is ContextMessage =>
        m.role === "system" || m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));
}
