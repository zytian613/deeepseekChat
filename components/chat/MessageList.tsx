"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { MessageItem } from "./MessageItem";
import { useChatStore } from "@/lib/store";

interface Props {
  messages: Message[];
  streamingMessage: {
    id: string;
    content: string;
    reasoningContent: string;
    model: string;
  } | null;
  onRegenerate: () => void;
  onEdit: (message: Message) => void;
  onSaveAsTemplate: (content: string) => void;
}

export function MessageList({
  messages,
  streamingMessage,
  onRegenerate,
  onEdit,
  onSaveAsTemplate,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const health = useChatStore((s) => s.health);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingMessage?.content, streamingMessage?.reasoningContent]);

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  const showEmpty = messages.length === 0 && !streamingMessage;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl">
        {showEmpty && (
          <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-zinc-400">
            <div className="text-4xl">💬</div>
            <div className="text-lg font-medium text-zinc-600 dark:text-zinc-300">
              开始新的对话
            </div>
            <div className="max-w-sm text-sm">
              在下方输入消息，或从左侧选择会话 / 使用提示词模板。
              {health && (
                <span className="mt-1 block">
                  {health.mock
                    ? "当前为 Mock 模式：未调用真实 API。"
                    : `已连接 DeepSeek（${health.model}）。`}
                </span>
              )}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageItem
            key={m.id}
            message={m}
            isLastAssistant={m.id === lastAssistantId}
            onRegenerate={m.id === lastAssistantId ? onRegenerate : undefined}
            onEdit={m.role === "user" ? () => onEdit(m) : undefined}
            onSaveAsTemplate={m.role === "assistant" ? onSaveAsTemplate : undefined}
          />
        ))}

        {streamingMessage && (
          <MessageItem
            message={{
              id: streamingMessage.id,
              conversationId: "",
              role: "assistant",
              content: streamingMessage.content,
              reasoningContent: streamingMessage.reasoningContent || null,
              model: streamingMessage.model,
              tokenCount: null,
              createdAt: new Date().toISOString(),
            }}
            streaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
