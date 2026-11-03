FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS build

WORKDIR /app
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
COPY package.json package-lock.json tsconfig.base.json ./
# npm ci resolves every workspace named by the root manifest. Include the API
# manifest even though the web bundle doesn't compile API sources.
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY scripts/validate-site-url.mjs scripts/validate-site-url.mjs
RUN npm ci

COPY apps/web apps/web
COPY packages/shared packages/shared
COPY scripts/check-web-budget.mjs scripts/check-web-budget.mjs
RUN node scripts/validate-site-url.mjs "$VITE_SITE_URL" \
  && npm run build --workspace @hp/shared \
  && npm run build --workspace @hp/web

FROM nginx:1.30.6-alpine3.24@sha256:0e52bd054126cdc040b1276c0af347aeb02a41b9cfe305d6094767ac30e97949
COPY apps/web/nginx-main.conf /etc/nginx/nginx.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
RUN mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
  && chown -R 101:101 /tmp/nginx
USER 101:101
EXPOSE 8080
CMD ["sh", "-c", "mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy && exec nginx -g 'daemon off;'"]
