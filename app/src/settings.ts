import { useSyncExternalStore } from 'react'
import type { Lang } from './i18n'

export interface Settings {
  lang: Lang
  theme: 'light' | 'dark'
  /** Тактів за секунду для анімованого запуску; `null` означає миттєво (як в оригіналі). */
  speed: number | null
  /** Масштаб кореневого шрифту у відсотках. */
  zoom: number
}

export const SPEEDS: (number | null)[] = [1, 2, 4, 8, 16, 32, null]
export const ZOOM_MIN = 70
export const ZOOM_MAX = 150

const KEY = 'mcs.settings'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* сховище недоступне (приватний режим тощо) */
  }
}

const saved = read<Partial<Settings>>(KEY) ?? {}
let settings: Settings = {
  // Лабораторна викладається українською; англійська вмикається клавішею F6.
  lang: saved.lang ?? 'uk',
  theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  speed: saved.speed === undefined ? null : saved.speed,
  zoom: saved.zoom ?? 100,
}

const listeners = new Set<() => void>()

function apply() {
  const root = document.documentElement
  root.classList.toggle('dark', settings.theme === 'dark')
  root.style.fontSize = `${settings.zoom}%`
  root.lang = settings.lang
}
apply()

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch }
  apply()
  write(KEY, JSON.stringify({ lang: settings.lang, speed: settings.speed, zoom: settings.zoom }))
  if (patch.theme) write('mcs.theme', patch.theme)
  listeners.forEach((l) => l())
}

export const getSettings = () => settings

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => settings,
  )
}
