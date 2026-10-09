"use client";

import { create } from "zustand";
import type { Conversation, Message, PromptTemplate, StreamEvent } from "@/lib/types";
import { toast } from "@/lib/toast";

export interface Settings {
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface Health {
  model: string;
  mock: boolean;
  hasApiKey: boolean;
  baseURL: string;
}

interface StreamingMessage {
  id: string;
  content: string;
  reasoningContent: string;
  model: string;
}

interface SendOptions {
  editMessageId?: string;
  regenerate?: boolean;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  messages: Message[];
  templates: PromptTemplate[];
  streaming: boolean;
  streamingMessage: StreamingMessage | null;
  settings: Settings;
  theme: "light" | "dark";
  sidebarOpen: boolean;
  health: Health | null;
  abortController: AbortController | null;
  editTarget: { id: string; content: string } | null;
  draft: string;

  init: () => Promise<void>;
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSettings: (s: Partial<Settings>) => void;
  setEditTarget: (t: { id: string; content: string } | null) => void;
  setDraft: (v: string) => void;

  loadConversations: (q?: string) => Promise<void>;
  createConversation: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  loadTemplates: () => Promise<void>;
  createTemplate: (p: { name: string; content: string; description?: string; tags?: string[] }) => Promise<void>;
  updateTemplate: (id: string, p: Partial<{ name: string; content: string; description: string; tags: string[] }>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  sendMessage: (content: string, opts?: SendOptions) => Promise<void>;
  stopGeneration: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  model: "deepseek-chat",
  temperature: 0.7,
  systemPrompt: "",
};

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeId: null,
  messages: [],
  templates: [],
  streaming: false,
  streamingMessage: null,
  settings: DEFAULT_SETTINGS,
  theme: "light",
  sidebarOpen: false,
  health: null,
  abortController: null,
  editTarget: null,
  draft: "",

