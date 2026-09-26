FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install the pinned CLI as a concrete global binary. A Corepack shim can
# still try to download pnpm when the non-root runtime user starts the
# migration service, which makes an otherwise self-contained image depend on
# registry access at runtime.
RUN npm install --global pnpm@9.15.4 --no-audit --no-fund \
    && pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @workspace/api-server build
# The API only needs read access to its bundled dependencies at runtime. Drop
# root before the image is used by either the API or the migration service;
# image files are world-readable and no runtime writes are required.
USER node
# Fail the image build if the runtime user cannot execute the pinned package
# manager without reaching the network.
RUN pnpm --version
EXPOSE 4000
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
