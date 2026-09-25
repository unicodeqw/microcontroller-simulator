/**
 * Доступ до файлів, що працює і в Tauri (нативні діалоги), і у звичайному
 * браузері (file input + завантаження / File System Access API).
 */

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const FILTER_NAME = 'Simulator Project Files'

export interface OpenedFile {
  name: string
  bytes: Uint8Array
}

export async function openProjectFile(): Promise<OpenedFile | null> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const path = await open({ multiple: false, directory: false, filters: [{ name: FILTER_NAME, extensions: ['txt'] }] })
    if (!path) return null
    return { name: baseName(path), bytes: await readFile(path) }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,text/plain'
    input.onchange = async () => {
      const file = input.files?.[0]
      resolve(file ? { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) } : null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/** Повертає ім'я збереженого файлу або null, якщо користувач скасував. */
export async function saveProjectFile(text: string, suggestedName: string): Promise<string | null> {
  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    const path = await save({ defaultPath: suggestedName, filters: [{ name: FILTER_NAME, extensions: ['txt'] }] })
    if (!path) return null
    await writeTextFile(path, text)
    return baseName(path)
  }

  const picker = (window as unknown as { showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle> })
    .showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [{ description: FILTER_NAME, accept: { 'text/plain': ['.txt'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
      return handle.name
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return null
      throw e
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return suggestedName
}

function baseName(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}
