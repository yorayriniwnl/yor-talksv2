FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/social build

FROM nginx:1.27-alpine

COPY --from=build /app/social/dist/public /usr/share/nginx/html
COPY social/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
