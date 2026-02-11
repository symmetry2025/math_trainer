## math-trainer.ru (VPS) — staging/prod

### Два окружения
- **staging**: `staging.math-trainer.ru` → image tag `staging` (обновляется по merge в `main`)
- **prod**: `math-trainer.ru` → image tag `vX.Y.Z` (обновляется по git tag)

### GHCR image
Workflow пушит образ в:
`ghcr.io/symmetry2025/math_trainer/trainer-standalone`

### Подготовка VPS (один раз)
1) Создать директории:
```bash
sudo mkdir -p /opt/math_trainer/staging /opt/math_trainer/prod
sudo chown -R "$USER":"$USER" /opt/math_trainer
```

2) Положить compose файлы:
```bash
cp infra/vps/staging/compose.yml /opt/math_trainer/staging/compose.yml
cp infra/vps/prod/compose.yml /opt/math_trainer/prod/compose.yml
```

3) Создать `.env` для каждого окружения (НЕ коммитить):
```bash
cp infra/vps/staging.env.example /opt/math_trainer/staging/.env
cp infra/vps/prod.env.example /opt/math_trainer/prod/.env
```
Отредактировать пароли и `DATABASE_URL`.

4) Логин в GHCR на VPS (если репозиторий приватный):
```bash
docker login ghcr.io
```
Нужен токен с `read:packages`.

5) nginx (80/443) проксирует на локальные порты:
- staging → `127.0.0.1:14015`
- prod → `127.0.0.1:24015`

Шаблон конфига: `infra/vps/nginx.mathtrain.conf` (включает `math-trainer.ru`)

### Первый запуск (вручную)
```bash
cd /opt/math_trainer/staging && docker compose -f compose.yml pull && docker compose -f compose.yml up -d
cd /opt/math_trainer/prod && docker compose -f compose.yml pull && docker compose -f compose.yml up -d
```

### Проверка
```bash
curl -fsS http://127.0.0.1:14015/api/health
curl -fsS http://127.0.0.1:24015/api/health
```

