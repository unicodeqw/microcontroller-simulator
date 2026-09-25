/**
 * Елементи передньої панелі: світлодіоди, сигнальні лампи, тумблери, клавіші,
 * семисегментні індикатори й поворотний перемикач. Кожен є справжнім
 * елементом керування з клавіатурною доступністю, а не картинкою.
 */
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn, type FieldName } from './styles'

// ---- Світлодіод і лампа ----------------------------------------------------

export function Led({ on, className, title }: { on: boolean; className?: string; title?: string }) {
  return <span className={cn('led', className)} data-on={on} title={title} aria-hidden={!title} />
}

const LAMP_COLOR = {
  green: 'var(--lamp-green)',
  amber: 'var(--lamp-amber)',
  red: 'var(--lamp-red)',
  white: 'var(--lamp-white)',
} as const

export function Lamp({ on, color, label }: { on: boolean; color: keyof typeof LAMP_COLOR; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5" role="status" aria-label={`${label}: ${on ? 'on' : 'off'}`}>
      <span className="lamp" data-on={on} style={{ '--lamp': LAMP_COLOR[color] } as CSSProperties} />
      <span className={cn('silk text-[0.66rem]', on && 'text-silk')}>{label}</span>
    </div>
  )
}

// ---- Тумблер -----------------------------------------------------------------

const CAP: Record<FieldName | 'addr', string> = {
  op: 'var(--cap-op)',
  a0: 'var(--cap-a0)',
  a1: 'var(--cap-a1)',
  a2: 'var(--cap-a2)',
  addr: 'var(--cap-addr)',
}

/** Тумблер: ручка вгору = 1. Клік або пробіл перемикає. */
export function ToggleSwitch({
  on,
  onToggle,
  cap,
  label,
  disabled,
  marked,
}: {
  on: boolean
  onToggle: () => void
  cap: FieldName | 'addr'
  label: string
  disabled?: boolean
  /** Позначка курсора редагування під тумблером. */
  marked?: boolean
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onToggle}
        className="toggle"
        style={{ '--cap': CAP[cap] } as CSSProperties}
      >
        <span className="toggle-slot" />
        <span className="toggle-paddle" />
      </button>
      <span
        aria-hidden
        className={cn('mt-0.5 h-0 w-0 border-x-4 border-b-[5px] border-x-transparent border-b-transparent', marked && 'border-b-lamp-amber')}
      />
    </div>
  )
}

// ---- Клавіша ------------------------------------------------------------------

export function PanelKey({
  children,
  hint,
  onPress,
  disabled,
  latched,
  variant,
  title,
}: {
  children: ReactNode
  hint?: string
  onPress: () => void
  disabled?: boolean
  /** Клавіша з фіксацією, що лишається натиснутою (активний режим). */
  latched?: boolean
  variant?: 'run'
  title?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        className={cn('key', variant === 'run' && 'key-run')}
        data-latched={latched}
        aria-pressed={latched}
        disabled={disabled}
        onClick={onPress}
        title={title}
      >
        {children}
      </button>
      {hint && <span className="silk text-[0.62rem]">{hint}</span>}
    </div>
  )
}

// ---- Семисегментний індикатор ----------------------------------------------------

//  Сегменти:   a
//            f   b
//              g
//            e   c
//              d
const SEGMENTS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  ' ': '',
}

const SEG_PATHS: Record<string, string> = {
  a: 'M3 1 L13 1 L11 3 L5 3 Z',
  b: 'M13.5 1.5 L13.5 11 L12 12 L11.5 3.5 Z',
  c: 'M13.5 13 L13.5 22.5 L11.5 20.5 L12 12.5 Z',
  d: 'M3 23 L13 23 L11 21 L5 21 Z',
  e: 'M2.5 13 L2.5 22.5 L4.5 20.5 L4 12.5 Z',
  f: 'M2.5 1.5 L2.5 11 L4 12 L4.5 3.5 Z',
  g: 'M3 12 L5 11 L11 11 L13 12 L11 13 L5 13 Z',
}

