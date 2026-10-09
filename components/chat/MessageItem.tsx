"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  Pencil,
  RefreshCw,
  Save,
  User,
} from "lucide-react";
import type { Message } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  message: Message;
  streaming?: boolean;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onSaveAsTemplate?: (content: string) => void;
}

export function MessageItem({
  message,
  streaming,
  isLastAssistant,
  onRegenerate,
  onEdit,
  onSaveAsTemplate,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略剪贴板错误 */
    }
  };

  return (
    <div className={cn("group flex gap-3 py-4", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "min-w-0 max-w-[85%] sm:max-w-[75%]",
          isUser && "flex flex-col items-end",
        )}
      >
        <div
          className={cn(
            "mb-1 flex items-center gap-2 text-xs text-zinc-400",
            isUser && "flex-row-reverse",
          )}
        >
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            {isUser ? "我" : "助手"}
          </span>
          <span>{formatTime(message.createdAt)}</span>
          {message.model && <span className="text-zinc-400">{message.model}</span>}
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-blue-600 text-white"
              : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100",
          )}
        >
          {isAssistant && message.reasoningContent ? (
            <div className="mb-2 border-b border-zinc-200 pb-2 dark:border-zinc-700">
              <button
                onClick={() => setShowReasoning((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", !showReasoning && "-rotate-90")}
                />
                推理过程
              </button>
              {showReasoning && (
                <div className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {message.reasoningContent}
                </div>
              )}
            </div>
          ) : null}

          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.content}</div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {streaming && (
            <span className="streaming-cursor text-zinc-400">正在生成…</span>
          )}
        </div>

        {isAssistant && !streaming ? (
          <div
            className={cn(
              "mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
            )}
          >
            <ActionButton onClick={copy} title="复制">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </ActionButton>
            {onSaveAsTemplate && (
              <ActionButton onClick={() => onSaveAsTemplate(message.content)} title="保存为模板">
                <Save className="h-3.5 w-3.5" />
              </ActionButton>
            )}
            {isLastAssistant && onRegenerate && (
              <ActionButton onClick={onRegenerate} title="重新生成">
                <RefreshCw className="h-3.5 w-3.5" />
              </ActionButton>
            )}
          </div>
        ) : null}

        {isUser && onEdit ? (
          <div className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
            <ActionButton onClick={onEdit} title="编辑后重发">
              <Pencil className="h-3.5 w-3.5" />
            </ActionButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    >
      {children}
    </button>
  );
}
