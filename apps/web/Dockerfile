FROM node:24-bookworm-slim AS build

WORKDIR /app
ARG VITE_SITE_URL
# Optional cross-origin / contact configuration. Only VITE_SITE_URL is
# validated as required; the rest degrade gracefully when unset (same-origin
# API, no WhatsApp channel).
ARG VITE_API_URL=""
ARG VITE_WHATSAPP=""
ARG VITE_WHATSAPP_MESSAGE=""
ARG VITE_API_PORT=""
ENV VITE_SITE_URL=$VITE_SITE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WHATSAPP=$VITE_WHATSAPP
ENV VITE_WHATSAPP_MESSAGE=$VITE_WHATSAPP_MESSAGE
ENV VITE_API_PORT=$VITE_API_PORT
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
# Empty VITE_API_URL is correct for the Docker/nginx same-origin proxy, but a
# static host (Netlify) has no /api proxy — every API call would hit the SPA
# fallback. Warn loudly without failing local/compose builds; Netlify builds
# must set VITE_API_URL in the site environment instead.
RUN if [ -z "$VITE_API_URL" ]; then echo "[web] WARNING: VITE_API_URL is empty, baking same-origin API calls. Set VITE_API_URL for split (Netlify + Render) deployments."; fi
RUN node scripts/validate-site-url.mjs "$VITE_SITE_URL" \
  && npm run build --workspace @hp/shared \
  && npm run build --workspace @hp/web

FROM nginx:1.27-alpine
COPY apps/web/nginx-main.conf /etc/nginx/nginx.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
RUN mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi \
  && chown -R 101:101 /tmp/nginx
USER 101:101
EXPOSE 8080
CMD ["sh", "-c", "mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy && exec nginx -g 'daemon off;'"]
