import type { Mode, SimError, Takt } from '@/core/sim'

export type Lang = 'uk' | 'en'

// Рядки з позначкою «ориг.» взято з оригінального бінарника
// MicrocontrollerSimulator64 (друкарські помилки англійських оригіналів виправлено).
const uk = {
  appTitle: 'Симулятор мікроконтролера',
  model: 'ЕОМ-15',
  appSubtitle: 'Система команд CISC, архітектура фон Неймана', // ориг. (скорочено)
  department: 'Кафедра ЕОМ, ІКТА, НУ «Львівська політехніка»', // ориг.

  // Передня панель
  panelRegisters: 'Регістри',
  panelStatus: 'Стан процесора', // ориг.
  panelSequencer: 'Такти команди',
  panelSwitches: 'Пульт введення',
  panelControl: 'Керування',
  switchAddress: 'Адреса',
  switchData: 'Дані',
  switchesLocked: 'Пульт працює в режимі редагування (F2)',
  lampStandby: 'Очікування', // ориг.
  lampRun: 'Виконання',
  lampStop: 'Стоп', // ориг.
  lampFault: 'Збій',
  lampReady: 'Готово',
  instructionRegister: 'Регістр команд',
  programCounter: 'Адреса команди', // ориг.

  memory: "Пам'ять ОЕМ", // ориг.
  bus: 'Шина',
  busFetch: 'вибірка команди',
  busRead: 'читання',
  busWrite: 'запис',
  addr: 'Адр', // ориг.
  asInstruction: 'Як команда',
  asNumber: 'Як число',

  info: 'Інформаційне вікно', // ориг.
  cell: "Комірка пам'яті", // ориг.
  processorCommand: 'Команда процесора', // ориг.
  processorTakt: 'Такт процесора', // ориг.
  operands: 'Операнди, значення', // ориг.
  value: 'Значення',

  screen: 'Екран ЕОМ', // ориг.
  screenEmpty: 'Екран вмикає команда 111 (Стоп, друк).',
  commandSystem: 'Система команд', // ориг.
  keyboard: 'Клавіатура', // ориг.

  edit: 'Редактор',
  takt: 'Такт', // ориг.
  step: 'Крок', // ориг.
  run: 'Пуск', // ориг.
  pause: 'Пауза',
  speed: 'Швидкість',
  instant: 'миттєво',
  taktsPerSec: 'такт/с',

  ready: 'Програма готова до запуску.',
  notReady: 'Запуск заблоковано: програма не доходить до команди STOP.',
  finished: 'Виконання завершено. Натисніть F2, щоб почати знову.',
  counters: (t: number, i: number) => `тактів ${t}, команд ${i}`,
  overflowBadge: '>15 біт',
  overflowHint: 'Значення не вміщається в 15 біт. Як і в оригіналі, воно зберігається повністю.',

  file: 'Файл',
  new: 'Новий',
  open: 'Відкрити…',
  save: 'Зберегти…',
  examples: 'Приклади',
  exManual: 'Приклад з методички: 17 + 23',
  exVariant1: 'Варіант 1: Y = A + B + C',
  exLoop: 'Цикл: 5 + 4 + 3 + 2 + 1',
  about: 'Про програму',
  language: 'English',
  themeLight: 'Світла тема',
  themeDark: 'Темна тема',
  zoomIn: 'Збільшити',
  zoomOut: 'Зменшити',

  loadError: (e: string) => `Не вдалося відкрити файл: ${e}`,
  saved: 'Файл збережено',
  aboutText:
    'Кросплатформна версія навчального симулятора до лабораторної роботи №1 з курсу «Архітектура комп’ютерів». Поведінку ядра відтворено з оригінальної програми MicrocontrollerSimulator64 (автор оригіналу Бойко Г. В., кафедра ЕОМ, НУ «Львівська політехніка»).',
  aboutFormat: 'Файли програм .txt сумісні з оригіналом.',
  close: 'Закрити',

  kbd: [
    ['F2, E', 'Редактор'],
    ['F3, T', 'Такт: одна мікрооперація'],
    ['F4, S', 'Крок: одна команда'],
    ['F5, R', 'Пуск або пауза'],
    ['F6, L', 'English'],
    ['0 / 1', 'Записати біт під курсором'],
    ['← ↑ → ↓, Enter', 'Рух курсора'],
    ['Ctrl + O / S', 'Відкрити, зберегти'],
    ['+ / −', 'Масштаб'],
  ] as [string, string][],

  modes: {
    Stop: 'Режим: Зупинка',
    Editing: 'Режим: Редагування',
    Takt: 'Режим: Такт',
    Step: 'Режим: Крок',
    Run: 'Режим: Виконання',
  } satisfies Record<Mode, string>, // ориг.

  takts: {
    Standby: 'Очікування',
    Stop: 'Стоп',
    GetCommand: 'Вичитування команди',
    GetR0: 'Вичитування R0',
    GetR1: 'Вичитування R1',
    GetR2: 'Вичитування R2',
    SetR2: 'Збереження R2',
    Mov: 'R2 = R0',
    Add: 'R2 = R0 + R1',
    AbsSub: 'R2 = |R0 − R1|',
    Mul: 'R2 = R0 * R1',
    Div: 'R2 = R0 / R1',
    Compare: 'R0 <> R1',
    PcInc: 'PC++',
    PcJump: 'PC = A2',
  } satisfies Record<Takt, string>, // ориг.

  commands: [
    '[A2] = [A0]',
    '[A2] = [A0] + [A1]',
    '[A2] = [A0] / [A1]',
    '[A2] = |[A0] − [A1]|',
    'при ([A0] == [A1]) на A2',
    '[A2] = [A0] * [A1]',
    'при ([A0] > [A1]) на A2',
    'Стоп, друк',
  ], // ориг.

  errors: {
    PcOverflow: 'Переповнення лічильника команд: програма вийшла за межі пам’яті.',
    DivisionByZero: 'Ділення на нуль. Оригінальна програма в цьому місці аварійно завершується.',
    RunLimit: 'Виконано 10 000 команд без STOP. Схоже на нескінченний цикл.',
  } satisfies Record<SimError, string>,
}

