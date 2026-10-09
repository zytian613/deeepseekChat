"use client";

import { useEffect, useState } from "react";
import {
  FileJson,
  FileText,
  MessageSquarePlus,
  Moon,
  MoreHorizontal,
  Pencil,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useChatStore } from "@/lib/store";
import { cn, conversationToMarkdown, downloadFile, formatTime } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onOpenTemplates, onOpenSettings }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const theme = useChatStore((s) => s.theme);
  const toggleTheme = useChatStore((s) => s.toggleTheme);
  const health = useChatStore((s) => s.health);

  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => void loadConversations(query), 300);
    return () => clearTimeout(t);
  }, [query, loadConversations]);

  const newConversation = async () => {
    setQuery("");
    await createConversation();
  };

  const startRename = (id: string, title: string) => {
    setRenamingId(id);
    setRenameValue(title);
  };

  const commitRename = async (id: string) => {
    const title = renameValue.trim();
    if (title) await renameConversation(id, title);
    setRenamingId(null);
  };

  const exportConversation = async (id: string, format: "json" | "markdown") => {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) {
      toast.error("导出失败", "无法读取会话");
      return;
    }
    const j = await res.json();
    const c = j.conversation;
    if (format === "json") {
      downloadFile(`${safeName(c.title)}.json`, JSON.stringify(c, null, 2), "application/json");
    } else {
      downloadFile(
        `${safeName(c.title)}.md`,
        conversationToMarkdown(c.title, c.messages ?? []),
      );
    }
    toast.success("已导出", `${c.title}`);
  };

  return (
    <div className="flex h-full w-72 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between p-3">
        <div className="text-sm font-semibold">DeepSeek Chat</div>
        <Button size="icon-sm" onClick={newConversation} title="新建会话">
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索会话…"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <div className="px-2 py-8 text-center text-sm text-zinc-400">
            暂无会话，点击右上角新建
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900",
              activeId === c.id && "bg-zinc-200 dark:bg-zinc-800",
            )}
            onClick={() => void selectConversation(c.id)}
          >
            {renamingId === c.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => void commitRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitRename(c.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded border border-zinc-300 bg-white px-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{c.title}</div>
                  <div className="text-[11px] text-zinc-400">{formatTime(c.updatedAt)}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded p-1 text-zinc-400 opacity-0 hover:bg-zinc-200 group-hover:opacity-100 dark:hover:bg-zinc-800"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => startRename(c.id, c.title)}>
                      <Pencil /> 重命名
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void exportConversation(c.id, "json")}>
                      <FileJson /> 导出 JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void exportConversation(c.id, "markdown")}>
                      <FileText /> 导出 Markdown
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 dark:text-red-400"
                      onSelect={() => void deleteConversation(c.id)}
                    >
                      <Trash2 /> 删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={onOpenTemplates} title="提示词模板">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onOpenSettings} title="设置">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={toggleTheme} title="切换主题">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                health?.mock ? "bg-amber-400" : "bg-green-500",
              )}
            />
            {health?.mock ? "Mock" : health?.model ?? "…"}
          </div>
        </div>
      </div>
    </div>
  );
}

function safeName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "conversation";
}
