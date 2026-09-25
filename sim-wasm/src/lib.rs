//! WebAssembly-обгортка над [`sim_core::Machine`].
//!
//! Методи виконання повертають `undefined` у разі успіху або код помилки
//! (`"PcOverflow"`, `"DivisionByZero"`, `"RunLimit"`), тож інтерфейсу не
//! доводиться перехоплювати винятки для очікуваних збоїв машини.

use sim_core::{format_text, parse_text, Machine, Mode, SimError, MEM_SIZE};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Simulator {
    m: Machine,
}

fn code(r: Result<(), SimError>) -> Option<String> {
    r.err().map(|e| format!("{e:?}"))
}

#[wasm_bindgen]
impl Simulator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Simulator {
        Simulator { m: Machine::new() }
    }

    /// Повний стан машини як звичайний JS-об'єкт (див. `Snapshot` у sim-core).
    pub fn snapshot(&self) -> Result<JsValue, JsError> {
        Ok(serde_wasm_bindgen::to_value(&self.m.snapshot())?)
    }

    pub fn edit(&mut self) {
        self.m.edit();
    }
    pub fn takt(&mut self) -> Option<String> {
        code(self.m.takt())
    }
    pub fn step(&mut self) -> Option<String> {
        code(self.m.step())
    }
    pub fn run(&mut self, max_instructions: u32) -> Option<String> {
        code(self.m.run(max_instructions as u64))
    }
    /// Позначає машину як запущену без виконання (анімований запуск).
    #[wasm_bindgen(js_name = setRunMode)]
    pub fn set_run_mode(&mut self) {
        self.m.set_mode(Mode::Run);
    }

    /// Очищає пам'ять і скидає процесор (Файл → Новий).
    pub fn clear(&mut self) {
        self.m.load([0; MEM_SIZE]);
    }
    #[wasm_bindgen(js_name = setCell)]
    pub fn set_cell(&mut self, addr: u8, value: i32) {
        self.m.set_cell(addr as usize, value);
    }
    /// Замінює всю пам'ять (16 значень) і скидає процесор.
    #[wasm_bindgen(js_name = loadMemory)]
    pub fn load_memory(&mut self, values: &[i32]) -> Result<(), JsError> {
        let mem: [i32; MEM_SIZE] = values.try_into().map_err(|_| JsError::new("expected 16 memory cells"))?;
        self.m.load(mem);
        Ok(())
    }

    /// Розбирає файл проєкту; на некоректних даних кидає виняток.
    #[wasm_bindgen(js_name = loadText)]
    pub fn load_text(&mut self, bytes: &[u8]) -> Result<(), JsError> {
        let mem = parse_text(bytes)?;
        self.m.load(mem);
        Ok(())
    }
    #[wasm_bindgen(js_name = toText)]
    pub fn to_text(&self) -> String {
        format_text(self.m.memory())
    }

    #[wasm_bindgen(js_name = writeBit)]
    pub fn write_bit(&mut self, value: bool) -> bool {
        self.m.write_bit(value)
    }
    #[wasm_bindgen(js_name = toggleBit)]
    pub fn toggle_bit(&mut self, row: u8, bit: u8) -> bool {
        self.m.toggle_bit(row, bit)
    }
    #[wasm_bindgen(js_name = setCursor)]
    pub fn set_cursor(&mut self, row: u8, bit: u8) {
        self.m.set_cursor(row, bit);
    }
    /// Переміщує курсор редагування: `left`, `right`, `up`, `down`, `newline`, `home`, `end`.
    #[wasm_bindgen(js_name = moveCursor)]
    pub fn move_cursor(&mut self, dir: &str) {
        match dir {
            "left" => self.m.cursor_left(),
            "right" => self.m.cursor_right(),
            "up" => self.m.cursor_up(),
            "down" => self.m.cursor_down(),
            "newline" => self.m.cursor_newline(),
            "home" => self.m.cursor_home(),
            "end" => self.m.cursor_end(),
            _ => {}
        }
    }
}

impl Default for Simulator {
    fn default() -> Self {
        Self::new()
    }
}
