# Достижения + статистика (пост‑сессионный экран, бар на списках, реальные данные)

Дата: 2026-02-09  
Контекст: `projects/symmetry-trainer/trainer-wt/_main`

## 0) Цели (что хотим получить)

### 0.1 Post‑session Achievements Screen (после прохождения тренажёра)
После окончания сессии показываем **тот же “каноничный” экран**, что и result, но с дополнительным шагом:

1) Если были получены достижения (включая “открылся новый уровень”) — показываем модалку/карточку “Достижение”  
2) Если достижений несколько — показываем **по одному**, кнопка **“Хорошо”** переключает к следующему  
3) После последнего достижения по нажатию “Хорошо” внутри той же модалки показываем **итоговую статистику** (как сейчас result) и кнопки перехода

Требования к UX:
- Кнопки:  
  - **Хорошо**: следующий achievement → затем статистика/result  
  - **Мои достижения**: редирект на `/progress/achievements`
- Анимации карточек как у примеров:  
  - текущая карточка: **slide вверх + fadeout**  
  - следующая: **slide снизу + fadein**

### 0.2 “Живой” бар статистики на страницах списков тренажёров
Верхний бар на страницах `/addition`, `/multiplication`, `/division` должен показывать:
- **Кристаллы**: заработано / всего (cap)
- **Звёзды**: заработано / всего

Конвенция звёзд:
- за каждый тренажёр максимум **3⭐** (Новичок/Знаток/Мастер)
- заработано = `raceStars` (0..3) по этому тренажёру

### 0.3 Реальная система достижений и статистики
Страницы:
- `/progress/achievements`
- `/progress/stats`

должны показывать реальные данные пользователя (а не мок).

## 1) Текущее состояние (важно для плана)

### 1.1 Что уже есть в БД
В Prisma уже есть:
- `TrainerProgress` — агрегированный прогресс по `trainerId`
- `TrainerAttempt` — **immutable** лог попыток (JSON `result`)  
  Это ключевой источник для статистики и достижений.

### 1.2 Что сейчас моковое
- `src/screens/progress/AchievementsScreen.tsx` — статический массив достижений
- `src/screens/progress/StatsScreen.tsx` — моковые графики/цифры
- `src/screens/progress/ChallengeScreen.tsx` — мок

### 1.3 Что уже умеем на клиенте
- Кристаллы считаются из local progress (`src/lib/crystals.ts`)
- Прогресс гидратируется на страницах списков через `TopicSection` (`hydrateProgressFromDb`)

## 2) Архитектура достижений (минимально‑инвазивно и масштабируемо)

### 2.1 Definitions (список достижений)
Достижения задаём как **статический каталог** (код), например:
- `first-10-problems` — решить 10 примеров суммарно
- `perfect-session` — сессия без ошибок (mistakes=0) при total >= N
- `first-race-win` — первая победа в гонке
- `unlock-master` — открыть “Мастер” в любом тренажёре

Каталог хранит:
- id, title, description
- iconKey (строка, чтобы не тащить React.ElementType через API)
- тип прогресса (counter/boolean/custom)
- правила инкремента по попытке

### 2.2 UserAchievement (персистентный прогресс по достижениям)
Добавляем таблицу:
- `UserAchievement { userId, achievementId, progressJson, unlockedAt, createdAt, updatedAt }`

Плюсы:
- не нужно пересчитывать всё по истории попыток
- масштабируется на тысячи пользователей

### 2.3 Где вычислять/обновлять достижения
На каждом `POST /api/progress/record`:
- попытка уже логируется в `TrainerAttempt`
- после обновления `TrainerProgress` вызываем “achievement evaluator”:
  - обновляет `UserAchievement`
  - возвращает **список newlyUnlocked** (0..N)

Важно: evaluator должен быть **O(кол‑во достижений)** и **не сканировать историю**.
Для этого вводим минимальные агрегаты (см. 2.4).

### 2.4 UserStats (минимальные агрегаты для дешёвых достижений)
Чтобы “реши 10 примеров суммарно” и прочее не считалось через COUNT по попыткам:

Добавляем таблицу:
- `UserStats { userId, totalProblems, totalCorrect, totalMistakes, totalTimeSec, sessionsCount, perfectSessionsCount, raceWinsCount, updatedAt }`

Обновляем её в `/api/progress/record` на основании тела попытки.

## 3) Post‑session UI (как встроить в TrainerFlow)

### 3.1 Новая сущность: PostSessionEvent
Унифицируем “что показывать после сессии”:
- `type: 'unlockedLevel' | 'achievement'`
- `title`, `description`, `iconKey`

Источники:
- “Открылся новый уровень” (detected client-side или лучше server-side)
- “Newly unlocked achievements” (ответ сервера на record)

### 3.2 Как рендерить
Добавляем компонент (например) `TrainerPostSessionModal`:
- если `events.length > 0` — показываем “achievement card”
- кнопка **Хорошо**:
  - если есть следующий event → анимировано меняем карточку
  - если событий больше нет → показываем внутри модалки “stats/result card” (тот же `TrainerResultScreen` или его содержимое)

