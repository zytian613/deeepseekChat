// Prisma 7 配置文件。
// .env 不会自动加载，因此这里显式加载 dotenv，并从环境变量读取数据库连接串。
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] ?? "file:./dev.db",
  },
});
