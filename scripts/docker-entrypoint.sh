#!/usr/bin/env bash
set -euo pipefail

cd /app

echo "[entrypoint] prisma migrate deploy..."
pnpm -s exec prisma migrate deploy

echo "[entrypoint] starting next..."
exec pnpm -s exec next start -H 0.0.0.0 -p "${PORT:-3000}"

