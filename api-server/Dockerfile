FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
ENV COREPACK_HOME=/usr/local/share/corepack
RUN mkdir -p "$COREPACK_HOME" && corepack enable && corepack install --global pnpm@9.15.4 && pnpm fetch && chmod -R a+rX "$COREPACK_HOME"
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @workspace/api-server build
# The API only needs read access to its bundled dependencies at runtime. Drop
# root before the image is used by either the API or the migration service;
# image files are world-readable and no runtime writes are required.
USER node
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
