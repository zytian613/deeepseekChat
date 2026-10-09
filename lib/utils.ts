import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** 合并 Tailwind class，供 ui 组件使用（shadcn 风格）。 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 从消息内容生成会话标题：取首行、去空白、截断。 */
export function generateTitle(content: string, maxLen = 30): string {
  const firstLine = content.split("\n").find((l) => l.trim().length > 0) ?? "";
  const clean = firstLine.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean || "新会话";
  return clean.slice(0, maxLen).trimEnd() + "…";
}

/** 提取模板中的 {{variable}} 占位符，返回去重后的变量名列表。 */
export function extractTemplateVariables(content: string): string[] {
  const re = /\{\{\s*([^{}]+?)\s*\}\}/g;
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    seen.add(m[1].trim());
  }
  return Array.from(seen);
}

/** 用给定变量值替换模板中的 {{variable}}。未提供的变量保持原样。 */
export function renderTemplate(
  content: string,
  values: Record<string, string>,
): string {
  return content.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, name: string) => {
    const key = name.trim();
    return Object.prototype.hasOwnProperty.call(values, key)
      ? values[key]
      : `{{${key}}}`;
  });
}

/** 时间格式化（本地时区）。 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return time;
  return (
    d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) +
    " " +
    time
  );
}

/** 将标签字符串（逗号分隔）解析为数组。 */
export function parseTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 将标签数组序列化为逗号分隔字符串。 */
export function serializeTags(tags?: string[] | null): string | null {
  const arr = (tags ?? []).map((t) => t.trim()).filter(Boolean);
  return arr.length ? arr.join(",") : null;
}

/** 触发浏览器端文件下载。 */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 将会话导出为 Markdown。 */
export function conversationToMarkdown(
  title: string,
  messages: { role: string; content: string; reasoningContent?: string | null }[],
): string {
  const lines: string[] = [`# ${title}`, ""];
  for (const m of messages) {
    const label = m.role === "user" ? "🧑 用户" : m.role === "assistant" ? "🤖 助手" : "⚙️ 系统";
    lines.push(`## ${label}`, "");
    if (m.reasoningContent) {
      lines.push("<details>", "<summary>推理过程</summary>", "", m.reasoningContent, "", "</details>", "");
    }
    lines.push(m.content, "");
  }
  return lines.join("\n");
}

/** 估算 token 数：中日韩字符约 1 token/字，其余约 4 字符/token。 */
export function estimateTokens(text: string): number {
  let cjk = 0;
  let other = 0;
  for (const ch of text) {
    if (/[一-鿿぀-ヿ가-힯]/.test(ch)) cjk++;
    else other++;
  }
  return Math.ceil(cjk + other / 4);
}
