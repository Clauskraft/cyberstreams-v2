# Dockerfile for Agent Ops Fastify Server (Minimal & Sikker)

# STAGE 1: BUILD (Installerer dependencies)
FROM node:20-alpine AS build

WORKDIR /app

# Kopierer manifestfiler og installerer dependencies
COPY package.json package-lock.json ./
COPY packages/agent-ops/package.json packages/agent-ops/package-lock.json ./packages/agent-ops/

RUN npm ci

COPY . .

# ------------------------------------------------------------------

# STAGE 2: RUNTIME (Minimalt image for deployment)
FROM node:20-slim AS runtime

WORKDIR /app
EXPOSE 8080

COPY --from=build /app /app

# Sikkerhed: Kører som non-root bruger
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# Starter Fastify serveren. start:prod scriptet skal defineres i package.json.
CMD ["npm", "run", "start:prod", "--workspace=packages/agent-ops"]

