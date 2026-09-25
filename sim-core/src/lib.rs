//! Ядро симулятора 15-бітного мікроконтролера з архітектурою фон Неймана.
//!
//! Поведінка точно відтворює оригінальну програму `MicrocontrollerSimulator64`
//! (кафедра ЕОМ, ІКТА, НУ «Львівська політехніка»), відновлену декомпіляцією
//! Win32-бінарника:
//!
//! * 16 комірок пам'яті, кожна зберігає `i32` (оригінал не обрізає результати
//!   арифметики до 15 біт; це роблять лише бітова сітка та формат файлу).
//! * Слово команди `OOO AAAA AAAA AAAA` = код операції, A0, A1, A2.
//! * Кожна команда виконується як послідовність мікрооперацій («тактів»);
//!   див. [`micro_sequence`].

mod check;
mod machine;
mod text;

pub use check::check_program;
pub use machine::{Access, AccessKind, Machine, Mode, SimError, Snapshot};
pub use text::{format_text, parse_text, ParseError, MAX_FILE_SIZE};

/// Кількість комірок пам'яті (адреси `0000`..`1111`).
pub const MEM_SIZE: usize = 16;
/// Кількість видимих бітів комірки пам'яті.
pub const WORD_BITS: u32 = 15;
/// Маска видимих 15 біт.
pub const WORD_MASK: i32 = 0x7FFF;

/// Код операції (`KKK`) слова команди.
pub fn opcode(word: i32) -> u8 {
    ((word >> 12) & 7) as u8
}
/// Адреса першого операнда.
pub fn a0(word: i32) -> u8 {
    ((word >> 8) & 0xF) as u8
}
/// Адреса другого операнда.
pub fn a1(word: i32) -> u8 {
    ((word >> 4) & 0xF) as u8
}
/// Адреса результату (або ціль переходу).
pub fn a2(word: i32) -> u8 {
    (word & 0xF) as u8
}
/// Збирає слово команди з полів.
pub fn encode(op: u8, a0: u8, a1: u8, a2: u8) -> i32 {
    ((op as i32 & 7) << 12) | ((a0 as i32 & 0xF) << 8) | ((a1 as i32 & 0xF) << 4) | (a2 as i32 & 0xF)
}

/// Коди операцій системи команд.
pub mod op {
    /// `[A2] = [A0]`
    pub const MOV: u8 = 0b000;
    /// `[A2] = [A0] + [A1]`
    pub const ADD: u8 = 0b001;
    /// `[A2] = [A0] / [A1]`
    pub const DIV: u8 = 0b010;
    /// `[A2] = |[A0] - [A1]|`
    pub const SUB: u8 = 0b011;
    /// `якщо [A0] == [A1], перейти на A2`
    pub const JE: u8 = 0b100;
    /// `[A2] = [A0] * [A1]`
    pub const MUL: u8 = 0b101;
    /// `якщо [A0] > [A1], перейти на A2`
    pub const JG: u8 = 0b110;
    /// Зупинка, вивід A0/A1/A2 та їхніх значень.
    pub const STOP: u8 = 0b111;
}

/// Мітки мікрооперацій. Дискримінанти збігаються з таблицею міток
/// оригінального бінарника (`Stendby`, `Stop`, `Get command`, ...), тому
/// водночас слугують індексами в таблицях рядків інтерфейсу.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
#[repr(u8)]
pub enum Takt {
    Standby = 0,
    Stop = 1,
    GetCommand = 2,
    GetR0 = 3,
    GetR1 = 4,
    GetR2 = 5,
    SetR2 = 6,
    Mov = 7,
    Add = 8,
    AbsSub = 9,
    Mul = 10,
    Div = 11,
    Compare = 12,
    PcInc = 13,
    PcJump = 14,
}

/// Послідовність мікрооперацій команди, включно з тактом вибірки.
///
/// Для умовних переходів останній такт залежить від результату порівняння.
/// Поки результат невідомий, передавайте `None`: тоді останнім тактом
/// стоїть `PcInc`.
pub fn micro_sequence(op: u8, jump_taken: Option<bool>) -> &'static [Takt] {
    use Takt::*;
    match op & 7 {
        op::MOV => &[GetCommand, GetR0, Mov, SetR2, PcInc],
        op::ADD => &[GetCommand, GetR0, GetR1, Add, SetR2, PcInc],
        op::DIV => &[GetCommand, GetR0, GetR1, Div, SetR2, PcInc],
        op::SUB => &[GetCommand, GetR0, GetR1, AbsSub, SetR2, PcInc],
        op::MUL => &[GetCommand, GetR0, GetR1, Mul, SetR2, PcInc],
        op::JE | op::JG => match jump_taken {
            Some(true) => &[GetCommand, GetR0, GetR1, Compare, PcJump],
            _ => &[GetCommand, GetR0, GetR1, Compare, PcInc],
        },
        _ => &[GetCommand, GetR0, GetR1, GetR2, Stop],
    }
}
