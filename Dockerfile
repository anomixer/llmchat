FROM node:22-slim AS builder
LABEL "language"="nodejs"
LABEL "framework"="react"

WORKDIR /app

COPY package.json ./
RUN npm install --include=dev

COPY . .

RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080
# 讓 Express 直接 serve 前端靜態檔（不需要 vite preview）
ENV SERVE_STATIC=true

CMD ["npx", "tsx", "server/src/start.ts"]
