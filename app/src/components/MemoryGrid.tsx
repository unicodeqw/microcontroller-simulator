import { actions, fitsWord, useSim, type Access } from '@/core/sim'
import { memo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { addr4, disassemble, useT } from './format'
import { Led } from './hardware'
import { bitMask, cn, FIELDS, SILK } from './styles'

const BUS_LAMP: Record<Access['kind'], { color: string; letter: string }> = {
  Fetch: { color: 'var(--lamp-amber)', letter: 'F' },
  Read: { color: 'var(--lamp-green)', letter: 'R' },
  Write: { color: 'var(--lamp-red)', letter: 'W' },
}

const ROW = 'grid grid-cols-[1rem_4.75rem_auto_2.25rem_minmax(0,1fr)_auto] items-center gap-x-3'

/**
 * Пам'ять як матриця світлодіодів. Одна й та сама комірка показана і як
 * команда, і як число: машина фон Неймана розрізняє їх лише за PC.
 */
export function MemoryGrid() {
  const t = useT()
  const snap = useSim((s) => s.snap)
  const editing = snap.mode === 'Editing'
  const executing = !editing && !snap.standby

  return (
    <section aria-label={t.memory} className="machine p-4 sm:p-5">
      <h2 className="silk mb-3 flex items-center gap-3">
        {t.memory}
        <span className="h-px flex-1 bg-silk-rule" />
        <BusLegend />
      </h2>
      <div className="overflow-x-auto">
        <div className="min-w-[38rem]">
          <div className={cn(ROW, 'silk pb-2 text-[0.62rem]')}>
            <span />
            <span>{t.addr}</span>
            <span className="flex gap-3 px-2.5">
              {FIELDS.map((f) => (
                <span key={f.name} className={cn('text-center', SILK[f.name])} style={{ width: `${f.bits.length * 1.1 - 0.4}rem` }}>
                  {f.label}
                </span>
              ))}
            </span>
            <span className="text-center">{t.bus}</span>
            <span>{t.asInstruction}</span>
            <span className="text-right">{t.asNumber}</span>
          </div>
          <div className="window py-1.5">
            {snap.mem.map((word, row) => (
              <MemoryRow
                key={row}
                row={row}
                word={word}
                editing={editing}
                isPc={executing && snap.pc === row}
                cursorRow={editing && snap.cursorRow === row}
                cursorBit={editing && snap.cursorRow === row ? snap.cursorBit : -1}
                access={snap.access?.addr === row ? snap.access.kind : null}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function BusLegend() {
  const t = useT()
  const items = [
    ['Fetch', t.busFetch],
    ['Read', t.busRead],
    ['Write', t.busWrite],
  ] as const
  return (
    <span className="hidden items-center gap-3 normal-case tracking-normal sm:flex">
      {items.map(([k, label]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="lamp !h-2.5 !w-2.5" data-on style={{ '--lamp': BUS_LAMP[k].color } as CSSProperties} />
          {label}
        </span>
      ))}
    </span>
  )
}

interface RowProps {
  row: number
  word: number
  editing: boolean
  isPc: boolean
  cursorRow: boolean
  cursorBit: number
  access: Access['kind'] | null
}

const MemoryRow = memo(function MemoryRow({ row, word, editing, isPc, cursorRow, cursorBit, access }: RowProps) {
  const t = useT()
  return (
    <div
      className={cn(
        ROW,
        'px-1 py-[0.3rem]',
        isPc && 'bg-[oklch(0.25_0.03_80)]',
        cursorRow && 'bg-[oklch(0.22_0.01_250)]',
        editing && 'cursor-pointer',
      )}
      onClick={editing ? () => actions.setCursor(row, cursorRow ? cursorBit : 0) : undefined}
    >
      <span className="text-center text-sm leading-none text-lamp-amber" aria-label={isPc ? 'PC' : undefined}>
        {isPc ? '▶' : ''}
      </span>
      <span className="font-mono text-sm whitespace-nowrap text-silk">
        {addr4(row)}
        <span className="ml-2 inline-block w-5 text-right text-xs text-silk-2 tabular">{row}</span>
      </span>
      <span className="flex gap-3 px-2.5">
        {FIELDS.map((f) => (
          <span key={f.name} className="flex gap-[0.4rem]">
            {f.bits.map((bit) => (
              <BitLed key={bit} row={row} bit={bit} on={(word & bitMask(bit)) !== 0} editing={editing} cursor={cursorBit === bit} />
            ))}
          </span>
        ))}
      </span>
      <span className="flex justify-center">
        {access && (
          <span
            className="lamp grid !h-4 !w-6 place-items-center font-mono text-[0.6rem] font-medium text-black/70"
            data-on
            style={{ '--lamp': BUS_LAMP[access].color } as CSSProperties}
            title={access}
          >
            {BUS_LAMP[access].letter}
          </span>
        )}
      </span>
      <span className={cn('truncate font-mono text-[0.8rem]', isPc ? 'text-silk' : 'text-silk-2')}>{disassemble(word)}</span>
      <span className="flex items-center justify-end gap-2 font-mono text-sm whitespace-nowrap text-silk">
        {!fitsWord(word) && (
          <span title={t.overflowHint} className="silk rounded-sm bg-[oklch(0.38_0.1_30)] px-1 text-[0.6rem] text-silk">
            {t.overflowBadge}
          </span>
        )}
        <ValueCell row={row} word={word} editing={editing} />
      </span>
    </div>
  )
})

function BitLed({ row, bit, on, editing, cursor }: { row: number; bit: number; on: boolean; editing: boolean; cursor: boolean }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      disabled={!editing}
      aria-label={`${row}:${14 - bit} = ${on ? 1 : 0}`}
      onClick={(e) => {
        e.stopPropagation()
        actions.toggleBit(row, bit)
      }}
      className={cn(
        'grid size-[0.7rem] place-items-center rounded-full',
        editing && 'cursor-pointer hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-silk-2',
        cursor && 'outline outline-2 outline-offset-2 outline-lamp-amber',
      )}
    >
      <Led on={on} />
    </button>
  )
}

/** Десяткове значення; у режимі редагування його можна ввести напряму. */
function ValueCell({ row, word, editing }: { row: number; word: number; editing: boolean }) {
  const [draft, setDraft] = useState<string | null>(null)

  if (!editing || draft === null) {
    return (
      <button
        type="button"
        disabled={!editing}
        onClick={(e) => {
          e.stopPropagation()
          setDraft(String(word))
        }}
        className={cn('min-w-14 rounded-sm px-1 text-right tabular', editing && 'cursor-text hover:bg-white/5')}
      >
        {word}
      </button>
    )
  }

  const commit = () => {
    const v = Number.parseInt(draft, 10)
    if (Number.isFinite(v)) actions.setCell(row, Math.max(0, Math.min(0x7fff, v)))
    setDraft(null)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setDraft(null)
  }
  return (
    <input
      autoFocus
      inputMode="numeric"
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={onKey}
      className="w-16 rounded-sm bg-black/40 px-1 text-right tabular outline outline-1 outline-lamp-amber"
    />
  )
}
