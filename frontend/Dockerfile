FROM node:22.13.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
FROM node:22.13.1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
FROM node:22.13.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN addgroup --system --gid 10001 appgroup && adduser --system --uid 10001 -G appgroup appuser && chown -R appuser:appgroup /app
USER 10001:10001
CMD ["sh", "-c", "exec node server.js"]
