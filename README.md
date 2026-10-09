# DeepSeek Chat（本地自用）

一个**单用户、本地运行**的 DeepSeek 聊天工具 MVP。基于 Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui 风格组件 + Prisma + SQLite + Zustand + Zod。

数据全部保存在本地 SQLite，不需要登录、不需要公网部署、不需要 Docker 也能完整运行。DeepSeek API Key 只保存在服务端，绝不暴露到前端。

---

## 功能

- 多轮对话：新建会话、流式回复、停止生成、重新生成、编辑历史消息后重发（截断后续）
- 历史记录：会话持久化、列表、切换、重命名、删除、按标题/内容搜索、导出 JSON / Markdown
- 提示词模板：CRUD、标签筛选、搜索、`{{变量}}` 占位符替换、从 assistant 消息保存为模板、插入输入框
- 前端：Markdown 渲染、代码高亮、复制消息、暗色模式、移动端抽屉侧栏、Enter 发送 / Shift+Enter 换行
- 模型：`deepseek-chat` / `deepseek-reasoner`（推理过程可折叠显示，不与正文混在一起）
- Mock 模式：没有 API Key 也能用本地模拟流式输出跑通全流程
- 上下文策略：保留 system prompt、优先最近 20 条、超预算从旧到新截断、至少保留最近一条 user 消息

---

## 环境要求

- **Node.js 20.19+ / 22.12+ / 24.0+**（推荐 LTS；本项目在 Node 26 上构建/测试通过）
- **pnpm** 8+（或 npm，命令对应替换）
- **Git**（可选，用于版本管理）

### 安装 Node / pnpm / Git（Windows PowerShell）

```powershell
# Node.js LTS
winget install OpenJS.NodeJS.LTS

# pnpm（Node 22+ 已内置 corepack）
corepack enable
corepack prepare pnpm@latest --activate
# 若上面失败：
npm install -g pnpm

# Git
winget install --id Git.Git -e --source winget
```

---

## 快速开始

```powershell
# 1. 安装依赖（会自动生成 Prisma Client）
pnpm install

# 2. 初始化数据库（生成 dev.db）
pnpm db:migrate

# 3. 启动开发服务器
pnpm dev
```

浏览器访问 **http://localhost:3000**。

> 首次启动时若没有配置 API Key，请保持 `MOCK_LLM=true`（默认），即可用本地模拟回复跑通全部功能。

---

## 配置 DeepSeek API Key

