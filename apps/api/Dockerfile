FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN node ./node_modules/.bin/prisma generate --schema apps/api/prisma/schema.prisma \
  && npm run build --workspace @hp/shared \
  && npm run build --workspace @hp/api

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Prisma's query engine links against OpenSSL/libgcc at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Production-only install (runtime deploy tooling prisma/tsx are runtime deps).
# The Prisma schema ships from the build stage so the client can be generated
# from the pruned dependency tree below.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
RUN npm ci --omit=dev --workspace @hp/api --workspace @hp/shared \
  && node ./node_modules/.bin/prisma generate --schema apps/api/prisma/schema.prisma \
  && npm cache clean --force

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/src ./apps/api/src
COPY --from=build /app/apps/api/seed-assets ./apps/api/seed-assets
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY scripts/docker-entrypoint-api.sh /usr/local/bin/hp-entrypoint

# Named volumes initialize from this directory's ownership, so pre-create the
# uploads mount point and grant it to the non-root runtime user.
RUN mkdir -p /app/apps/api/uploads \
  && useradd --create-home --uid 9200 appuser \
  && chown -R appuser:appuser /app \
  && chmod +x /usr/local/bin/hp-entrypoint

USER appuser
EXPOSE 4000
ENTRYPOINT ["hp-entrypoint"]
CMD ["node", "apps/api/dist/apps/api/src/server.js"]