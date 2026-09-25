import { dictionaries } from '@/i18n'
import { openProjectFile, saveProjectFile } from '@/platform/files'
import { getSettings } from '@/settings'
import { examples, type ExampleId } from './examples'
import { actions, notify } from './sim'

let fileName = 'program.txt'

const t = () => dictionaries[getSettings().lang]

export const fileActions = {
  newProgram() {
    fileName = 'program.txt'
    actions.clear()
  },
  loadExample(id: ExampleId) {
    fileName = `${id}.txt`
    actions.loadMemory([...examples[id]])
  },
  async open() {
    try {
      const file = await openProjectFile()
      if (!file) return
      actions.loadText(file.bytes)
      fileName = file.name
      notify({ kind: 'info', text: file.name })
    } catch (e) {
      notify({ kind: 'error', text: t().loadError(e instanceof Error ? e.message : String(e)) })
    }
  },
  async save() {
    try {
      const name = await saveProjectFile(actions.toText(), fileName)
      if (!name) return
      fileName = name
      notify({ kind: 'info', text: `${t().saved}: ${name}` })
    } catch (e) {
      notify({ kind: 'error', text: String(e) })
    }
  },
}