function Digit({ ch }: { ch: string }) {
  const lit = SEGMENTS[ch] ?? ''
  return (
    <svg viewBox="0 0 16 24" className="h-[1.6em] w-[1.05em]" aria-hidden>
      {Object.entries(SEG_PATHS).map(([seg, d]) => (
        <path
          key={seg}
          d={d}
          transform="skewX(-6) translate(1.5 0)"
          fill={lit.includes(seg) ? 'var(--led-on)' : 'oklch(0.26 0.035 30)'}
          style={lit.includes(seg) ? { filter: 'drop-shadow(0 0 1.5px oklch(0.72 0.2 35 / 0.7))' } : undefined}
        />
      ))}
    </svg>
  )
}

/** Десятковий індикатор; якщо число довше за `digits`, розширюється. */
export function SevenSegment({ value, digits, className }: { value: number; digits: number; className?: string }) {
  const text = String(value)
  const padded = text.padStart(Math.max(digits, text.length), ' ')
  return (
    <span className={cn('window inline-flex items-center px-1.5 py-1', className)} role="img" aria-label={text}>
      {[...padded].map((ch, i) => (
        <Digit key={i} ch={ch} />
      ))}
    </span>
  )
}

// ---- Поворотний перемикач -------------------------------------------------------

/**
 * Галетний перемикач з фіксованими положеннями. Керування: клік на позначці,
 * перетягування, коліщатко миші, стрілки та Home/End.
 */
export function Knob<T>({
  options,
  value,
  onChange,
  label,
  format,
  describe = format,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  label: string
  /** Коротка позначка біля риски. */
  format: (v: T) => string
  /** Повний опис значення для екранних читачів. */
  describe?: (v: T) => string
}) {
  const index = Math.max(0, options.indexOf(value))
  const drag = useRef<{ x: number; y: number; index: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const latest = useRef<{ index: number; set: (i: number) => void }>({ index, set: () => {} })
  const sweep = 250
  const angleOf = (i: number) => -sweep / 2 + (sweep * i) / (options.length - 1)
  const set = (i: number) => onChange(options[Math.max(0, Math.min(options.length - 1, i))])
  useLayoutEffect(() => {
    latest.current = { index, set }
  })

  // Коліщатко обертає ручку і не прокручує сторінку: потрібен непасивний слухач.
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      latest.current.set(latest.current.index + (e.deltaY < 0 ? 1 : -1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const size = 132
  const c = size / 2
  const r = 24

  return (
    <div
      ref={root}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={options.length - 1}
      aria-valuenow={index}
      aria-valuetext={describe(value)}
      className="relative cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ width: size, height: size - 24 }}
      onKeyDown={(e) => {
        const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
        if (step) set(index + step)
        else if (e.key === 'Home') set(0)
        else if (e.key === 'End') set(options.length - 1)
        else return
        e.preventDefault()
        e.stopPropagation()
      }}
      onPointerDown={(e) => {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, y: e.clientY, index }
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const delta = (e.clientX - drag.current.x - (e.clientY - drag.current.y)) / 18
        set(drag.current.index + Math.round(delta))
      }}
      onPointerUp={() => (drag.current = null)}
    >
      <svg viewBox={`0 0 ${size} ${size - 24}`} className="absolute inset-0 overflow-visible">
        {options.map((o, i) => {
          const a = ((angleOf(i) - 90) * Math.PI) / 180
          const tick = (d: number) => [c + Math.cos(a) * d, c - 6 + Math.sin(a) * d]
          const [x1, y1] = tick(r + 5)
          const [x2, y2] = tick(r + 10)
          const [tx, ty] = tick(r + 20)
          return (
            <g key={i} className="cursor-pointer" onPointerDown={(e) => (e.stopPropagation(), set(i))}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--silk-2)" strokeWidth={1.2} />
              <text
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-silk"
                fontSize={9.5}
                fontWeight={600}
                fill={i === index ? 'var(--silk)' : 'var(--silk-2)'}
              >
                {format(o)}
              </text>
            </g>
          )
        })}
        {/* Ручка з рискою-покажчиком. */}
        <g transform={`rotate(${angleOf(index)} ${c} ${c - 6})`} style={{ transition: 'transform 90ms ease-out' }}>
          <circle cx={c} cy={c - 6} r={r} fill="oklch(0.17 0.006 250)" stroke="oklch(0 0 0 / 0.6)" />
          <circle cx={c} cy={c - 6} r={r - 4} fill="oklch(0.24 0.006 250)" />
          <rect x={c - 1.5} y={c - 6 - r + 3} width={3} height={12} rx={1} fill="var(--silk)" />
        </g>
      </svg>
    </div>
  )
}
