FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api-server/package.json api-server/package.json
COPY mockup-sandbox/package.json mockup-sandbox/package.json
COPY scripts/package.json scripts/package.json
COPY social/package.json social/package.json
COPY lib/api-client-react/package.json lib/api-client-react/package.json
COPY lib/api-spec/package.json lib/api-spec/package.json
COPY lib/api-zod/package.json lib/api-zod/package.json
COPY lib/db/package.json lib/db/package.json
COPY lib/shared/package.json lib/shared/package.json
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_API_BASE_URL=/api
ARG VITE_REALTIME_URL=
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_RTC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"}]
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_REALTIME_URL=$VITE_REALTIME_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_RTC_ICE_SERVERS=$VITE_RTC_ICE_SERVERS
RUN pnpm --filter @workspace/social build

FROM nginx:1.27-alpine

COPY --from=build /app/social/dist/public /usr/share/nginx/html
COPY social/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
