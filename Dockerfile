FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache su-exec

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

RUN chmod +x /app/infra/local/backend-entrypoint.sh

ENTRYPOINT ["/app/infra/local/backend-entrypoint.sh"]

# prisma generate only reads the schema, but prisma.config.ts requires
# DATABASE_URL to be set just to load — no real connection is made here.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN npx prisma generate

RUN npm run build

FROM build AS migration

ENV NODE_ENV=production

ENTRYPOINT []

CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM build AS production-dependencies

RUN npm prune --omit=dev

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/dist ./dist

EXPOSE 3000

USER node

CMD ["node", "dist/src/main.js"]