1. 前往 [DeepSeek 开放平台](https://platform.deepseek.com) 注册并登录。
2. 进入 **API Keys** 页面，创建一个 API Key。
3. 复制 `.env.example` 为 `.env.local`：

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. 编辑 `.env.local`，填入真实 Key：

   ```dotenv
   DEEPSEEK_API_KEY=sk-你的真实key
   DEEPSEEK_BASE_URL=https://api.deepseek.com
   DEEPSEEK_MODEL=deepseek-chat
   DATABASE_URL=file:./dev.db
   MOCK_LLM=false
   ```

5. 重启 `pnpm dev`。

> ⚠️ 安全提示：`.env.local` 已加入 `.gitignore`，**不要把真实 Key 写进代码、README、截图或提交到 git**。Key 只出现在服务端环境变量中。

### 切换 deepseek-chat 与 deepseek-reasoner

- 在界面的「设置」里切换模型；或在 `.env.local` 中设置 `DEEPSEEK_MODEL`。
- `deepseek-reasoner` 的流式返回会额外带 `reasoning_content`，界面会以「推理过程」折叠显示，不会混入正文。

---

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（Turbopack） |
| `pnpm build` | 生产构建 |
| `pnpm start` | 运行生产服务器（需先 `build`） |
| `pnpm lint` | ESLint 检查 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | 运行单元 + 集成测试 |
| `pnpm db:migrate` | 应用数据库迁移（`prisma migrate dev`） |
| `pnpm db:push` | 直接同步 schema 到数据库 |
| `pnpm db:studio` | 打开 Prisma Studio 查看数据 |
| `pnpm db:generate` | 重新生成 Prisma Client |

---

## 测试

```powershell
pnpm test
```

测试覆盖：

- **单元测试**：上下文截断、模板变量提取/替换、Zod 校验
- **集成测试**：会话 CRUD、模板 CRUD、聊天流式接口（使用 Mock LLM，无需真实 Key）

测试使用独立的 `test.db`（自动重建，不会污染 `dev.db`）。

---

## 目录结构

```text
app/
  page.tsx                  # 聊天主界面
  api/
    chat/route.ts           # 流式聊天（NDJSON）
    conversations/route.ts  # 会话列表/新建
    conversations/[id]/route.ts
    prompts/route.ts        # 模板列表/新建
    prompts/[id]/route.ts
    health/route.ts         # 健康检查
components/
  chat/                     # Sidebar / MessageList / MessageItem / Composer / 模板 / 设置 / Toaster
  ui/                       # button / input / textarea / dialog / dropdown-menu / badge
lib/
  db.ts                     # Prisma 单例
  deepseek.ts               # DeepSeek 调用（OpenAI 兼容）+ Mock
  context.ts                # 上下文组装/截断
  validators.ts             # Zod 校验
  store.ts                  # Zustand 状态
  utils.ts / types.ts / api.ts / toast.ts
prisma/
  schema.prisma             # 数据模型
  migrations/
tests/                      # 单元 + 集成测试
```

---

## 技术说明

- **数据库**：Prisma 7 + SQLite，通过 `@prisma/adapter-better-sqlite3` 驱动适配器连接；`DATABASE_URL` 在 `prisma7.config.ts` 中配置。
- **流式输出**：`/api/chat` 返回 `application/x-ndjson`，每行一个 JSON 事件：`meta` / `delta` / `reasoning_delta` / `done` / `error`。
- **上下文策略**：见 `lib/context.ts`，默认保留最近 20 条、预算 8192 token、至少保留最近一条 user 消息。
- **XSS 防护**：Markdown 用 `react-markdown`（默认转义原始 HTML，不启用 `rehype-raw`）。

---

## 已知问题与排查

### `pnpm dev` 报错：`spawning node pooled process / os error 5`（Windows）

这是 **Turbopack 开发模式的 worker 进程派生被系统拒绝**导致的环境问题（本机 Node 以裸文件 `D:\node.exe` 形式安装时更容易触发），**不是项目代码问题**——`pnpm build`、`pnpm test`、`pnpm start` 均正常。可尝试：

1. **改用生产模式**（已验证可用）：
   ```powershell
   pnpm build
   pnpm start
   ```
2. 用 winget 安装**标准 Node.js LTS**（22/24），替换裸 `node.exe`：
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
3. 将项目目录加入 **Windows Defender / 杀毒软件排除列表**。
4. 开启 **Windows 开发者模式**（设置 → 系统 → 开发者选项）。
5. 尝试 `pnpm next dev --webpack` 回退（部分环境可用）。

### 端口被占用

```powershell
# 查看占用 3000 的进程
netstat -ano | findstr :3000
# 关闭对应 PID
taskkill /PID <pid> /F
```

或在 `package.json` 的 `dev` 脚本里加 `-p 3001` 换端口。

---

## 已知限制与下一步建议

- 标题由首条用户消息截断生成（未调用 LLM 生成标题）。
- 没有流式 token 精确计数（使用启发式估算），未做文件上传、语音、插件系统。
- 单用户本地场景，无鉴权与并发多用户隔离。
- 下一步可加：标题智能生成、会话导出为 PDF、`CONTEXT_MAX_TOKENS` 可配置化、E2E 测试（Playwright）。

---

## 许可证

仅供个人学习与本地使用。
