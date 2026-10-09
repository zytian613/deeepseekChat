import { describe, expect, it } from "vitest";
import {
  extractTemplateVariables,
  renderTemplate,
  generateTitle,
  parseTags,
  serializeTags,
} from "@/lib/utils";

describe("extractTemplateVariables", () => {
  it("提取多个变量并去重", () => {
    const vars = extractTemplateVariables(
      "请翻译：{{text}}，语气是{{ tone }}，再翻译一次{{text}}",
    );
    expect(vars).toEqual(["text", "tone"]);
  });

  it("无变量返回空数组", () => {
    expect(extractTemplateVariables("普通文本")).toEqual([]);
  });
});

describe("renderTemplate", () => {
  it("替换变量，未提供的保持原样", () => {
    const out = renderTemplate("你好 {{name}}，{{missing}}", { name: "小明" });
    expect(out).toBe("你好 小明，{{missing}}");
  });
});

describe("generateTitle", () => {
  it("取首行并截断", () => {
    expect(generateTitle("第一行内容\n第二行")).toBe("第一行内容");
  });

  it("超长截断并加省略号", () => {
    const t = generateTitle("很长的标题".repeat(10), 8);
    expect(t.endsWith("…")).toBe(true);
    expect(t.length).toBeLessThanOrEqual(9);
  });

  it("空内容返回默认标题", () => {
    expect(generateTitle("   ")).toBe("新会话");
  });
});

describe("tags 序列化", () => {
  it("parseTags 拆分并去空白", () => {
    expect(parseTags("翻译, 写作 , 翻译")).toEqual(["翻译", "写作", "翻译"]);
    expect(parseTags(null)).toEqual([]);
  });

  it("serializeTags 往返", () => {
    expect(serializeTags(["a", "b"])).toBe("a,b");
    expect(serializeTags([])).toBeNull();
  });
});
