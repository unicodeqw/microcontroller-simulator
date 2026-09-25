import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export type FieldName = 'op' | 'a0' | 'a1' | 'a2'

/** Поля слова команди: назва, біти (0 = старший, 0x4000) і кольори. */
export const FIELDS: { name: FieldName; label: string; bits: number[] }[] = [
  { name: 'op', label: 'OP', bits: [0, 1, 2] },
  { name: 'a0', label: 'A0', bits: [3, 4, 5, 6] },
  { name: 'a1', label: 'A1', bits: [7, 8, 9, 10] },
  { name: 'a2', label: 'A2', bits: [11, 12, 13, 14] },
]

/** Колір тексту поля на сторінці-«документації». */
export const INK: Record<FieldName, string> = { op: 'text-op', a0: 'text-a0', a1: 'text-a1', a2: 'text-a2' }
/** Колір шовкографії поля на панелі машини. */
export const SILK: Record<FieldName, string> = {
  op: 'text-silk-op',
  a0: 'text-silk-a0',
  a1: 'text-silk-a1',
  a2: 'text-silk-a2',
}

export const bitMask = (bit: number) => 0x4000 >> bit
