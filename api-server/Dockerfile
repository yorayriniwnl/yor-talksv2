FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @workspace/api-server build
# The API only needs read access to its bundled dependencies at runtime. Drop
# root before the image is used by either the API or the migration service;
# image files are world-readable and no runtime writes are required.
USER node
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
