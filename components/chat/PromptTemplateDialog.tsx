"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ArrowLeft, Wand2 } from "lucide-react";
import type { PromptTemplate } from "@/lib/types";
import { useChatStore } from "@/lib/store";
import {
  extractTemplateVariables,
  parseTags,
  renderTemplate,
} from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onClose: () => void;
}

type View =
  | { kind: "list" }
  | { kind: "form"; editing: PromptTemplate | null }
  | { kind: "fill"; content: string; vars: string[] };

export function PromptTemplateDialog({ open, onClose }: Props) {
  const templates = useChatStore((s) => s.templates);
  const loadTemplates = useChatStore((s) => s.loadTemplates);
  const createTemplate = useChatStore((s) => s.createTemplate);
  const updateTemplate = useChatStore((s) => s.updateTemplate);
  const deleteTemplate = useChatStore((s) => s.deleteTemplate);
  const setDraft = useChatStore((s) => s.setDraft);

  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [view, setView] = useState<View>({ kind: "list" });
  const [form, setForm] = useState({ name: "", content: "", description: "", tags: "" });
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setView({ kind: "list" });
      setQ("");
      setTag("");
      void loadTemplates();
    } else {
      onClose();
    }
  };

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const t of templates) for (const x of t.tags ?? []) s.add(x);
    return Array.from(s).sort();
  }, [templates]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return templates.filter((t) => {
      if (tag && !(t.tags ?? []).includes(tag)) return false;
      if (!kw) return true;
      return (
        t.name.toLowerCase().includes(kw) ||
        t.content.toLowerCase().includes(kw) ||
        (t.description ?? "").toLowerCase().includes(kw) ||
        (t.tags ?? []).some((x) => x.toLowerCase().includes(kw))
      );
    });
  }, [templates, q, tag]);

  const openForm = (editing: PromptTemplate | null) => {
    setForm({
      name: editing?.name ?? "",
      content: editing?.content ?? "",
      description: editing?.description ?? "",
      tags: (editing?.tags ?? []).join(", "),
    });
    setView({ kind: "form", editing });
  };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error("请填写名称和内容");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        content: form.content,
        description: form.description.trim() || undefined,
        tags: parseTags(form.tags),
      };
      if (view.kind === "form" && view.editing) {
        await updateTemplate(view.editing.id, payload);
        toast.success("已更新模板");
      } else {
        await createTemplate(payload);
        toast.success("已创建模板");
      }
      setView({ kind: "list" });
    } catch (err) {
      toast.error("保存失败", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: PromptTemplate) => {
    if (!window.confirm(`确定删除模板「${t.name}」？`)) return;
    await deleteTemplate(t.id);
    toast.success("已删除模板");
  };

  const insert = (content: string) => {
    const vars = extractTemplateVariables(content);
    if (vars.length) {
      setFillValues({});
      setView({ kind: "fill", content, vars });
    } else {
      setDraft(content);
      onClose();
      toast.success("已插入模板到输入框");
    }
  };

  const commitFill = () => {
    if (view.kind !== "fill") return;
    setDraft(renderTemplate(view.content, fillValues));
    onClose();
    toast.success("已插入模板到输入框");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>提示词模板</DialogTitle>
        </DialogHeader>

        {view.kind === "list" && (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索模板…"
                className="flex-1"
              />
              <Button size="sm" onClick={() => openForm(null)}>
                <Plus /> 新建
              </Button>
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <TagChip active={!tag} onClick={() => setTag("")}>
                  全部
                </TagChip>
                {allTags.map((t) => (
                  <TagChip key={t} active={tag === t} onClick={() => setTag(tag === t ? "" : t)}>
                    {t}
                  </TagChip>
                ))}
              </div>
            )}
            <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <div className="py-10 text-center text-sm text-zinc-400">
                  没有模板，点击“新建”创建第一个
                </div>
              )}
              {filtered.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">{t.name}</div>
                      {t.description && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {t.description}
                        </div>
                      )}
                      <div className="mt-1 line-clamp-2 text-xs text-zinc-400">
                        {t.content}
                      </div>
                      {t.tags && t.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {t.tags.map((x) => (
                            <Badge key={x} variant="secondary" className="text-[10px]">
                              {x}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => insert(t.content)} title="使用">
                        <Wand2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => openForm(t)} title="编辑">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" onClick={() => void remove(t)} title="删除">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view.kind === "form" && (
          <>
            <button
              onClick={() => setView({ kind: "list" })}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" /> 返回
            </button>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">名称</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="模板名称"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">内容（支持 {"{{变量}}"}）</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  placeholder="例如：请帮我翻译以下内容：{{text}}"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">描述</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">标签（逗号分隔）</label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="例如：翻译, 写作"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setView({ kind: "list" })}>
                  取消
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          </>
        )}

        {view.kind === "fill" && (
          <>
            <button
              onClick={() => setView({ kind: "list" })}
              className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <ArrowLeft className="h-4 w-4" /> 返回
            </button>
            <div className="space-y-3">
              <div className="text-sm text-zinc-500">
                请填写模板中的变量：
              </div>
              {view.vars.map((v) => (
                <div key={v}>
                  <label className="mb-1 block text-sm font-medium">{"{{" + v + "}}"}</label>
                  <Input
                    value={fillValues[v] ?? ""}
                    onChange={(e) => setFillValues({ ...fillValues, [v]: e.target.value })}
                    placeholder={`填写 ${v}`}
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setView({ kind: "list" })}>
                  取消
                </Button>
                <Button onClick={commitFill}>插入到输入框</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TagChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-2 py-0.5 text-xs transition-colors " +
        (active
          ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800")
      }
    >
      {children}
    </button>
  );
}
