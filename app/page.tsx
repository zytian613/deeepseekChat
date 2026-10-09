"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useChatStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { generateTitle } from "@/lib/utils";
import { Sidebar } from "@/components/chat/Sidebar";
import { MessageList } from "@/components/chat/MessageList";
import { Composer } from "@/components/chat/Composer";
import { PromptTemplateDialog } from "@/components/chat/PromptTemplateDialog";
import { SettingsDialog } from "@/components/chat/SettingsDialog";
import { Toaster } from "@/components/chat/Toaster";
import { Button } from "@/components/ui/button";

export default function Home() {
  const messages = useChatStore((s) => s.messages);
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setEditTarget = useChatStore((s) => s.setEditTarget);
  const setDraft = useChatStore((s) => s.setDraft);
  const setTheme = useChatStore((s) => s.setTheme);
  const setSettings = useChatStore((s) => s.setSettings);
  const init = useChatStore((s) => s.init);
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const createTemplate = useChatStore((s) => s.createTemplate);

  const [templateOpen, setTemplateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("theme");
    if (t === "dark" || t === "light") setTheme(t);
    try {
      const s = localStorage.getItem("chat-settings");
      if (s) setSettings(JSON.parse(s));
    } catch {
      /* ignore */
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTitle =
    conversations.find((c) => c.id === activeId)?.title ?? "DeepSeek Chat";

  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const onRegenerate = () => {
    if (!lastUserMessage) return;
    void sendMessage(lastUserMessage.content, { regenerate: true });
  };

  const onEdit = (m: { id: string; content: string }) => {
    setEditTarget({ id: m.id, content: m.content });
    setDraft(m.content);
  };

  const onSaveAsTemplate = async (content: string) => {
    const name = window.prompt("模板名称", generateTitle(content, 20));
    if (!name) return;
    try {
      await createTemplate({ name: name.trim(), content });
      toast.success("已保存为模板", name.trim());
    } catch (err) {
      toast.error("保存失败", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="flex h-full">
      {/* 桌面端侧栏 */}
      <div className="hidden md:block">
        <Sidebar onOpenTemplates={() => setTemplateOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* 移动端抽屉 */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onOpenTemplates={() => setTemplateOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
          </div>
        </div>
      )}

      {/* 主内容 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 md:hidden dark:border-zinc-800">
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="truncate text-sm font-medium">{activeTitle}</span>
        </header>

        <MessageList
          messages={messages}
          streamingMessage={streamingMessage}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onSaveAsTemplate={(c) => void onSaveAsTemplate(c)}
        />

        <Composer onOpenTemplates={() => setTemplateOpen(true)} />
      </div>

      <PromptTemplateDialog open={templateOpen} onClose={() => setTemplateOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toaster />
    </div>
  );
}
