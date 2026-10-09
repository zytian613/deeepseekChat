# 可选：Docker 镜像（本地自用，未在本机验证 —— 本机未安装 Docker）
# 构建：docker build -t deepseek-chat .
# 运行：docker compose up -d

FROM node:22-slim

WORKDIR /app

# 启用 pnpm
RUN corepack enable

# 先复制依赖清单，利用缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN pnpm install --frozen-lockfile

# 复制源码并生成 Prisma Client + 构建
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate && pnpm build

EXPOSE 3000

# 启动前应用迁移，然后运行生产服务器
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
