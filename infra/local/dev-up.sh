#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ ! -f ".env" ]]; then
  echo "ERROR: .env not found. Create it first:" >&2
  echo "  cp env.example .env" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker не найден. Установи Docker Engine/CLI." >&2
  exit 2
fi

docker compose -f infra/local/docker-compose.yml up -d

# Apply existing migrations (non-interactive)
pnpm exec prisma migrate deploy

PORT="${PORT:-3015}"
exec pnpm exec next dev -p "$PORT"

