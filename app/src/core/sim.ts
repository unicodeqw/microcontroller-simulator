import { useSyncExternalStore } from 'react'
import init, { Simulator } from './pkg/sim_wasm'

export type Mode = 'Stop' | 'Editing' | 'Takt' | 'Step' | 'Run'
export type SimError = 'PcOverflow' | 'DivisionByZero' | 'RunLimit'
export type Takt =
  | 'Standby'
  | 'Stop'
  | 'GetCommand'
  | 'GetR0'
  | 'GetR1'
  | 'GetR2'
  | 'SetR2'
  | 'Mov'
  | 'Add'
  | 'AbsSub'
  | 'Mul'
  | 'Div'
  | 'Compare'
  | 'PcInc'
  | 'PcJump'

export interface Access {
  kind: 'Fetch' | 'Read' | 'Write'
  addr: number
}

/** Дзеркало `sim_core::Snapshot`. */
export interface Snapshot {
  mem: number[]
  mode: Mode
  pc: number
  ir: number
  op: number
  r0: number
  r1: number
  r2: number
  phase: number
  takt: Takt
  sequence: Takt[]
  instrDone: boolean
  jumpTaken?: boolean | null
  halted: boolean
  printed: boolean
  standby: boolean
  error?: SimError | null
  access?: Access | null
  canExecute: boolean
  cursorRow: number
  cursorBit: number
  takts: number
  instructions: number
}

export const WORD_MASK = 0x7fff
export const RUN_LIMIT = 10_000

export const field = {
  op: (w: number) => (w >> 12) & 7,
  a0: (w: number) => (w >> 8) & 0xf,
  a1: (w: number) => (w >> 4) & 0xf,
  a2: (w: number) => w & 0xf,
}

export const encode = (op: number, a0: number, a1: number, a2: number) =>
  ((op & 7) << 12) | ((a0 & 0xf) << 8) | ((a1 & 0xf) << 4) | (a2 & 0xf)

export const bin = (v: number, width: number) => (v >>> 0).toString(2).padStart(width, '0').slice(-width)

export const fitsWord = (v: number) => v >= 0 && v <= WORD_MASK

// ---------------------------------------------------------------------------

type Listener = () => void

/** Тимчасове сповіщення в рядку стану. */
export interface Notice {
  id: number
  kind: 'error' | 'info'
  /** Або код помилки машини, або готовий текст. */
  error?: SimError
  text?: string
}

interface State {
  snap: Snapshot
  /** Триває анімований запуск. */
  running: boolean
  notice: Notice | null
}

let sim: Simulator
let state: State
const listeners = new Set<Listener>()
let runTimer: number | undefined
let noticeId = 0

function emit(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function refresh(extra: Partial<State> = {}) {
  emit({ snap: normalize(sim.snapshot()), ...extra })
}

function normalize(s: Snapshot): Snapshot {
  // Лічильники u64 можуть прийти як bigint.
  return { ...s, takts: Number(s.takts), instructions: Number(s.instructions) }
}

export async function initSimulator() {
  await init()
  sim = new Simulator()
  state = { snap: normalize(sim.snapshot()), running: false, notice: null }
}

export function useSim<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => select(state),
  )
}

export const getState = () => state

function report(err: string | undefined) {
  if (err) notify({ kind: 'error', error: err as SimError })
}

export function notify(n: Omit<Notice, 'id'>) {
  emit({ notice: { ...n, id: ++noticeId } })
}

export function dismissNotice() {
  emit({ notice: null })
}

// ---- дії ---------------------------------------------------------------

export const actions = {
  edit() {
    stopRun()
    sim.edit()
    refresh({ notice: null })
  },
  takt() {
    if (!guard()) return
    report(sim.takt())
    refresh()
  },
  step() {
    if (!guard()) return
    report(sim.step())
    refresh()
  },
  /** Виконує програму миттєво або анімовано зі швидкістю `taktsPerSecond`. */
  run(taktsPerSecond: number | null) {
    if (state.running) return stopRun()
    if (!guard()) return
    if (taktsPerSecond === null) {
      report(sim.run(RUN_LIMIT))
      refresh()
      return
    }
    sim.setRunMode()
    const startInstr = state.snap.instructions
    const tick = () => {
      const err = sim.takt()
      sim.setRunMode()
      const snap = normalize(sim.snapshot())
      if (!err && snap.instructions - startInstr >= RUN_LIMIT) {
        stopRun(false)
        emit({ snap })
        return report('RunLimit')
      }
      if (err || snap.halted) {
        stopRun(false)
        emit({ snap })
        return report(err)
      }
      emit({ snap })
    }
    tick()
    if (!state.running && (state.snap.halted || state.snap.error)) return
    runTimer = window.setInterval(tick, Math.max(1000 / taktsPerSecond, 16))
    emit({ running: true })
  },
  pause: () => stopRun(),

  toggleBit(row: number, bit: number) {
    if (sim.toggleBit(row, bit)) refresh()
  },
  setCursor(row: number, bit: number) {
    sim.setCursor(row, bit)
    refresh()
  },
  writeBit(v: boolean) {
    if (sim.writeBit(v)) refresh()
  },
  moveCursor(dir: 'left' | 'right' | 'up' | 'down' | 'newline' | 'home' | 'end') {
    sim.moveCursor(dir)
    refresh()
  },
  setCell(addr: number, value: number) {
    sim.setCell(addr, value)
    refresh()
  },

  clear() {
    stopRun()
    sim.clear()
    sim.edit()
    refresh({ notice: null })
  },
  loadMemory(values: number[]) {
    stopRun()
    sim.loadMemory(Int32Array.from(values))
    sim.edit()
    refresh({ notice: null })
  },
  /** На некоректному файлі кидає помилку з описом. */
  loadText(bytes: Uint8Array) {
    stopRun()
    sim.loadText(bytes)
    sim.edit()
    refresh({ notice: null })
  },
  toText: () => sim.toText(),
}

function guard() {
  if (state.running) return false
  return state.snap.canExecute
}

function stopRun(emitState = true) {
  if (runTimer !== undefined) {
    clearInterval(runTimer)
    runTimer = undefined
  }
  if (state.running) {
    state = { ...state, running: false }
    if (emitState) refresh()
  }
}
