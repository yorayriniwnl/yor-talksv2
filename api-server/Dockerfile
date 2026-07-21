FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @workspace/api-server build
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
