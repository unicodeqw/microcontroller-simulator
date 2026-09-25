import { field, type Snapshot } from '@/core/sim'
import { dictionaries, MNEMONICS, type Dict } from '@/i18n'
import { useSettings } from '@/settings'

export function useT(): Dict {
  return dictionaries[useSettings().lang]
}

/** Запис слова команди в стилі асемблера, наприклад `ADD [13], [14] → [15]`. */
export function disassemble(word: number): string {
  const op = field.op(word)
  const [a0, a1, a2] = [field.a0(word), field.a1(word), field.a2(word)]
  const m = MNEMONICS[op]
  switch (op) {
    case 0:
      return `${m} [${a0}] → [${a2}]`
    case 4:
    case 6:
      return `${m} [${a0}], [${a1}] → ${a2}`
    case 7:
      return `${m} ${a0}, ${a1}, ${a2}`
    default:
      return `${m} [${a0}], [${a1}] → [${a2}]`
  }
}

export const opCode = (op: number) => op.toString(2).padStart(3, '0')
export const addr4 = (a: number) => a.toString(2).padStart(4, '0')

/** Слово команди, що зараз у роботі: IR після першого такту, інакше комірка за PC. */
export function currentWord(s: Snapshot) {
  return s.takts > 0 ? s.ir : (s.mem[s.pc] ?? 0)
}
