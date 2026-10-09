import { describe, expect, it } from "vitest";
import {
  chatRequestSchema,
  createConversationSchema,
  updateConversationSchema,
  createPromptSchema,
  updatePromptSchema,
} from "@/lib/validators";

describe("chatRequestSchema", () => {
  it("接受合法请求", () => {
    const r = chatRequestSchema.safeParse({ content: "你好", temperature: 0.7 });
    expect(r.success).toBe(true);
  });

  it("拒绝空内容", () => {
    const r = chatRequestSchema.safeParse({ content: "   " });
    expect(r.success).toBe(false);
  });

  it("拒绝越界温度", () => {
    expect(chatRequestSchema.safeParse({ content: "x", temperature: 3 }).success).toBe(false);
    expect(chatRequestSchema.safeParse({ content: "x", temperature: -1 }).success).toBe(false);
  });

  it("接受可选字段 editMessageId / regenerate", () => {
    const r = chatRequestSchema.safeParse({
      content: "x",
      conversationId: "c1",
      editMessageId: "m1",
      regenerate: true,
    });
    expect(r.success).toBe(true);
  });
});

describe("conversation / prompt 校验", () => {
  it("updateConversationSchema 要求非空标题", () => {
    expect(updateConversationSchema.safeParse({ title: "好" }).success).toBe(true);
    expect(updateConversationSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("createPromptSchema 校验 tags 为字符串数组", () => {
    expect(
      createPromptSchema.safeParse({ name: "n", content: "c", tags: ["a"] }).success,
    ).toBe(true);
    expect(
      createPromptSchema.safeParse({ name: "n", content: "c", tags: [1] }).success,
    ).toBe(false);
  });

  it("updatePromptSchema 允许部分更新", () => {
    expect(updatePromptSchema.safeParse({ name: "n" }).success).toBe(true);
    expect(updatePromptSchema.safeParse({}).success).toBe(true);
  });

  it("createConversationSchema title 可选", () => {
    expect(createConversationSchema.safeParse({}).success).toBe(true);
    expect(createConversationSchema.safeParse({ title: "标题" }).success).toBe(true);
  });
});
