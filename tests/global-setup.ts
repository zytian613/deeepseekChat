import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

/**
 * 测试全局初始化：删除旧的 test.db，并按 migrations 重新构建测试数据库。
 * 使用与运行时一致的 prisma migrate deploy，保证 schema 与正式环境一致。
 */
export default function setup() {
  const cwd = process.cwd();
  for (const f of ["test.db", "test.db-journal", "test.db-wal", "test.db-shm"]) {
    const p = join(cwd, f);
    if (existsSync(p)) rmSync(p);
  }

  execSync("pnpm prisma migrate deploy", {
    cwd,
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
