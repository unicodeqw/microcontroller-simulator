import { useEffect, useState } from 'react'
import { CommandSystem, ComputerScreen, InfoWindow, KeyboardHelp, NoticeBar } from './components/Docs'
import { FrontPanel } from './components/FrontPanel'
import { Header } from './components/Header'
import { MemoryGrid } from './components/MemoryGrid'
import { fileActions } from './core/fileActions'
import { actions, getState } from './core/sim'
import { getSettings, updateSettings, ZOOM_MAX, ZOOM_MIN } from './settings'

export default function App() {
  const [aboutOpen, setAboutOpen] = useState(false)
  useHotkeys(aboutOpen, setAboutOpen)

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1480px] flex-col gap-5 px-4 py-5 lg:px-8">
      <Header aboutOpen={aboutOpen} setAboutOpen={setAboutOpen} />
      <FrontPanel />
      <NoticeBar />
      <main className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <MemoryGrid />
        <aside className="flex flex-col gap-5">
          <ComputerScreen />
          <InfoWindow />
          <CommandSystem />
          <KeyboardHelp />
        </aside>
      </main>
    </div>
  )
}

/** Розкладка клавіш оригіналу: F2–F6 / E T S R L, 0/1, стрілки, +/−. */
function useHotkeys(aboutOpen: boolean, setAboutOpen: (v: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (aboutOpen || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (document.querySelector('[role="menu"]')) return

      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (e.ctrlKey || e.metaKey) {
        if (key === 'o') fileActions.open()
        else if (key === 's') fileActions.save()
        else return
        e.preventDefault()
        return
      }

      const editing = getState().snap.mode === 'Editing'
      const { zoom, lang, speed } = getSettings()
      // Латинська й кирилична розкладки (e/у, t/е, s/і, r/к, l/д).
      const handlers: Record<string, () => void> = {
        F1: () => setAboutOpen(true),
        F2: actions.edit,
        e: actions.edit,
        у: actions.edit,
        F3: actions.takt,
        t: actions.takt,
        е: actions.takt,
        F4: actions.step,
        s: actions.step,
        і: actions.step,
        ы: actions.step,
        F5: () => actions.run(speed),
        r: () => actions.run(speed),
        к: () => actions.run(speed),
        F6: () => updateSettings({ lang: lang === 'uk' ? 'en' : 'uk' }),
        l: () => updateSettings({ lang: lang === 'uk' ? 'en' : 'uk' }),
        д: () => updateSettings({ lang: lang === 'uk' ? 'en' : 'uk' }),
        '+': () => updateSettings({ zoom: Math.min(ZOOM_MAX, zoom + 10) }),
        '=': () => updateSettings({ zoom: Math.min(ZOOM_MAX, zoom + 10) }),
        '-': () => updateSettings({ zoom: Math.max(ZOOM_MIN, zoom - 10) }),
      }
      if (editing) {
        Object.assign(handlers, {
          '0': () => actions.writeBit(false),
          '1': () => actions.writeBit(true),
          ArrowLeft: () => actions.moveCursor('left'),
          ArrowRight: () => actions.moveCursor('right'),
          ArrowUp: () => actions.moveCursor('up'),
          ArrowDown: () => actions.moveCursor('down'),
          Enter: () => actions.moveCursor('newline'),
          Home: () => actions.moveCursor('home'),
          End: () => actions.moveCursor('end'),
        })
      }
      const handler = handlers[key]
      if (!handler) return
      // Кнопка після кліку лишається у фокусі; не даємо Enter натиснути її знову.
      if (key === 'Enter' && target?.tagName === 'BUTTON') (target as HTMLButtonElement).blur()
      e.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aboutOpen, setAboutOpen])
}
