FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/index.html ./apps/web/
COPY packages ./packages
COPY apps/web/tsconfig.json ./apps/web/
COPY tsconfig.base.json ./tsconfig.base.json
COPY apps/web/vite.config.ts ./apps/web/

WORKDIR /app/apps/web
RUN npm install

WORKDIR /app

COPY apps/web/src ./apps/web/src
COPY apps/web/public ./apps/web/public
COPY apps/web/server.js ./apps/web/server.js

WORKDIR /app/apps/web
RUN npm run build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY packages ./packages

WORKDIR /app/apps/web
RUN npm install --omit=dev

WORKDIR /app

COPY --from=builder /app/apps/web/dist ./dist
COPY apps/web/server.js ./server.js

EXPOSE 5173

CMD ["node", "server.js"]

