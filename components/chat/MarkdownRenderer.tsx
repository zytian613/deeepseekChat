"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/**
 * Markdown 渲染：使用 react-markdown（默认转义原始 HTML，防 XSS）+ GFM + 代码高亮。
 */
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown text-[0.95rem]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
