# MAX mini‑приложение — MVP (тренажёры + биллинг)

Этот документ фиксирует минимальный срез работ, чтобы запустить МатТренер как мини‑приложение в мессенджере MAX.

Основа документации MAX:
- Подключение мини‑приложения и диплинки: `https://dev.max.ru/docs/webapps/introduction`
- Bridge (`window.WebApp`, openLink/share/back button): `https://dev.max.ru/docs/webapps/bridge`
- Валидация initData (HMAC): `https://dev.max.ru/docs/webapps/validation`

## Цели MVP
- Пользователь открывает мини‑приложение из MAX и попадает в МатТренер **без ввода пароля**.
- Если у пользователя нет доступа по биллингу — он попадает на `/billing` и может оформить подписку (вариант A: **оплата внутри mini‑app**).
- Если доступ есть — он попадает в тренажёры (например, `/class-2/addition`).

## Нефункциональные требования (важные)
- **Никаких секретов в репозитории**. Токены/ключи только в env/secret storage.
- FE ↔ BE на одном домене; API только через `/api/*`; на фронте `credentials: 'include'`.
- Источник правды по правам — server‑side проверки.

## Архитектура (схема)
```mermaid
flowchart TD
  MaxClient[MAX_Client] --> MaxWebApp[/GET_/max]
  MaxWebApp --> Bridge[Load_MAX_Bridge_window.WebApp]
  Bridge --> InitData[Read_initData_and_start_param]
  InitData --> AuthMax[POST_/api/auth/max_(initData)]
  AuthMax --> Validate[Validate_initData_HMAC]
  Validate --> Upsert[FindOrCreate_User_by_maxUserId]
  Upsert --> Session[Create_Session_cookie]
  Session --> Decide[Compute_billing_access]
  Decide -->|no_access| Billing[/redirect_/billing]
  Decide -->|has_access| Trainers[/redirect_/class-2/addition]
  Billing --> CP[CloudPayments_Widget]
  CP --> Webhooks[/api/webhooks/cloudpayments/*]
  Webhooks --> BillingStatus[/api/billing/status]
```

## Минимальный срез работ (по шагам)

### Шаг 0 — Smoke‑check биллинга в webview MAX (вариант A)
Цель: подтвердить, что CloudPayments‑виджет и 3DS работают внутри webview MAX.
- Открыть `/billing` в MAX после авторизации.
- Провести тестовую оплату (test mode), убедиться, что:
  - виджет открылся
  - 3DS прошёл
  - вебхуки пришли
  - `/api/billing/status` показывает `billingStatus=active`.

### Шаг 1 — Привязка пользователя MAX в БД
- Добавить в Prisma поле `maxUserId` (строка) с `@unique` (или отдельную таблицу связей).
- Хранить `maxUserId` как строку, т.к. MAX user.id — int64.

### Шаг 2 — Backend: `/api/auth/max`
Endpoint `POST /api/auth/max`:
- Принимает `initData` (строка) и опционально `startParam`.
- Валидирует `initData` по алгоритму из MAX docs (HMAC) с `MAX_BOT_TOKEN`.
- Проверяет свежесть `auth_date` (TTL через env).
- Извлекает `user.id` и базовые поля профиля.
- Находит/создаёт пользователя в нашей БД (по `maxUserId`).
- Создаёт `Session` и ставит cookie (как в обычном логине).
- Возвращает `redirectTo`:
  - `/billing`, если `hasBillingAccess(...)` вернул `ok=false`
  - иначе `/class-2/addition` (или другой дефолт).

Примечание про email:
- MAX не гарантирует email. Для схемы, где email обязателен, используем технический email вида `max+<maxUserId>@max.local` (уникальный и валидный).

### Шаг 3 — Frontend: публичная страница `/max`
`/max`:
- Подключает MAX Bridge (`https://st.max.ru/js/max-web-app.js`).
- Вызывает `window.WebApp.ready()`.
- Берёт `window.WebApp.initData` и `window.WebApp.initDataUnsafe.start_param` (если есть).
- Вызывает `POST /api/auth/max` с `credentials: 'include'`.
- Делает redirect на `redirectTo` из ответа.

### Шаг 4 — Middleware и роутинг
- Добавить `/max` в публичные маршруты (не редиректить на `/login`).
- После создания сессии остальная защита остаётся прежней.

## Переменные окружения (без значений)
- `MAX_BOT_TOKEN` — секрет, нужен для валидации initData.
- `MAX_INITDATA_MAX_AGE_SEC` — TTL для `auth_date` (например 86400).

## Критерии готовности MVP
- Открытие mini‑app в MAX создаёт сессию и даёт доступ к тренажёрам/биллингу.
- При отсутствии доступа пользователь попадает на `/billing` и может оплатить внутри webview.
- После вебхука `/api/billing/status` обновляется, и пользователь получает доступ к тренажёрам.

## Чеклист тестирования
- Валидный initData → 200 OK → cookie выставлен → редирект в `/billing` или `/class-2/addition`.
- Невалидный hash → 401/403 (ошибка подписи).
- Просроченный `auth_date` → 401 (expired).
- Биллинг: успешная оплата → webhook → `billingStatus=active` → доступ открыт.

