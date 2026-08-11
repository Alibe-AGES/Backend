FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .

# prisma generate only reads the schema, but prisma.config.ts requires
# DATABASE_URL to be set just to load — no real connection is made here.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN npx prisma generate

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/generated ./generated
COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