export type Dict = typeof uk

const en: Dict = {
  appTitle: 'Microcontroller Simulator',
  model: 'EOM-15',
  appSubtitle: 'CISC instruction set, von Neumann architecture',
  department: 'Department of Computer Science, IKTA, Lviv Polytechnic University',

  panelRegisters: 'Registers',
  panelStatus: 'Processor status',
  panelSequencer: 'Instruction takts',
  panelSwitches: 'Switch register',
  panelControl: 'Control',
  switchAddress: 'Address',
  switchData: 'Data',
  switchesLocked: 'Switches work in edit mode (F2)',
  lampStandby: 'Standby',
  lampRun: 'Run',
  lampStop: 'Stop',
  lampFault: 'Fault',
  lampReady: 'Ready',
  instructionRegister: 'Instruction register',
  programCounter: 'Program counter',

  memory: 'Computer memory',
  bus: 'Bus',
  busFetch: 'instruction fetch',
  busRead: 'read',
  busWrite: 'write',
  addr: 'Addr',
  asInstruction: 'As instruction',
  asNumber: 'As number',

  info: 'Information window',
  cell: 'Cell',
  processorCommand: 'Processor command',
  processorTakt: 'Processor takt',
  operands: 'Operands, values',
  value: 'Value',

  screen: 'Computer screen',
  screenEmpty: 'The screen is turned on by instruction 111 (Stop, Print).',
  commandSystem: 'Command system',
  keyboard: 'Keyboard',

  edit: 'Edit',
  takt: 'Takt',
  step: 'Step',
  run: 'Run',
  pause: 'Pause',
  speed: 'Speed',
  instant: 'instant',
  taktsPerSec: 'takts/s',

  ready: 'The program is ready to run.',
  notReady: 'Execution is locked: the program never reaches STOP.',
  finished: 'Execution finished. Press F2 to start over.',
  counters: (t, i) => `${t} takts, ${i} instructions`,
  overflowBadge: '>15 bit',
  overflowHint: 'The value does not fit in 15 bits. As in the original, it is kept in full.',

  file: 'File',
  new: 'New',
  open: 'Open…',
  save: 'Save…',
  examples: 'Examples',
  exManual: 'Lab manual example: 17 + 23',
  exVariant1: 'Variant 1: Y = A + B + C',
  exLoop: 'Loop: 5 + 4 + 3 + 2 + 1',
  about: 'About',
  language: 'Українська',
  themeLight: 'Light theme',
  themeDark: 'Dark theme',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',

  loadError: (e) => `Could not open the file: ${e}`,
  saved: 'File saved',
  aboutText:
    'A cross-platform version of the teaching simulator for lab 1 of the Computer Architecture course. The core reproduces the original MicrocontrollerSimulator64 (original author H. V. Boyko, Department of Computer Science, Lviv Polytechnic).',
  aboutFormat: 'Program .txt files are compatible with the original.',
  close: 'Close',

  kbd: [
    ['F2, E', 'Edit'],
    ['F3, T', 'Takt: one micro-operation'],
    ['F4, S', 'Step: one instruction'],
    ['F5, R', 'Run or pause'],
    ['F6, L', 'Українська'],
    ['0 / 1', 'Write the bit under the cursor'],
    ['← ↑ → ↓, Enter', 'Move the cursor'],
    ['Ctrl + O / S', 'Open, save'],
    ['+ / −', 'Zoom'],
  ],

  modes: {
    Stop: 'Mode: Stop',
    Editing: 'Mode: Editing',
    Takt: 'Mode: Takt',
    Step: 'Mode: Step',
    Run: 'Mode: Run',
  },

  takts: {
    Standby: 'Standby',
    Stop: 'Stop',
    GetCommand: 'Get command',
    GetR0: 'Get R0',
    GetR1: 'Get R1',
    GetR2: 'Get R2',
    SetR2: 'Set R2',
    Mov: 'R2 = R0',
    Add: 'R2 = R0 + R1',
    AbsSub: 'R2 = |R0 − R1|',
    Mul: 'R2 = R0 * R1',
    Div: 'R2 = R0 / R1',
    Compare: 'R0 <> R1',
    PcInc: 'PC++',
    PcJump: 'PC = A2',
  },

  commands: [
    '[A2] = [A0]',
    '[A2] = [A0] + [A1]',
    '[A2] = [A0] / [A1]',
    '[A2] = |[A0] − [A1]|',
    'if ([A0] == [A1]) goto A2',
    '[A2] = [A0] * [A1]',
    'if ([A0] > [A1]) goto A2',
    'Stop, Print',
  ],

  errors: {
    PcOverflow: 'Program counter overflow: execution ran past the end of memory.',
    DivisionByZero: 'Division by zero. The original program crashes here.',
    RunLimit: '10,000 instructions executed without STOP. This looks like an infinite loop.',
  },
}

export const dictionaries: Record<Lang, Dict> = { uk, en }

/** Мнемоніки для стовпця дизасемблера (методичка називає лише ADD і STOP). */
export const MNEMONICS = ['MOV', 'ADD', 'DIV', 'SUB', 'JE', 'MUL', 'JG', 'STOP'] as const
