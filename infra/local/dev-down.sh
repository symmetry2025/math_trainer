#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker не найден. Установи Docker Engine/CLI." >&2
  exit 2
fi

docker compose -f infra/local/docker-compose.yml down

