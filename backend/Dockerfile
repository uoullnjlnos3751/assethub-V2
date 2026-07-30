# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm config set registry http://registry.npmjs.org/ && npm config set fetch-retries 10 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN for i in 1 2 3 4 5; do npm install --no-audit --no-fund && break || sleep 5; done
COPY prisma ./prisma/
RUN npx prisma generate
COPY src ./src/
COPY tsconfig.json ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY package*.json ./
RUN npm config set registry http://registry.npmjs.org/ && npm config set fetch-retries 10 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000
RUN for i in 1 2 3 4 5; do npm install --only=production --no-audit --no-fund && break || sleep 5; done
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/dist ./dist/

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/api/health || exit 1

RUN mkdir -p /app/uploads/documents

CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
