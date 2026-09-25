import { dismissNotice, field, useSim } from '@/core/sim'
import { MNEMONICS } from '@/i18n'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { addr4, currentWord, opCode, useT } from './format'
import { cn, INK } from './styles'

/*
 * Права колонка: те, що в оригіналі було текстовими панелями. Тут це
 * «документація» поруч із машиною: звичайна типографіка й тонкі лінії, без карток.
 */

function DocSection({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border-t border-rule pt-4', className)}>
      <h2 className="mb-3 text-[0.95rem] font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// ---- Екран ЕОМ --------------------------------------------------------------------

export function ComputerScreen() {
  const t = useT()
  const s = useSim((st) => st.snap)
  const word = s.ir
  const rows = [
    ['A0', field.a0(word)],
    ['A1', field.a1(word)],
    ['A2', field.a2(word)],
  ] as const

  return (
    <section aria-label={t.screen} className="machine p-3">
      <div className="crt min-h-[6.75rem] px-4 py-3 font-mono text-[0.95rem] leading-7">
        {s.printed ? (
          rows.map(([name, a]) => (
            <div key={name} className="flex justify-between gap-6 tabular">
              <span>
                {name} = {addr4(a)}
              </span>
              <span>
                [{name}] = {s.mem[a]}
              </span>
            </div>
          ))
        ) : (
          <p className="font-sans text-sm leading-6 opacity-50">{t.screenEmpty}</p>
        )}
      </div>
      <p className="silk mt-2 px-1">{t.screen}</p>
    </section>
  )
}

// ---- Інформаційне вікно ----------------------------------------------------------------

export function InfoWindow() {
  const t = useT()
  const s = useSim((st) => st.snap)
  const editing = s.mode === 'Editing'
  const word = editing ? s.mem[s.cursorRow] : currentWord(s)
  const op = field.op(word)

  return (
    <DocSection title={t.info}>
      <p className="mb-2 font-medium">{t.modes[s.mode]}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[0.95rem]">
        {editing ? (
          <Row label={t.cell}>
            {addr4(s.cursorRow)} <span className="text-ink-2">({s.cursorRow})</span>
          </Row>
        ) : (
          <Row label={t.programCounter}>
            {addr4(Math.min(s.pc, 15))} <span className="text-ink-2">({s.pc})</span>
          </Row>
        )}
        <Row label={t.processorCommand}>
          <span className={INK.op}>{opCode(op)}</span> {t.commands[op]}
        </Row>
        {editing ? <Row label={t.value}>{word}</Row> : <Row label={t.processorTakt}>{t.takts[s.takt]}</Row>}
      </dl>
      {!editing && (
        <>
          <p className="mt-4 mb-1.5 text-sm text-ink-2">{t.operands}</p>
          <dl className="grid grid-cols-[auto_auto_1fr] gap-x-5 gap-y-1 font-mono text-[0.9rem]">
            {(
              [
                ['A0', 'a0', field.a0(word)],
                ['A1', 'a1', field.a1(word)],
                ['A2', 'a2', field.a2(word)],
              ] as const
            ).map(([name, f, a]) => (
              <div key={name} className="contents">
                <dt className={INK[f]}>{name}</dt>
                <dd>
                  {addr4(a)} <span className="text-ink-2">({a})</span>
                </dd>
                <dd className="text-right tabular">
                  [{name}] = {s.mem[a]}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </DocSection>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-ink-2">{label}</dt>
      <dd className="text-right font-mono text-[0.9rem]">{children}</dd>
    </>
  )
}

// ---- Довідка ---------------------------------------------------------------------------

export function CommandSystem() {
  const t = useT()
  const activeOp = useSim((st) =>
    st.snap.mode === 'Editing' ? field.op(st.snap.mem[st.snap.cursorRow]) : st.snap.takts > 0 ? st.snap.op : -1,
  )
  return (
    <DocSection title={t.commandSystem}>
      <table className="w-full text-[0.9rem]">
        <tbody>
          {t.commands.map((text, op) => (
            <tr key={op} className={cn(op === activeOp && 'bg-[color-mix(in_oklch,var(--op)_12%,transparent)]')}>
              <td className={cn('py-1 pr-3 pl-1 font-mono', INK.op)}>{opCode(op)}</td>
              <td className="py-1 pr-3 font-mono text-[0.8rem] font-medium text-ink-2">{MNEMONICS[op]}</td>
              <td className="py-1 pr-1 font-mono text-[0.85rem]">{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DocSection>
  )
}

export function KeyboardHelp() {
  const t = useT()
  return (
    <DocSection title={t.keyboard}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[0.9rem]">
        {t.kbd.map(([keys, text]) => (
          <div key={keys} className="contents">
            <dt className="font-mono text-[0.8rem] whitespace-nowrap">{keys}</dt>
            <dd className="text-ink-2">{text}</dd>
          </div>
        ))}
      </dl>
    </DocSection>
  )
}

// ---- Сповіщення --------------------------------------------------------------------------

export function NoticeBar() {
  const t = useT()
  const notice = useSim((s) => s.notice)
  const hint = useSim((s) => (s.snap.canExecute ? null : s.snap.halted || s.snap.error ? 'finished' : 'locked'))

  useEffect(() => {
    if (notice?.kind !== 'info') return
    const id = setTimeout(dismissNotice, 2500)
    return () => clearTimeout(id)
  }, [notice])

  if (notice) {
    const error = notice.kind === 'error'
    return (
      <div
        role={error ? 'alert' : 'status'}
        className={cn('flex items-start gap-3 rounded-md px-4 py-2.5 text-[0.95rem]', error ? 'bg-danger-bg text-danger' : 'bg-sheet')}
      >
        <span className="flex-1">{notice.error ? t.errors[notice.error] : notice.text}</span>
        <button type="button" onClick={dismissNotice} className="cursor-pointer opacity-70 hover:opacity-100" aria-label={t.close}>
          <X className="size-4" />
        </button>
      </div>
    )
  }
  if (!hint) return null
  return <p className="px-1 text-[0.95rem] text-ink-2">{hint === 'finished' ? t.finished : t.notReady}</p>
}
