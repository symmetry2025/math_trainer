export interface Exercise {
  id: string;
  title: string;
  description?: string;
  progress: number;
  total: number;
  unlocked: boolean;
}

interface TopicSection {
  id: string;
  title: string;
  icon?: string;
  exercises: Exercise[];
}

interface GradeSection {
  grade: number;
  sections: TopicSection[];
}

export const additionSubtractionData: GradeSection[] = [
  {
    grade: 2,
    sections: [
      {
        id: 'addition-2-compose',
        title: 'Состав числа',
        exercises: [
          { id: 'compose-2-4', title: 'Состав чисел 2-3-4', progress: 0, total: 100, unlocked: true },
          { id: 'compose-5-7', title: 'Состав чисел 5-6-7', progress: 0, total: 100, unlocked: true },
          { id: 'compose-8-9', title: 'Состав чисел 8-9', progress: 0, total: 100, unlocked: true },
          { id: 'compose-10', title: 'Состав числа 10', progress: 0, total: 100, unlocked: true },
          { id: 'house-2-4', title: 'Домики чисел 2-3-4', progress: 0, total: 100, unlocked: true },
          { id: 'house-5-7', title: 'Домики чисел 5-6-7', progress: 0, total: 100, unlocked: true },
          { id: 'house-8-9', title: 'Домики чисел 8-9', progress: 0, total: 100, unlocked: true },
          { id: 'house-10', title: 'Домик числа 10', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'addition-2-20',
        title: 'Сложение в пределах 20',
        exercises: [
          { id: 'add-10', title: 'Сложение до 10', progress: 8, total: 100, unlocked: true },
          { id: 'add-missing-addend-10', title: 'Найти слагаемое', description: 'в пределах 10', progress: 0, total: 100, unlocked: true },
          { id: 'add-20-no-carry', title: 'Сложение до 20', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'add-20', title: 'Сложение до 20', description: 'с переходом', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'addition-2-50',
        title: 'Сложение в пределах 50',
        exercises: [
          { id: 'add-to-round-ten', title: 'Сложение с круглым', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-1d-no-carry', title: 'Двухзначное и однозначное', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-1d-carry', title: 'Двухзначное и однозначное', description: 'с переходом', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-2d-no-carry', title: 'Сумма двухзначных', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-2d-carry', title: 'Сумма двухзначных', description: 'с переходом', progress: 0, total: 100, unlocked: true },
          { id: 'add-missing-addend-50', title: 'Найти слагаемое', description: 'в пределах 50', progress: 0, total: 100, unlocked: true },
          { id: 'add-zero', title: 'Сложение с нулем', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'addition-2-100',
        title: 'Сложение в пределах 100',
        exercises: [
          { id: 'add-2d-2d-one-round', title: 'Сумма двухзначных', description: 'одно из них круглое', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-2d-no-carry-100', title: 'Сумма двухзначных', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-2d-to-round', title: 'Сумма двухзначных', description: 'до круглого', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-2d-carry-100', title: 'Сумма двухзначных', description: 'с переходом', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'addition-2-column',
        title: 'Сложение в столбик',
        exercises: [
          { id: 'column-add-2d-1d-no-carry', title: 'Двухзначное и однозначное', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'column-add-2d-1d-carry', title: 'Двухзначное и однозначное', description: 'с переходом', progress: 0, total: 100, unlocked: true },
          { id: 'column-add-2d-2d-no-carry', title: 'Двухзначное и двухзначное', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'column-add-2d-2d-carry', title: 'Двухзначное и двухзначное', description: 'с переходом', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'subtraction-2-20',
        title: 'Вычитание в пределах 20',
        exercises: [
          { id: 'sub-10', title: 'Вычитание до 10', progress: 0, total: 100, unlocked: true },
          {
            id: 'sub-missing-minuend-10',
            title: 'Найти уменьшаемое',
            description: 'в пределах 10',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-subtrahend-10',
            title: 'Найти вычитаемое',
            description: 'в пределах 10',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-20-2d-1d-no-borrow',
            title: 'Вычитание до 20',
            description: 'без перехода',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            // currently wired mental math config id (borrow over ten, within 20)
            id: 'sub-20',
            title: 'Вычитание до 20',
            description: 'с переходом',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-minuend-20',
            title: 'Найти уменьшаемое',
            description: 'в пределах 20',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-subtrahend-20',
            title: 'Найти вычитаемое',
            description: 'в пределах 20',
            progress: 0,
            total: 100,
            unlocked: true,
          },
        ],
      },
      {
        id: 'subtraction-2-50',
        title: 'Вычитание в пределах 50',
        exercises: [
          {
            id: 'sub-2d-2d-round',
            title: 'Двухзначные круглые',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-2d-2d-no-borrow',
            title: 'Двухзначные',
            description: 'без перехода',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-minuend-50',
            title: 'Найти уменьшаемое',
            description: 'в пределах 50',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-2d-2d-borrow',
            title: 'Двухзначные',
            description: 'с переходом',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-subtrahend-50',
            title: 'Найти вычитаемое',
            description: 'в пределах 50',
            progress: 0,
            total: 100,
            unlocked: true,
          },
        ],
      },
      {
        id: 'subtraction-2-100',
        title: 'Вычитание в пределах 100',
        exercises: [
          {
            id: 'sub-to-round-ten',
            title: 'Вычитание до круглого',
            description: 'в пределах 100',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-minuend-100',
            title: 'Найти уменьшаемое',
            description: 'в пределах 100',
            progress: 0,
            total: 100,
            unlocked: true,
          },
          {
            id: 'sub-missing-subtrahend-100',
            title: 'Найти вычитаемое',
            description: 'в пределах 100',
            progress: 0,
            total: 100,
            unlocked: true,
          },
        ],
      },
      {
        id: 'subtraction-2-column',
        title: 'Вычитание в столбик',
        exercises: [
          { id: 'column-sub-2d-1d-no-borrow', title: 'Двухзначное и однозначное', description: 'без заёма', progress: 0, total: 100, unlocked: true },
          { id: 'column-sub-2d-2d-no-borrow', title: 'Двухзначное и двухзначное', description: 'без заёма', progress: 0, total: 100, unlocked: true },
          { id: 'column-sub-2d-1d-borrow', title: 'Двухзначное и однозначное', description: 'с заёмом', progress: 0, total: 100, unlocked: true },
          { id: 'column-sub-2d-2d-borrow', title: 'Двухзначное и двухзначное', description: 'с заёмом', progress: 0, total: 100, unlocked: true },
        ],
      },
    ],
  },
  {
    grade: 3,
    sections: [
      {
        id: 'addition-3-1000',
        title: 'Сложение в пределах 1000',
        exercises: [
          // Зеркало из 2 класса
          { id: 'add-2d-2d-no-carry', title: 'Сумма двухзначных', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'add-2d-2d-carry', title: 'Сумма двухзначных', description: 'с переходом', progress: 0, total: 100, unlocked: true },

          { id: 'add-3d-round-2d', title: 'Трёхзначное и двузначное', description: 'трёхзначное круглое', progress: 0, total: 100, unlocked: true },
          { id: 'add-3d-3d-round', title: 'Сумма трёхзначных', description: 'оба круглые', progress: 0, total: 100, unlocked: true },
          { id: 'add-3d-3d-one-round', title: 'Сумма трёхзначных', description: 'одно из них круглое', progress: 0, total: 100, unlocked: true },
          { id: 'add-3d-3d-no-carry', title: 'Сумма трёхзначных', description: 'без перехода', progress: 0, total: 100, unlocked: true },
          { id: 'add-3d-3d-carry', title: 'Сумма трёхзначных', description: 'с переходом', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'addition-3-sumtable',
        title: 'Заполни таблицу',
        exercises: [
          { id: 'add-sumtable-find-addend', title: 'Найди слагаемое', progress: 0, total: 100, unlocked: true },
          { id: 'add-sumtable-find-component', title: 'Найди компонент суммы', progress: 0, total: 100, unlocked: true },
          { id: 'add-sumtable-letter', title: 'Подставь вместо буквы', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'addition-3-column-1000',
        title: 'В столбик в пределах 1000',
        exercises: [
          { id: 'column-add-3d-2d', title: 'Трёхзначное и двузначное', progress: 0, total: 100, unlocked: true },
          { id: 'column-add-3d-3d', title: 'Сумма трёхзначных', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'subtraction-3-100',
        title: 'Вычитание в пределах 100',
        exercises: [
          { id: 'sub-100-3', title: 'Вычитание в пределах 100', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'subtraction-3-1000',
        title: 'Вычитание в пределах 1000',
        exercises: [{ id: 'sub-1000', title: 'Вычитание в пределах 1000', progress: 0, total: 100, unlocked: true }],
      },
      {
        id: 'subtraction-3-column-1000',
        title: 'В столбик в пределах 1000',
        exercises: [
          { id: 'column-sub-3d-2d', title: 'Трёхзначное и двузначное', progress: 0, total: 100, unlocked: true },
          { id: 'column-sub-3d-3d', title: 'Разность трёхзначных', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'subtraction-3-sumtable',
        title: 'Заполни таблицу',
        exercises: [
          { id: 'sub-sumtable-find-difference', title: 'Найди разность', progress: 0, total: 100, unlocked: true },
          { id: 'sub-sumtable-find-subtrahend', title: 'Найди вычитаемое', progress: 0, total: 100, unlocked: true },
          { id: 'sub-sumtable-find-minuend', title: 'Найди уменьшаемое', progress: 0, total: 100, unlocked: true },
        ],
      },
    ],
  },
  {
    grade: 4,
    sections: [
      {
        id: 'addition-4',
        title: 'Многозначные числа',
        exercises: [
          { id: 'add-10000', title: 'Сложение до 10 000', progress: 0, total: 100, unlocked: true },
          { id: 'add-100000', title: 'Сложение до 100 000', progress: 0, total: 100, unlocked: false },
          { id: 'sub-10000', title: 'Вычитание до 10 000', progress: 0, total: 100, unlocked: true },
          { id: 'sub-100000', title: 'Вычитание до 100 000', progress: 0, total: 100, unlocked: false },
        ],
      },
    ],
  },
];

function isAdditionExerciseId(exerciseId: string) {
  return (
    exerciseId === 'column-addition' ||
    exerciseId.startsWith('add-') ||
    exerciseId.startsWith('mix-') ||
    exerciseId.startsWith('compose-') ||
    exerciseId.startsWith('house-') ||
    exerciseId.startsWith('column-add-')
  );
}

function isSubtractionExerciseId(exerciseId: string) {
  return exerciseId === 'column-subtraction' || exerciseId.startsWith('column-sub-') || exerciseId.startsWith('sub-');
}

function filterAdditionSubtractionData(predicate: (exerciseId: string) => boolean): GradeSection[] {
  return additionSubtractionData
    .map((grade) => {
      const sections = grade.sections
        .map((section) => {
          const exercises = section.exercises.filter((e) => predicate(e.id));
          if (exercises.length === 0) return null;
          return { ...section, exercises };
        })
        .filter(Boolean) as TopicSection[];
      if (sections.length === 0) return null;
      return { ...grade, sections };
    })
    .filter(Boolean) as GradeSection[];
}

export const additionData: GradeSection[] = filterAdditionSubtractionData(isAdditionExerciseId);
export const subtractionData: GradeSection[] = filterAdditionSubtractionData(isSubtractionExerciseId);

export const multiplicationData: GradeSection[] = [
  {
    grade: 2,
    sections: [
      {
        id: 'mult-table-2',
        title: 'Таблица умножения',
        exercises: [
          { id: 'mul-table-2', title: 'Умножение на 2', progress: 0, total: 100, unlocked: true },
          { id: 'mul-table-3', title: 'Умножение на 3', progress: 0, total: 100, unlocked: true },
          { id: 'mul-table-4', title: 'Умножение на 4', progress: 0, total: 100, unlocked: true },
          { id: 'mul-table-5', title: 'Умножение на 5', progress: 0, total: 100, unlocked: true },
          {
            id: 'mul-table-2-5',
            title: 'Таблица умножения на 2–5',
            description: 'Тренировка таблицы умножения (2, 3, 4, 5)',
            progress: 0,
            total: 100,
            unlocked: true,
          },
        ],
      },
    ],
  },
  {
    grade: 3,
    sections: [
      {
        id: 'mult-table',
        title: 'Таблица умножения',
        exercises: [
          { id: 'mul-table-6', title: 'Умножение на 6', progress: 0, total: 100, unlocked: true },
          { id: 'mul-table-7', title: 'Умножение на 7', progress: 0, total: 100, unlocked: true },
          { id: 'mul-table-8', title: 'Умножение на 8', progress: 0, total: 100, unlocked: true },
          { id: 'mul-table-9', title: 'Умножение на 9', progress: 0, total: 100, unlocked: true },
          {
            id: 'mul-table-full',
            title: 'Вся таблица умножения',
            description: 'Тренировка всей таблицы',
            progress: 18,
            total: 100,
            unlocked: true,
          },
        ],
      },
      {
        id: 'mult-mental-3',
        title: 'Устное умножение',
        exercises: [
          { id: 'mul-round-1d', title: 'Круглое на однозначное', progress: 0, total: 100, unlocked: true },
          { id: 'mul-2d-1d-max20', title: 'Двухзначное и однозначное', description: 'множитель до 20', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'mult-column-3',
        title: 'Умножение в столбик',
        exercises: [{ id: 'column-mul-2d-1d', title: 'Двухзначное на однозначное', progress: 0, total: 100, unlocked: true }],
      },
      {
        id: 'mult-advanced-3',
        title: 'Умножение чисел',
        exercises: [
          { id: 'mult-10-100', title: 'Умножение на 10, 100', progress: 0, total: 100, unlocked: true },
          { id: 'mult-round', title: 'Умножение круглых чисел', progress: 0, total: 100, unlocked: false },
        ],
      },
    ],
  },
  {
    grade: 4,
    sections: [
      {
        id: 'mult-multi',
        title: 'Многозначное умножение',
        exercises: [
          { id: 'mult-2digit', title: 'Умножение двузначных', progress: 0, total: 100, unlocked: true },
          { id: 'mult-3digit', title: 'Умножение трёхзначных', progress: 0, total: 100, unlocked: false },
          { id: 'column-multiplication', title: 'Умножение в столбик', progress: 0, total: 100, unlocked: true },
        ],
      },
    ],
  },
];

export const divisionData: GradeSection[] = [
  {
    grade: 2,
    sections: [
      {
        id: 'div-table-2',
        title: 'Таблица деления',
        exercises: [
          { id: 'div-2', title: 'Деление на 2', progress: 0, total: 100, unlocked: true },
          { id: 'div-3', title: 'Деление на 3', progress: 0, total: 100, unlocked: true },
          { id: 'div-4', title: 'Деление на 4', progress: 0, total: 100, unlocked: true },
          { id: 'div-5', title: 'Деление на 5', progress: 0, total: 100, unlocked: true },
        ],
      },
    ],
  },
  {
    grade: 3,
    sections: [
      {
        id: 'div-table',
        title: 'Таблица деления',
        exercises: [
          { id: 'div-6', title: 'Деление на 6', progress: 0, total: 100, unlocked: true },
          { id: 'div-7', title: 'Деление на 7', progress: 0, total: 100, unlocked: true },
          { id: 'div-8', title: 'Деление на 8', progress: 0, total: 100, unlocked: true },
          { id: 'div-9', title: 'Деление на 9', progress: 0, total: 100, unlocked: true },
        ],
      },
      {
        id: 'div-column-3',
        title: 'Деление в столбик',
        exercises: [
          { id: 'column-division-2d-1d', title: 'Двузначное ÷ однозначное', description: 'без остатка', progress: 0, total: 100, unlocked: true },
          { id: 'column-division-3d-2d', title: 'Трёхзначное ÷ двузначное', description: 'без остатка', progress: 0, total: 100, unlocked: true },
        ],
      },
    ],
  },
  {
    grade: 4,
    sections: [
      {
        id: 'div-remainder',
        title: 'Деление с остатком',
        exercises: [
          { id: 'div-rem-simple', title: 'Простое деление с остатком', progress: 0, total: 100, unlocked: true },
          { id: 'div-rem-100', title: 'Деление с остатком до 100', progress: 0, total: 100, unlocked: false },
        ],
      },
      {
        id: 'div-advanced',
        title: 'Деление многозначных',
        exercises: [
          { id: 'div-10-100', title: 'Деление на 10, 100', progress: 0, total: 100, unlocked: true },
          { id: 'div-2digit', title: 'Деление на двузначное', progress: 0, total: 100, unlocked: false },
          // в 4 классе будет другой вариант "в столбик" (многозначные); здесь пока оставляем пусто
        ],
      },
    ],
  },
];

