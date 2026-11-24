# syntax=docker/dockerfile:1
# 使用 Docker Hub 官方 Node 22 slim 基础镜像，避免镜像代理的对象存储下载中断。
FROM node:22-bookworm-slim AS base
FROM base AS deps
WORKDIR /app
RUN apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && apt-get install -y --no-install-recommends ca-certificates openssl -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && rm -rf /var/lib/apt/lists/*
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=edu-manage-npm,target=/root/.npm,sharing=locked \
  npm config set registry "${NPM_REGISTRY}" \
  && npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000

FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
  NODE_OPTIONS=--max-old-space-size=3072 --stack-size=4000 \
  NEXT_BUILD_WORKERS=1 \
  DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder \
  DATABASE_URL_JUNIOR=postgresql://placeholder:placeholder@127.0.0.1:5432/junior \
  DATABASE_URL_SENIOR=postgresql://placeholder:placeholder@127.0.0.1:5432/senior
COPY . .
RUN npx prisma generate
RUN --mount=type=cache,id=edu-manage-next,target=/app/.next/cache,sharing=locked npm run build

FROM base AS migrator
WORKDIR /app
RUN apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && apt-get install -y --no-install-recommends ca-certificates openssl postgresql-client -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/migrate-all.sh ./scripts/migrate-all.sh
ENV NODE_ENV=production \
  SKIP_PRISMA_GENERATE=1
CMD ["bash", "scripts/migrate-all.sh"]

FROM base AS runner
WORKDIR /app
RUN apt-get update -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && apt-get install -y --no-install-recommends ca-certificates jq openssl postgresql-client python3 python3-pip -o Acquire::Retries=3 -o Acquire::http::Timeout=30 \
  && pip3 install --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple pymupdf==1.24.10 \
  && rm -rf /var/lib/apt/lists/*
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000 \
  NODE_OPTIONS=--max-old-space-size=640
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/backup-now.sh ./scripts/backup-now.sh
COPY --from=builder --chown=node:node /app/scripts/backup-db.sh ./scripts/backup-db.sh
COPY --from=builder --chown=node:node /app/scripts/backup-uploads.sh ./scripts/backup-uploads.sh
COPY --from=builder --chown=node:node /app/scripts/compress-pdf.py ./scripts/compress-pdf.py
# ali-oss / mammoth 在代码中为运行时动态 require/import，Next standalone 打包不会自动收录，
# 需在 runner 镜像内补齐（版本与 package.json 保持一致）。standalone 内无 package-lock.json，
# 需先从 deps 复制，否则 npm arborist 无法解析依赖树。
# 必须用增量 npm install（而非 npm ci 重装）：npm ci 会清空并重装 node_modules，
# 破坏 standalone traced 产物中的 @prisma/client generate 文件，导致 middleware 启动即崩。
# esbuild/wrangler 冲突已由 package.json overrides（wrangler=4.152.0，esbuild 0.28 线）根治。
COPY --from=deps --chown=node:node /app/package.json /app/package-lock.json ./
RUN --mount=type=cache,id=edu-manage-npm,target=/root/.npm,sharing=locked \
  npm config set registry "${NPM_REGISTRY}" \
  && unset NODE_OPTIONS && npm install --omit=dev --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=10000 --fetch-retry-maxtimeout=120000 ali-oss@^6.23.0 mammoth@^1.12.0
# The standalone trace can contain an older generated client when the builder
# reused dependency layers. Always ship the Prisma client generated from this
# build's prisma/schema.prisma into the runtime image.
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
