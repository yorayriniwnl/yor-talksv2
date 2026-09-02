FROM node:24-alpine
WORKDIR /app
ENV COREPACK_HOME=/usr/local/share/corepack
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN mkdir -p "$COREPACK_HOME" \
    && corepack enable \
    && corepack install --global pnpm@9.15.4 \
    && chmod -R a+rX "$COREPACK_HOME" \
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
