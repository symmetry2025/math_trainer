# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@10.30.0 --activate

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

WORKDIR /app

# Copy only files needed to resolve dependencies (better cache hit rate).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/package.json

# Reuse pnpm store across builds (BuildKit cache).
#
# IMPORTANT: ignore scripts here to avoid running root postinstall (it builds shared),
# because we intentionally don't copy full sources into this layer.
RUN --mount=type=cache,target=/pnpm/store pnpm -s install --frozen-lockfile --ignore-scripts

FROM base AS build

WORKDIR /app

# Reuse dependencies layer.
COPY --from=deps /app /app

# Copy application sources (invalidates only build layers).
COPY . .

RUN pnpm -s install --frozen-lockfile
RUN pnpm -s -C packages/shared build
RUN pnpm -s exec prisma generate
RUN pnpm -s exec next build


FROM node:20-bookworm-slim AS runner

ENV NODE_ENV="production"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable && corepack prepare pnpm@10.30.0 --activate

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app
RUN chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["bash", "scripts/docker-entrypoint.sh"]

