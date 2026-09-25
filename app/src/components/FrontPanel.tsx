import { actions, useSim } from '@/core/sim'
import { SPEEDS, updateSettings, useSettings } from '@/settings'
import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { disassemble, useT } from './format'
import { Knob, Lamp, Led, PanelKey, SevenSegment, ToggleSwitch } from './hardware'
import { bitMask, cn, FIELDS, SILK } from './styles'

/** Передня панель машини: регістри, стан, такти, пульт введення, керування. */
export function FrontPanel() {
  return (
    <section
      aria-label="Front panel"
      className="machine grid gap-x-8 gap-y-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:[grid-template-areas:'reg_status''seq_seq''sw_ctl']"
    >
      <Registers />
      <Status />
      <Sequencer />
      <SwitchRegister />
      <Controls />
    </section>
  )
}

// Іменовані області сітки діють лише на широких екранах; нижче секції йдуть одна за одною.
const AREA: Record<string, string> = {
  reg: 'xl:[grid-area:reg]',
  status: 'xl:[grid-area:status]',
  seq: 'xl:[grid-area:seq]',
  sw: 'xl:[grid-area:sw]',
  ctl: 'xl:[grid-area:ctl]',
}

function Section({ title, area, className, children }: { title: string; area: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', AREA[area], className)}>
      <h2 className="silk mb-3 flex items-center gap-3">
        {title}
        <span className="h-px flex-1 bg-silk-rule" />
      </h2>
      {children}
    </div>
  )
}

// ---- Регістри ----------------------------------------------------------------