  init: async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const health = (await res.json()) as Health;
        set((s) => ({
          health,
          settings: { ...s.settings, model: health.model || s.settings.model },
        }));
      }
    } catch {
      /* 忽略健康检查失败 */
    }
    await get().loadConversations();
    await get().loadTemplates();
  },

  setTheme: (t) => {
    set({ theme: t });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", t === "dark");
      localStorage.setItem("theme", t);
    }
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSettings: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),
  setEditTarget: (t) => set({ editTarget: t }),
  setDraft: (v) => set({ draft: v }),

  loadConversations: async (q) => {
    const url = q ? `/api/conversations?q=${encodeURIComponent(q)}` : "/api/conversations";
    const res = await fetch(url);
    if (!res.ok) return;
    const j = await res.json();
    set({ conversations: j.conversations });
  },

  createConversation: async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新会话" }),
    });
    if (!res.ok) return;
    const j = await res.json();
    set((s) => ({
      conversations: [j.conversation, ...s.conversations],
      activeId: j.conversation.id,
      messages: [],
    }));
  },

  selectConversation: async (id) => {
    set({ activeId: id, messages: [], streamingMessage: null, sidebarOpen: false });
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const j = await res.json();
    set({ messages: j.conversation.messages ?? [] });
  },

  renameConversation: async (id, title) => {
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return;
    const j = await res.json();
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? j.conversation : c,
      ),
    }));
  },

  deleteConversation: async (id) => {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    set((s) => {
      const conversations = s.conversations.filter((c) => c.id !== id);
      const next: Partial<ChatState> = { conversations };
      if (s.activeId === id) {
        next.activeId = null;
        next.messages = [];
      }
      return next as ChatState;
    });
  },

  loadTemplates: async () => {
    const res = await fetch("/api/prompts");
    if (!res.ok) return;
    const j = await res.json();
    set({ templates: j.prompts });
  },

  createTemplate: async (p) => {
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "创建失败");
    }
    await get().loadTemplates();
  },

  updateTemplate: async (id, p) => {
    const res = await fetch(`/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "更新失败");
    }
    await get().loadTemplates();
  },

  deleteTemplate: async (id) => {
    const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    await get().loadTemplates();
  },

  sendMessage: async (content, opts = {}) => {
    const state = get();
    if (state.streaming) return;

    const controller = new AbortController();
    const model = state.settings.model || "deepseek-chat";

    // 1. 本地乐观更新消息列表
    let baseMessages = state.messages;
    const tempUserId = `tmp-user-${Date.now()}`;

    if (opts.editMessageId) {
      const idx = baseMessages.findIndex((m) => m.id === opts.editMessageId);
      if (idx >= 0) {
        baseMessages = baseMessages.slice(0, idx + 1);
        baseMessages[idx] = { ...baseMessages[idx], content };
      }
    } else if (opts.regenerate) {
      if (baseMessages.length && baseMessages[baseMessages.length - 1].role === "assistant") {
        baseMessages = baseMessages.slice(0, -1);
      }
    } else {
      baseMessages = [
        ...baseMessages,
        {
          id: tempUserId,
          conversationId: state.activeId ?? "",
          role: "user" as const,
          content,
          reasoningContent: null,
          model,
          tokenCount: null,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    set({
      messages: baseMessages,
      streaming: true,
      abortController: controller,
      streamingMessage: {
        id: `tmp-assistant-${Date.now()}`,
        content: "",
        reasoningContent: "",
        model,
      },
    });

    const finalizePartial = () => {
      const s = get();
      const sm = s.streamingMessage;
      let msgs = s.messages;
      if (sm && (sm.content || sm.reasoningContent)) {
        msgs = [
          ...msgs,
          {
            id: sm.id,
            conversationId: s.activeId ?? "",
            role: "assistant" as const,
            content: sm.content,
            reasoningContent: sm.reasoningContent || null,
            model: sm.model,
            tokenCount: null,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      set({ messages: msgs, streamingMessage: null, streaming: false, abortController: null });
    };

    try {
      const body: Record<string, unknown> = {
        content,
        model,
        temperature: state.settings.temperature,
        systemPrompt: state.settings.systemPrompt || undefined,
      };
      if (state.activeId) body.conversationId = state.activeId;
      if (opts.editMessageId) body.editMessageId = opts.editMessageId;
      if (opts.regenerate) body.regenerate = true;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = "请求失败";
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        // 回滚乐观消息（正常模式才需要移除临时用户消息）
        if (!opts.editMessageId && !opts.regenerate) {
          set((s) => ({ messages: s.messages.filter((m) => m.id !== tempUserId) }));
        }
        set({ streaming: false, streamingMessage: null, abortController: null });
        toast.error("发送失败", msg);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (evt: StreamEvent) => {
        if (evt.type === "meta") {
          set((s) => ({
            activeId: evt.conversationId,
            messages: s.messages.map((m) =>
              m.id === tempUserId ? { ...m, id: evt.userMessageId, conversationId: evt.conversationId } : m,
            ),
            streamingMessage: {
              ...(s.streamingMessage ?? { content: "", reasoningContent: "", model }),
              id: evt.assistantMessageId,
            },
          }));
        } else if (evt.type === "delta") {
          set((s) => ({
            streamingMessage: s.streamingMessage
              ? { ...s.streamingMessage, content: s.streamingMessage.content + evt.content }
              : s.streamingMessage,
          }));
        } else if (evt.type === "reasoning_delta") {
          set((s) => ({
            streamingMessage: s.streamingMessage
              ? { ...s.streamingMessage, reasoningContent: s.streamingMessage.reasoningContent + evt.content }
              : s.streamingMessage,
          }));
        } else if (evt.type === "done") {
          const s = get();
          const sm = s.streamingMessage;
          let msgs = s.messages;
          if (sm && (sm.content || sm.reasoningContent)) {
            msgs = [
              ...msgs,
              {
                id: evt.messageId,
                conversationId: s.activeId ?? "",
                role: "assistant" as const,
                content: sm.content,
                reasoningContent: sm.reasoningContent || null,
                model: sm.model,
                tokenCount: null,
                createdAt: new Date().toISOString(),
              },
            ];
          }
          set({ messages: msgs, streamingMessage: null, streaming: false, abortController: null });
        } else if (evt.type === "error") {
          finalizePartial();
          toast.error("生成失败", evt.message);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            handleEvent(JSON.parse(line) as StreamEvent);
          } catch {
            /* 忽略无法解析的行 */
          }
        }
      }

      // 正常结束但没收到 done（理论上不会）：兜底收尾
      if (get().streaming) {
        finalizePartial();
      }
      // 刷新会话列表（更新标题/排序）
      void get().loadConversations();
    } catch (err) {
      const aborted = controller.signal.aborted;
      finalizePartial();
      if (aborted) {
        void get().loadConversations();
      } else if (err instanceof Error) {
        toast.error("请求失败", err.message);
      }
    }
  },

  stopGeneration: () => {
    const c = get().abortController;
    if (c) c.abort();
  },
}));
