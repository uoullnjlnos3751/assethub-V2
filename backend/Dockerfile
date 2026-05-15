# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY prisma ./prisma/
RUN npx prisma generate
COPY src ./src/
COPY tsconfig.json ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/dist ./dist/

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
