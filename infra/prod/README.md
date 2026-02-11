## Прод-деплой на VPS (Docker)

### Что поднимаем
- **PostgreSQL**: контейнер `db` + volume `db_data`
- **Next.js app**: контейнер `app` (с `prisma migrate deploy` при старте)

### Важно про build context
Этот проект зависит от локального пакета `@smmtry/shared` через `file:../../../symmetry-account/...`.
Поэтому `docker build` делается с контекстом **`projects/`**, чтобы в контексте были и `symmetry-trainer`, и `symmetry-account`.
Это уже учтено в `infra/prod/docker-compose.yml`.

### Настройка окружения
На VPS в папке `symmetry-trainer/trainer-wt/_main`:

- Скопируй пример конфига:
  - `cp env.prod.example .env`
- Отредактируй `.env` (не коммить).

### Запуск
Из папки `symmetry-trainer/trainer-wt/_main`:

```bash
docker compose -f infra/prod/docker-compose.yml up -d --build
```

### Проверка
- **health**: `curl -fsS http://localhost:3015/api/health`
- **логи**:
  - `docker compose -f infra/prod/docker-compose.yml logs -f app`
  - `docker compose -f infra/prod/docker-compose.yml logs -f db`

