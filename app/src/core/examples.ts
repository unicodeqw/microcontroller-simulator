import { encode } from './sim'

const ADD = 1, SUB = 3, JG = 6, STOP = 7

function program(cells: Record<number, number>): number[] {
  return Array.from({ length: 16 }, (_, i) => cells[i] ?? 0)
}

export const examples = {
  /** Рис. 1.7–1.11 методички. */
  manual: program({
    0: encode(ADD, 13, 14, 15),
    1: encode(STOP, 13, 14, 15),
    13: 17,
    14: 23,
  }),
  /** Індивідуальне завдання, варіант 1: Y = A + B + C, де A=1, B=2, C=3 → Y=6. */
  variant1: program({
    0: encode(ADD, 12, 13, 15),
    1: encode(ADD, 15, 14, 15),
    2: encode(STOP, 12, 13, 15),
    12: 1,
    13: 2,
    14: 3,
  }),
  /** acc += n; n = |n − 1|; якщо n > 0, перейти на 0 → 15. */
  loop: program({
    0: encode(ADD, 12, 10, 12),
    1: encode(SUB, 10, 11, 10),
    2: encode(JG, 10, 13, 0),
    3: encode(STOP, 10, 11, 12),
    10: 5,
    11: 1,
  }),
} as const

export type ExampleId = keyof typeof examples
