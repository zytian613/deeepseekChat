"use client";

import { useRef } from "react";
import { Send, Square, Sparkles, X } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({ onOpenTemplates }: { onOpenTemplates: () => void }) {
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);
  const streaming = useChatStore((s) => s.streaming);
  const editTarget = useChatStore((s) => s.editTarget);
  const setEditTarget = useChatStore((s) => s.setEditTarget);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);

  const ref = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const send = async () => {
    const content = draft.trim();
    if (!content || streaming) return;
    if (editTarget) {
      await sendMessage(content, { editMessageId: editTarget.id });
      setEditTarget(null);
    } else {
      await sendMessage(content);
    }
    setDraft("");
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.height = "auto";
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="border-t border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-3xl">
        {editTarget && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <span>正在编辑消息，发送后将截断后续消息。</span>
            <button
              onClick={() => {
                setEditTarget(null);
                setDraft("");
              }}
              className="flex items-center gap-1 hover:underline"
            >
              <X className="h-3.5 w-3.5" /> 取消
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenTemplates}
            title="提示词模板"
          >
            <Sparkles className="h-4 w-4" />
          </Button>

          <Textarea
            ref={ref}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              autoResize();
            }}
            onKeyDown={onKeyDown}
            placeholder={editTarget ? "编辑消息后按 Enter 重发…" : "输入消息，Enter 发送，Shift+Enter 换行"}
            rows={1}
            className="max-h-[200px] resize-none"
          />

          {streaming ? (
            <Button
              variant="destructive"
              size="icon"
              onClick={stopGeneration}
              title="停止生成"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => void send()}
              disabled={!draft.trim()}
              title="发送"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-1.5 text-center text-[11px] text-zinc-400">
          DeepSeek 可能会生成不准确的信息，请注意甄别。
        </div>
      </div>
    </div>
  );
}
