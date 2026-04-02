FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/mcp-server/package.json packages/mcp-server/

RUN corepack enable && pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/mcp-server/ packages/mcp-server/

RUN pnpm --filter @seshat/shared build && pnpm --filter @seshat/mcp-server build

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/packages/mcp-server/dist ./dist
COPY --from=builder /app/packages/shared/dist ./shared-dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/mcp-server/package.json ./

EXPOSE 3001
CMD ["node", "dist/index.js"]
