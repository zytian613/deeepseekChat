import { describe, expect, it } from "vitest";
import { buildContextMessages, type ContextMessage } from "@/lib/context";

function msg(role: ContextMessage["role"], content: string): ContextMessage {
  return { role, content };
}

describe("buildContextMessages", () => {
  it("保留 system prompt 在最前", () => {
    const result = buildContextMessages("你是助手", [msg("user", "你好")]);
    expect(result[0]).toEqual({ role: "system", content: "你是助手" });
    expect(result).toHaveLength(2);
  });

  it("优先保留最近 20 条消息", () => {
    const messages: ContextMessage[] = [];
    for (let i = 0; i < 30; i++) {
      messages.push(msg(i % 2 === 0 ? "user" : "assistant", `消息${i}`));
    }
    const result = buildContextMessages(undefined, messages, { maxMessages: 20 });
    const nonSystem = result.filter((m) => m.role !== "system");
    expect(nonSystem).toHaveLength(20);
    expect(nonSystem[0].content).toBe("消息10");
    expect(nonSystem[19].content).toBe("消息29");
  });

  it("超出 token 预算时从旧到新截断，且至少保留最近一条 user 消息", () => {
    const long = "字".repeat(100); // 约 100 token
    const messages = [
      msg("user", "第一轮问题"),
      msg("assistant", long),
      msg("user", "第二轮问题"),
      msg("assistant", long),
      msg("user", "最新问题"),
    ];
    // 预算很小，只够 system + 最近一条 user
    const result = buildContextMessages("系统", messages, {
      maxMessages: 20,
      maxTokens: 60,
    });
    const nonSystem = result.filter((m) => m.role !== "system");
    // 至少保留最近一条 user（"最新问题"）
    expect(nonSystem.some((m) => m.content === "最新问题")).toBe(true);
    // 最旧的消息被截断
    expect(nonSystem.some((m) => m.content === "第一轮问题")).toBe(false);
    // system 在最前
    expect(result[0].role).toBe("system");
  });

  it("无 user 消息时仍能返回 system（不抛错）", () => {
    const result = buildContextMessages("系统", [
      msg("assistant", "只有助手"),
    ]);
    expect(result[0].role).toBe("system");
  });

  it("空 system prompt 不加入", () => {
    const result = buildContextMessages("   ", [msg("user", "hi")]);
    expect(result[0].role).toBe("user");
  });
});