function Registers() {
  const t = useT()
  const s = useSim((st) => st.snap)
  const pc = Math.min(s.pc, 15)

  return (
    <Section title={t.panelRegisters} area="reg">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-4">
        <RegName name="PC" hint={t.programCounter} />
        <div className="flex flex-wrap items-center gap-4">
          <span className="window inline-flex gap-1.5 px-2 py-1.5">
            {[8, 4, 2, 1].map((m) => (
              <Led key={m} on={(pc & m) !== 0} />
            ))}
          </span>
          <SevenSegment value={s.pc} digits={2} />
        </div>

        <RegName name="IR" hint={t.instructionRegister} />
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <WordLeds word={s.ir} />
          <span className="pb-1.5 font-mono text-sm text-silk-2">{s.takts > 0 ? disassemble(s.ir) : ''}</span>
        </div>

        <div className="col-span-2 flex flex-wrap gap-x-6 gap-y-3">
          {(
            [
              ['R0', s.r0, s.takt === 'GetR0'],
              ['R1', s.r1, s.takt === 'GetR1'],
              ['R2', s.r2, ['GetR2', 'Mov', 'Add', 'AbsSub', 'Mul', 'Div'].includes(s.takt)],
            ] as const
          ).map(([name, value, active]) => (
            <div key={name} className="flex items-center gap-3">
              <span className={cn('silk w-6 text-[0.8rem]', active && 'text-silk')}>{name}</span>
              <SevenSegment value={value} digits={5} className="text-[0.95rem]" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function RegName({ name, hint }: { name: string; hint: string }) {
  return (
    <span className="silk text-[0.8rem] text-silk" title={hint}>
      {name}
    </span>
  )
}

/** 15 світлодіодів слова з підписами полів над скобами. */
export function WordLeds({ word, size }: { word: number; size?: string }) {
  return (
    <span
      className="window inline-flex gap-2.5 px-2 pt-1 pb-1.5 [--led-size:0.55rem] sm:gap-3 sm:px-2.5 sm:[--led-size:0.7rem]"
      style={size ? ({ '--led-size': size } as CSSProperties) : undefined}
    >
      {FIELDS.map((f) => (
        <span key={f.name} className="flex flex-col items-stretch">
          <span className={cn('silk text-center text-[0.6rem]', SILK[f.name])}>{f.label}</span>
          <span className={cn('bracket mb-1', SILK[f.name])} />
          <span className="flex gap-[0.3rem] sm:gap-1.5">
            {f.bits.map((b) => (
              <Led key={b} on={(word & bitMask(b)) !== 0} />
            ))}
          </span>
        </span>
      ))}
    </span>
  )
}

// ---- Стан ------------------------------------------------------------------------

function Status() {
  const t = useT()
  const s = useSim((st) => st.snap)
  const running = useSim((st) => st.running)
  const active = running || (!s.standby && !s.halted && !s.error)

  return (
    <Section title={t.panelStatus} area="status">
      <div className="flex flex-wrap gap-5">
        <Lamp on={s.canExecute} color="white" label={t.lampReady} />
        <Lamp on={s.standby && !s.error} color="white" label={t.lampStandby} />
        <Lamp on={active} color="green" label={t.lampRun} />
        <Lamp on={s.halted} color="amber" label={t.lampStop} />
        <Lamp on={!!s.error} color="red" label={t.lampFault} />
      </div>
      <p className="mt-4 font-mono text-xs text-silk-2 tabular">{t.counters(s.takts, s.instructions)}</p>
    </Section>
  )
}

// ---- Секвенсор тактів --------------------------------------------------------------

function Sequencer() {
  const t = useT()
  const s = useSim((st) => st.snap)
  const seq = s.sequence
  const current = seq.length === 0 ? -1 : s.instrDone ? seq.length - 1 : s.phase - 1
  const pendingJump = (s.op === 4 || s.op === 6) && (s.jumpTaken === null || s.jumpTaken === undefined)

  return (
    <Section title={t.panelSequencer} area="seq">
      {seq.length === 0 ? (
        <p className="silk normal-case">{t.takts.Standby}</p>
      ) : (
        <ol className="flex flex-wrap gap-x-1 gap-y-3">
          {seq.map((takt, i) => {
            const label = pendingJump && i === seq.length - 1 ? `${t.takts.PcInc} | ${t.takts.PcJump}` : t.takts[takt]
            const state = i < current ? 'done' : i === current ? 'current' : 'todo'
            return (
              <Fragment key={i}>
                {i > 0 && <li aria-hidden className="mt-[0.3rem] h-px w-4 bg-silk-rule" />}
                <li className="flex items-start gap-2" aria-current={state === 'current' ? 'step' : undefined}>
                  <Led on={state === 'current'} className={cn(s.error && state === 'current' && 'hue-rotate-[-8deg]')} />
                  <span
                    className={cn(
                      'font-silk text-[0.8rem] leading-none font-medium',
                      state === 'current' ? 'text-silk' : state === 'done' ? 'text-silk-2' : 'text-silk-2/60',
                    )}
                  >
                    <span className="mr-1 font-mono text-[0.7rem]">{i + 1}</span>
                    {label}
                  </span>
                </li>
              </Fragment>
            )
          })}
        </ol>
      )}
    </Section>
  )
}

// ---- Пульт введення -----------------------------------------------------------------

function SwitchRegister() {
  const t = useT()
  const s = useSim((st) => st.snap)
  const editing = s.mode === 'Editing'
  const row = s.cursorRow
  const word = s.mem[row]

  return (
    <Section title={t.panelSwitches} area="sw" className="overflow-x-auto">
      <div className="flex w-max items-end gap-6 [--toggle-w:1.2rem] sm:[--toggle-w:1.4rem]">
        <SwitchGroup label={t.switchAddress} labelClass="text-silk">
          {[8, 4, 2, 1].map((m) => (
            <ToggleSwitch
              key={m}
              cap="addr"
              on={(row & m) !== 0}
              disabled={!editing}
              label={`${t.switchAddress} ${m}`}
              onToggle={() => actions.setCursor(row ^ m, s.cursorBit)}
            />
          ))}
        </SwitchGroup>
        <div className="flex items-end gap-3">
          {FIELDS.map((f) => (
            <SwitchGroup key={f.name} label={f.label} labelClass={SILK[f.name]}>
              {f.bits.map((b) => (
                <ToggleSwitch
                  key={b}
                  cap={f.name}
                  on={(word & bitMask(b)) !== 0}
                  disabled={!editing}
                  marked={editing && s.cursorBit === b}
                  label={`${t.switchData} ${f.label}, bit ${14 - b}`}
                  onToggle={() => actions.toggleBit(row, b)}
                />
              ))}
            </SwitchGroup>
          ))}
        </div>
      </div>
      <p className="silk mt-2 normal-case tracking-normal">
        {editing ? `${t.cell} ${row.toString(2).padStart(4, '0')} (${row}), ${t.value.toLowerCase()} ${word}` : t.switchesLocked}
      </p>
    </Section>
  )
}

function SwitchGroup({ label, labelClass, children }: { label: string; labelClass: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className={cn('silk text-center text-[0.62rem]', labelClass)}>{label}</span>
      <span className={cn('bracket mx-1 mb-1', labelClass)} />
      <div className="flex">{children}</div>
    </div>
  )
}

// ---- Керування --------------------------------------------------------------------

function Controls() {
  const t = useT()
  const { speed } = useSettings()
  const s = useSim((st) => st.snap)
  const running = useSim((st) => st.running)
  const can = s.canExecute && !running

  return (
    <Section title={t.panelControl} area="ctl">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="flex flex-wrap gap-3">
          <PanelKey hint="F2" latched={s.mode === 'Editing'} onPress={actions.edit}>
            {t.edit}
          </PanelKey>
          <PanelKey hint="F3" disabled={!can} onPress={actions.takt}>
            {t.takt}
          </PanelKey>
          <PanelKey hint="F4" disabled={!can} onPress={actions.step}>
            {t.step}
          </PanelKey>
          <PanelKey hint="F5" variant="run" latched={running} disabled={!running && !can} onPress={() => actions.run(speed)}>
            {running ? t.pause : t.run}
          </PanelKey>
        </div>
        <div className="flex flex-col items-center">
          <Knob
            label={t.speed}
            options={SPEEDS}
            value={speed}
            onChange={(v) => updateSettings({ speed: v })}
            format={(v) => (v === null ? '∞' : String(v))}
            describe={(v) => (v === null ? t.instant : `${v} ${t.taktsPerSec}`)}
          />
          <span className="silk -mt-1 text-[0.62rem]">
            {t.speed}, {t.taktsPerSec}
          </span>
        </div>
      </div>
    </Section>
  )
}

