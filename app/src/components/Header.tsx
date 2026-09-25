import { fileActions } from '@/core/fileActions'
import type { ExampleId } from '@/core/examples'
import { updateSettings, useSettings, ZOOM_MAX, ZOOM_MIN } from '@/settings'
import { ChevronDown, Minus, Moon, Plus, Sun, X } from 'lucide-react'
import { Dialog, DropdownMenu } from 'radix-ui'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useT } from './format'
import { cn } from './styles'

const menuItem =
  'flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-[0.95rem] outline-none select-none data-[highlighted]:bg-page'

function TextButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-[0.95rem] text-ink-2 hover:bg-sheet hover:text-ink',
        className,
      )}
      {...props}
    />
  )
}

export function Header({ aboutOpen, setAboutOpen }: { aboutOpen: boolean; setAboutOpen: (v: boolean) => void }) {
  const t = useT()
  const { lang, theme, zoom } = useSettings()

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex min-w-0 items-center gap-4">
        {/* Шильдик моделі, як на корпусі ЕОМ. */}
        <span className="machine shrink-0 px-2.5 py-1.5 font-silk text-sm font-semibold tracking-[0.12em] text-silk">{t.model}</span>
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold">{t.appTitle}</h1>
          <p className="truncate text-sm text-ink-2">
            {t.appSubtitle}. {t.department}
          </p>
        </div>
      </div>

      <nav className="ml-auto flex flex-wrap items-center gap-1">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <TextButton>
              {t.file}
              <ChevronDown className="size-4" />
            </TextButton>
          </DropdownMenu.Trigger>
          <MenuContent>
            <DropdownMenu.Item className={menuItem} onSelect={fileActions.newProgram}>
              {t.new}
            </DropdownMenu.Item>
            <DropdownMenu.Item className={menuItem} onSelect={fileActions.open}>
              {t.open} <Shortcut>Ctrl O</Shortcut>
            </DropdownMenu.Item>
            <DropdownMenu.Item className={menuItem} onSelect={fileActions.save}>
              {t.save} <Shortcut>Ctrl S</Shortcut>
            </DropdownMenu.Item>
          </MenuContent>
        </DropdownMenu.Root>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <TextButton>
              {t.examples}
              <ChevronDown className="size-4" />
            </TextButton>
          </DropdownMenu.Trigger>
          <MenuContent>
            {(
              [
                ['manual', t.exManual],
                ['variant1', t.exVariant1],
                ['loop', t.exLoop],
              ] as [ExampleId, string][]
            ).map(([id, label]) => (
              <DropdownMenu.Item key={id} className={menuItem} onSelect={() => fileActions.loadExample(id)}>
                {label}
              </DropdownMenu.Item>
            ))}
          </MenuContent>
        </DropdownMenu.Root>

        <TextButton onClick={() => setAboutOpen(true)} title="F1">
          {t.about}
        </TextButton>

        <span className="mx-1 h-5 w-px bg-rule" aria-hidden />

        <TextButton
          className="w-9 justify-center px-0"
          aria-label={t.zoomOut}
          title={t.zoomOut}
          onClick={() => updateSettings({ zoom: Math.max(ZOOM_MIN, zoom - 10) })}
        >
          <Minus className="size-4" />
        </TextButton>
        <span className="w-11 text-center font-mono text-sm text-ink-2 tabular">{zoom}%</span>
        <TextButton
          className="w-9 justify-center px-0"
          aria-label={t.zoomIn}
          title={t.zoomIn}
          onClick={() => updateSettings({ zoom: Math.min(ZOOM_MAX, zoom + 10) })}
        >
          <Plus className="size-4" />
        </TextButton>
        <TextButton
          className="w-9 justify-center px-0"
          aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
          title={theme === 'dark' ? t.themeLight : t.themeDark}
          onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </TextButton>
        <TextButton title="F6" onClick={() => updateSettings({ lang: lang === 'uk' ? 'en' : 'uk' })}>
          {t.language}
        </TextButton>
      </nav>

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </header>
  )
}

function MenuContent({ children }: { children: ReactNode }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="start"
        sideOffset={4}
        className="z-50 min-w-64 rounded-md border border-rule bg-sheet p-1 text-ink shadow-[0_8px_24px_oklch(0_0_0/0.18)]"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

function Shortcut({ children }: { children: ReactNode }) {
  return <span className="ml-auto font-mono text-xs text-ink-2">{children}</span>
}

function AboutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT()
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2',
            'rounded-md bg-sheet p-6 text-ink shadow-[0_12px_40px_oklch(0_0_0/0.3)]',
          )}
        >
          <div className="mb-4 flex items-start gap-4">
            <span className="machine px-2.5 py-1.5 font-silk text-sm font-semibold tracking-[0.12em] text-silk">{t.model}</span>
            <div className="flex-1">
              <Dialog.Title className="text-lg font-semibold">{t.appTitle}</Dialog.Title>
              <p className="text-sm text-ink-2">v{__APP_VERSION__}</p>
            </div>
            <Dialog.Close asChild>
              <TextButton className="w-9 justify-center px-0" aria-label={t.close}>
                <X className="size-4" />
              </TextButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className="leading-relaxed">{t.aboutText}</Dialog.Description>
          <p className="mt-3 text-ink-2">{t.aboutFormat}</p>
          <p className="mt-3 text-sm text-ink-2">{t.department}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
