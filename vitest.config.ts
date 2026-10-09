import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // 集成测试共用同一个 SQLite 文件，串行执行避免锁冲突
    fileParallelism: false,
    globalSetup: "tests/global-setup.ts",
    env: {
      DATABASE_URL: "file:./test.db",
      MOCK_LLM: "true",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-chat",
      DEEPSEEK_API_KEY: "",
    },
    testTimeout: 30000,
  },
});
