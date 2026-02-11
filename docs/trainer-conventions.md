# Соглашения по тренажёрам (TrainerFlow) — Symmetry Trainer

Цель: чтобы любые новые тренажёры добавлялись **быстро**, имели **одинаковый UX**, и не создавали “зоопарк” путей/нейминга.

Документ описывает **целевую структуру**, а также **минимальные правила**, которым следуем для всего нового кода.

## 1) Термины
- **Exercise (exerciseId)**: идентификатор упражнения в списке (например `add-10`, `house-2-4`, `mul-table-3`).
- **Trainer DB id (trainerId)**: идентификатор для прогресса/аналитики/БД.
  - Для арифметики: `arithmetic:<exerciseId>`
  - Для столбиков: `column-...` (пример: `column-addition`, `column-add-2d-1d-no-carry`)
- **Preset (presetId)**: уровень/режим внутри упражнения (например `accuracy-choice`, `accuracy-input`, `speed`, `race:1`).
- **Session**: экран прохождения (игровой процесс).

## 2) Каноничный пайплайн (обязателен для новых тренажёров)
Новый тренажёр должен подключаться через `TrainerFlow` и следовать шагам:

`entry → select (preset) → session → achievements → result`

Кодовая точка входа: `TrainerDefinition` (см. `src/trainerFlow/types.ts`).

## 3) Структура файлов (целевое состояние)
Мы не делаем массовые переносы “в один коммит”, но для всего нового кода соблюдаем:

```
src/trainers/<family>/
  <something>Definition.tsx   // возвращает TrainerDefinition
  <Something>Session.tsx      // рендерит UI сессии (обычно DrillStage + NumberKeyboard/Options)
  <helpers>.ts                // генераторы/утилиты
```

### Правило нейминга файлов
- Экран прохождения упражнения называем `*Session.tsx` (не `*Game.tsx`).
- Внутри файла default export тоже `*Session` (для удобства поиска).

Где `<family>` — понятная группа:
- `mental-math/` — устный счёт (a ± b = ?)
- `arithmetic-equation/` — уравнения ( ? + b = sum, a − ? = diff, …)
- `drill/` — карточные тренажёры (таблица умножения и т.п.)
- `column/` — столбики
- `visual/` — визуальные “состав/домики/таблицы” (если не вписывается в mental-math)

## 4) Нейминг и идентификаторы
### 4.1 ExerciseId
- ASCII, `kebab-case`
- Для диапазонов: `thing-2-4`, `thing-5-7`, `thing-10`

### 4.2 Trainer DB id
- **Арифметика**: всегда `arithmetic:<exerciseId>`
- **Столбики**: `column-*`

Важно: `trainerId` — это то, что уходит в `/api/progress/record` и сохраняется в БД, поэтому менять его без миграции нельзя.

## 5) Прогресс и сохранение
- Прогресс должен быть **монотонным** (не регрессировать).
- Быстрый UX: обновляем `localStorage` сразу, затем best-effort запись на сервер.
- Все запросы на фронте — `credentials: 'include'`.
- Попытки должны быть идемпотентны: в `SessionConfigBase` используем `attemptId`.

### 5.1 Canonical localStorage ключи
- **Прогресс**: всегда через `progressStorageKey(trainerId)` из `src/lib/trainerIds.ts`, т.е. `smmtry.trainer.progress:<trainerId>`
- **Лучший результат (best result)**: общий механизм (один ключ) `smmtry.trainer.bestResults:v1` через `src/lib/bestResults.ts`

## 6) Каноничный UI сессии
- В `TrainerDefinition` для новых тренажёров включаем:
  - `sessionFrame: { type: 'trainerGameFrame' }`
  - и отдаём live-метрики через `setMetrics`.
- Для карточных тренажёров используем:
  - `useDrillEngine` (логика)
  - `DrillStage` (layout/анимации/подсказка/tooltip)
- Числовая клавиатура: `NumberKeyboard` (как в столбиках).
- Физическая клавиатура: **обязательно** подключать `usePhysicalNumberKeyboard`.
- **Результат/итог**: канонично рендерится в `TrainerFlow` (step `result`). Сессии и game-modes не должны иметь “внутренних” экранов результата.

### Каноничные поля `SessionResult.metrics`
Заполняем по возможности максимально полно, чтобы общий результат (`TrainerResultCard`) всегда мог показать статистику:
- `total`: сколько задач в сессии
- `solved`: сколько задач попытались/решили (для single-attempt может быть `correct + mistakes`)
- `correct`: сколько задач решено верно (если применимо)
- `mistakes`: количество ошибок (по правилам тренажёра)
- `timeSec`: время (сек)
- `won`: победа/успех по режиму (speed/race)
- `starsEarned`: 0..3 (если применимо)

## 10) Archetype vs backend kind
- `meta.archetype` — UI/структурная классификация: `mental | visual | drill | column`
- `kind` в `/api/progress/record` — серверная классификация (может временно не совпадать 1:1 с archetype до миграции backend)

## 7) Режимы (presets)
### 7.1 Каноничные пресеты (если применимо)
- `accuracy-choice`: Тренировка (варианты ответа)
- `accuracy-input`: Точность (ввод)
- `speed`: Скорость (таймер)
- `race:1..3`: Новичок/Знаток/Мастер (гонка с соперником)

### 7.2 Race
Если preset — гонка:
- UI должен отдавать `sessionMetrics.opponentProgressPct` (иначе TrainerFlow не включит “race” хром).
- Таймер в header автоматически скрывается в race-mode (смотрим `TrainerFlow.tsx`).

## 8) Как добавить новый тренажёр (чеклист)
1) Добавить `exerciseId` в `src/data/exerciseData.ts` (правильная карточка/порядок/описание).
2) Добавить конфиг (если нужен) в `src/data/*Config.ts`.
3) Реализовать `*Session.tsx`:
   - `useDrillEngine` + `DrillStage`
   - `usePhysicalNumberKeyboard`
4) Реализовать `*Definition.tsx` (TrainerDefinition):
   - `meta.id` (trainerId)
   - `presets`
   - `loadProgress` / `recordResult`
   - `sessionFrame`
5) Подключить роутинг в `/src/app/(app)/<section>/[exerciseId]/page.tsx`.
6) Обновить гидрацию прогресса на листе (`TopicSection`) если добавили новый family, который хранит прогресс в БД/LS.
7) Проверить: `tsc`, открыть страницу списка и 1–2 сессии.

## 9) Что считаем “безопасной унификацией”
Разрешено в рамках “безопасных шагов”:
- добавлять новые helper’ы/хуки в `src/lib/*`
- унифицировать обработку клавиатуры/метрик
- добавлять документацию/чеклисты

Нежелательно до релиза (отдельной итерацией):
- массово переносить файлы между папками
- переименовывать `exerciseId`/`trainerId` без миграции прогресса

## Примечание про столбики (column)
Столбики сейчас держим как отдельные операции внутри одной family:

```
src/trainers/column/
  columnDefinition.tsx
  addition/
    ColumnAdditionGame.tsx
    ColumnAdditionDisplay.tsx
    useColumnAddition.ts
    types.ts
  subtraction/
  multiplication/
  division/
```

Это позволяет `columnDefinition.tsx` оставаться общим (progress/presets/sessionFrame), а сами реализации операций — локальными и изолированными.

