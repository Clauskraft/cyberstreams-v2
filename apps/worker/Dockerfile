FROM node:20-alpine

WORKDIR /app

COPY apps/worker/package*.json ./
RUN npm install --omit=dev

COPY apps/worker/worker.js ./worker.js
COPY apps/worker/opensearch-client.js ./opensearch-client.js
COPY apps/worker/src ./src
COPY lib ./lib
COPY data ./data

CMD ["node", "worker.js"]