### 3.3 Анимации
Добавляем в `globals.css` два keyframes:
- `modal-card-in`: translateY(+16..24px) + fade in
- `modal-card-out`: translateY(-16..24px) + fade out
и utility-классы с `animation-fill-mode: both`.

## 4) Бар статистики на страницах списков

### 4.1 Кристаллы
- earned: сумма `getCrystalsForExercise(exercise.id)` по упражнениям страницы
- total: сумма `getCrystalsCapForExercise(exercise.id)` по упражнениям страницы

### 4.2 Звёзды
- earned: `raceStars` из `getExerciseProgressStatus(exercise.id)` (0..3) суммируем
- total: **3 * count(wiredExercises)**, где wired = `getCrystalsCapForExercise(id) > 0` (или явный флаг в каталоге)

### 4.3 UI
Вместо процента “Общий прогресс” показываем 2 строки:
- `♦  earned/total`
- `⭐  earned/total`
и две полосы (или одна комбинированная — обсуждаемо).

## 5) Реальные страницы /progress/*

### 5.1 API
Нужно 2 чтения:
- `GET /api/stats/summary` → агрегаты из `UserStats` (и/или derived)
- `GET /api/achievements` → каталог достижений + user state (progress/unlocked)

DTO строго через `@smmtry/shared`:
- `StatsSummaryDto`
- `AchievementDto`, `UserAchievementStateDto`

### 5.2 FE
Переписать:
- `AchievementsScreen` → fetch `/api/achievements`
- `StatsScreen` → fetch `/api/stats/summary` (+ позднее детализация/неделя)

## 6) Backlog (issue‑style)

Ниже — задачи, которые можно переносить в трекер 1:1.

### ACH-001 — Модели и миграции для достижений/статистики
**Цель**: добавить `UserAchievement` и `UserStats`.

- Scope:
  - Prisma schema: новые модели + индексы (`@@unique([userId, achievementId])`)
  - миграция
- Acceptance:
  - можно сохранить/прочитать агрегаты по пользователю за O(1)

### ACH-002 — Каталог достижений (definitions) + evaluator
**Цель**: единый список достижений и инкрементальные правила.

- Scope:
  - `achievementCatalog.ts` (id/title/desc/iconKey/rules)
  - evaluator: `evaluateAchievements({ attempt, prevStats, prevAchievements }) -> { nextStats, newlyUnlocked[] }`
- Acceptance:
  - evaluator не сканирует историю
  - deterministic, idempotent при повторном `attemptId` (не выдаёт дубль newlyUnlocked)

### ACH-003 — Расширить `/api/progress/record`: обновление stats + выдача newlyUnlocked
**Цель**: после записи попытки возвращать newlyUnlocked достижения (и опционально unlockedLevel).

- Depends on: ACH-001, ACH-002
- Scope:
  - после upsert прогресса обновить `UserStats`
  - обновить `UserAchievement`
  - вернуть `{ trainerId, progress, newlyUnlockedAchievements: [...] }`
  - обновить DTO в `@smmtry/shared`
- Acceptance:
  - нагрузка O(1) на запрос
  - no duplicate unlocks при повторе same `(userId, trainerId, attemptId)`

### ACH-004 — Post‑session achievements UI в `TrainerFlow`
**Цель**: показывать achievements‑модалку перед result.

- Depends on: ACH-003 (или временно client-only unlockLevel)
- Scope:
  - `TrainerFlow` хранит `postSessionEvents[]`
  - `TrainerPostSessionModal` с “Хорошо / Мои достижения”
  - анимации slide-up/fadeout + slide-in-from-bottom/fadein
- Acceptance:
  - если событий нет → сразу обычный result
  - если событий несколько → показываются по одному
  - после последнего → статистика/result в той же модалке

### ACH-005 — Реальная страница “Мои достижения”
**Цель**: заменить моковый массив.

- Depends on: ACH-001..003
- Scope:
  - `GET /api/achievements`
  - FE: рендер каталога + user progress
- Acceptance:
  - данные реальные, консистентны с post-session unlock

### STS-001 — Бар кристаллов/звёзд на страницах списков
**Цель**: оживить верхний бар на `/addition|/multiplication|/division`.

- Scope:
  - вычисление earned/total кристаллов и звёзд на клиенте
  - UI как “♦ earned/total” + “⭐ earned/total”
- Acceptance:
  - без SSR hydration mismatch (используем уже существующую защиту в `useCrystals`)

### STS-002 — Реальная страница “Статистика”
**Цель**: заменить моковые цифры.

- Depends on: ACH-001 (UserStats)
- Scope:
  - `GET /api/stats/summary`
  - FE: заменить заглушки на реальные значения
- Acceptance:
  - цифры коррелируют с `TrainerAttempt`/`UserStats`

### STS-003 — Weekly/подробная статистика (опционально, позже)
**Цель**: графики по дням, по типам тренажёров, по множителям.

- Depends on: STS-002
- Scope:
  - endpoint с агрегациями по дням (SQL group by date)
  - кеширование/лимиты

## 7) Порядок внедрения (рекомендуемый)

1) STS-001 (бар на списках) — быстрый UX win, без БД
2) ACH-001..003 (модели + evaluator + record ответ)
3) ACH-004 (post-session UI)
4) ACH-005 + STS-002 (реальные страницы)
5) STS-003 (графики)

