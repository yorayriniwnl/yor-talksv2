FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server build
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
