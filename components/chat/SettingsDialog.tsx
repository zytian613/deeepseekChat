"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
}

const MODELS = [
  { value: "deepseek-chat", label: "deepseek-chat", desc: "通用对话（推荐）" },
  { value: "deepseek-reasoner", label: "deepseek-reasoner", desc: "推理模型，可显示推理过程" },
];

export function SettingsDialog({ open, onClose }: Props) {
  const settings = useChatStore((s) => s.settings);
  const setSettings = useChatStore((s) => s.setSettings);
  const health = useChatStore((s) => s.health);

  const [model, setModel] = useState(settings.model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);

  // 打开时同步最新设置
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) {
    setLastOpen(true);
    setModel(settings.model);
    setTemperature(settings.temperature);
    setSystemPrompt(settings.systemPrompt);
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  const save = () => {
    setSettings({ model, temperature, systemPrompt });
    localStorage.setItem(
      "chat-settings",
      JSON.stringify({ model, temperature, systemPrompt }),
    );
    toast.success("设置已保存");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>模型、采样参数与系统提示词</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">模型</label>
            <div className="grid grid-cols-2 gap-2">
              {MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setModel(m.value)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    model === m.value
                      ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                      : "border-zinc-200 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900",
                  )}
                >
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs opacity-70">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>采样温度</span>
              <span className="text-zinc-400">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-zinc-900 dark:accent-zinc-50"
            />
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>精确</span>
              <span>随机</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">系统提示词（可选）</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder="留空则使用默认系统提示词"
            />
          </div>

          <div className="rounded-md border border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <div className="mb-1 font-medium text-zinc-700 dark:text-zinc-200">
              连接状态
            </div>
            {health ? (
              <div className="space-y-0.5">
                <div>
                  模式：{health.mock ? "Mock（未调用真实 API）" : "真实 API"}
                </div>
                <div>模型：{health.model}</div>
                <div>地址：{health.baseURL}</div>
                {!health.hasApiKey && (
                  <div className="text-amber-600 dark:text-amber-400">
                    未配置 DEEPSEEK_API_KEY。请在 .env.local 中填写。
                  </div>
                )}
              </div>
            ) : (
              <div>正在读取状态…</div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={save}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
