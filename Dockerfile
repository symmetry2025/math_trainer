FROM node:20-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm -s install --frozen-lockfile
RUN pnpm -s -C packages/shared build
RUN pnpm -s exec prisma generate
RUN pnpm -s exec next build


FROM node:20-bookworm-slim AS runner

ENV NODE_ENV="production"
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY --from=build /app /app
RUN chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["bash", "scripts/docker-entrypoint.sh"]

