use crate::{a0, a1, a2, check_program, micro_sequence, op, opcode, Takt, MEM_SIZE, WORD_BITS};
use std::fmt;

/// Режим інтерфейсу (в оригіналі `dword_14000C304`).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
pub enum Mode {
    Stop = 0,
    Editing = 1,
    Takt = 2,
    Step = 3,
    Run = 4,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
pub enum SimError {
    /// Лічильник команд вийшов за межі 16 комірок пам'яті.
    PcOverflow,
    /// `[A1]` дорівнює нулю в команді DIV (оригінал тут аварійно завершується).
    DivisionByZero,
    /// `run` досяг ліміту команд (імовірно, нескінченний цикл).
    RunLimit,
}

impl fmt::Display for SimError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            SimError::PcOverflow => "program counter overflow",
            SimError::DivisionByZero => "division by zero",
            SimError::RunLimit => "instruction limit reached",
        })
    }
}

impl std::error::Error for SimError {}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
pub enum AccessKind {
    Fetch,
    Read,
    Write,
}

/// Звернення до пам'яті в останньому такті (для підсвічування в інтерфейсі).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct Access {
    pub kind: AccessKind,
    pub addr: u8,
}

/// Повний знімок стану машини у зручному для інтерфейсу вигляді.
#[derive(Clone, Debug, PartialEq)]
#[cfg_attr(feature = "serde", derive(serde::Serialize))]
#[cfg_attr(feature = "serde", serde(rename_all = "camelCase"))]
pub struct Snapshot {
    pub mem: [i32; MEM_SIZE],
    pub mode: Mode,
    pub pc: u8,
    pub ir: i32,
    pub op: u8,
    pub r0: i32,
    pub r1: i32,
    pub r2: i32,
    /// Індекс наступного такту в `sequence`.
    pub phase: u8,
    /// Останній виконаний такт.
    pub takt: Takt,
    /// Мікрооперації поточної команди.
    pub sequence: Vec<Takt>,
    /// Команду з `sequence` завершено (тоді `phase` дорівнює 0).
    pub instr_done: bool,
    pub jump_taken: Option<bool>,
    pub halted: bool,
    /// Екран ЕОМ увімкнено (вмикає STOP).
    pub printed: bool,
    pub standby: bool,
    pub error: Option<SimError>,
    pub access: Option<Access>,
    /// Такт/Крок/Пуск дозволені.
    pub can_execute: bool,
    pub cursor_row: u8,
    pub cursor_bit: u8,
    pub takts: u64,
    pub instructions: u64,
}

#[derive(Clone, Debug)]
pub struct Machine {
    mem: [i32; MEM_SIZE],
    mode: Mode,
    pc: u8,
    ir: i32,
    op: u8,
    r0: i32,
    r1: i32,
    r2: i32,
    phase: u8,
    takt: Takt,
    jump_taken: Option<bool>,
    halted: bool,
    printed: bool,
    standby: bool,
    instr_done: bool,
    error: Option<SimError>,
    access: Option<Access>,
    cursor_row: u8,
    cursor_bit: u8,
    takts: u64,
    instructions: u64,
}

impl Default for Machine {
    fn default() -> Self {
        Self::new()
    }
}

impl Machine {
    pub fn new() -> Self {
        let mut m = Machine {
            mem: [0; MEM_SIZE],
            mode: Mode::Editing,
            pc: 0,
            ir: 0,
            op: 0,
            r0: 0,
            r1: 0,
            r2: 0,
            phase: 0,
            takt: Takt::Standby,
            jump_taken: None,
            halted: false,
            printed: false,
            standby: true,
            instr_done: false,
            error: None,
            access: None,
            cursor_row: 0,
            cursor_bit: 0,
            takts: 0,
            instructions: 0,
        };
        m.reset_cpu();
        m
    }

    /// Скидає процесор, не чіпаючи пам'ять (оригінальна `sOnStartSimulator`).
    pub fn reset_cpu(&mut self) {
        self.pc = 0;
        self.ir = 0;
        self.op = 0;
        self.r0 = 0;
        self.r1 = 0;
        self.r2 = 0;
        self.phase = 0;
        self.takt = Takt::Standby;
        self.jump_taken = None;
        self.halted = false;
        self.printed = false;
        self.standby = true;
        self.instr_done = false;
        self.error = None;
        self.access = None;
        self.takts = 0;
        self.instructions = 0;
    }

    pub fn memory(&self) -> &[i32; MEM_SIZE] {
        &self.mem
    }

    /// Замінює пам'ять (Файл → Відкрити / Новий) і скидає процесор.
    pub fn load(&mut self, mem: [i32; MEM_SIZE]) {
        self.mem = mem;
        self.reset_cpu();
    }

    pub fn set_cell(&mut self, addr: usize, value: i32) {
        self.mem[addr % MEM_SIZE] = value;
    }

    pub fn mode(&self) -> Mode {
        self.mode
    }
    pub fn pc(&self) -> u8 {
        self.pc
    }
    pub fn registers(&self) -> (i32, i32, i32) {
        (self.r0, self.r1, self.r2)
    }
    pub fn halted(&self) -> bool {
        self.halted
    }
    pub fn error(&self) -> Option<SimError> {
        self.error
    }
    pub fn current_takt(&self) -> Takt {
        self.takt
    }

    /// Чи дозволені Такт/Крок/Пуск (оригінальна `sOnCheck`).
    pub fn can_execute(&self) -> bool {
        !self.halted && self.error.is_none() && check_program(&self.mem)
    }

    pub fn snapshot(&self) -> Snapshot {
        Snapshot {
            mem: self.mem,
            mode: self.mode,
            pc: self.pc,
            ir: self.ir,
            op: self.op,
            r0: self.r0,
            r1: self.r1,
            r2: self.r2,
            phase: self.phase,
            takt: self.takt,
            sequence: if self.takts == 0 {
                Vec::new()
            } else {
                micro_sequence(self.op, self.jump_taken).to_vec()
            },
            instr_done: self.instr_done,
            jump_taken: self.jump_taken,
            halted: self.halted,
            printed: self.printed,
            standby: self.standby,
            error: self.error,
            access: self.access,
            can_execute: self.can_execute(),
            cursor_row: self.cursor_row,
            cursor_bit: self.cursor_bit,
            takts: self.takts,
            instructions: self.instructions,
        }
    }

    // ---- редагування -------------------------------------------------------

    /// Вмикає режим редагування (F2 / E) і скидає процесор.
    pub fn edit(&mut self) {
        self.mode = Mode::Editing;
        self.reset_cpu();
    }

    pub fn cursor(&self) -> (u8, u8) {
        (self.cursor_row, self.cursor_bit)
    }

    pub fn set_cursor(&mut self, row: u8, bit: u8) {
        self.cursor_row = row & 0xF;
        self.cursor_bit = bit.min(WORD_BITS as u8 - 1);
    }

    /// Записує біт під курсором і зсуває курсор (клавіші `0` / `1`).
    /// Поза режимом редагування повертає `false`.
    pub fn write_bit(&mut self, value: bool) -> bool {
        if self.mode != Mode::Editing {
            return false;
        }
        let mask = 0x4000 >> self.cursor_bit;
        let cell = &mut self.mem[self.cursor_row as usize];
        if value {
            *cell |= mask;
        } else {
            *cell &= !mask;
        }
        self.cursor_bit += 1;
        if self.cursor_bit >= WORD_BITS as u8 {
            self.cursor_bit = 0;
            self.cursor_row = (self.cursor_row + 1) & 0xF;
        }
        true
    }

    /// Перемикає один біт (клік мишею в новому інтерфейсі).
    pub fn toggle_bit(&mut self, row: u8, bit: u8) -> bool {
        if self.mode != Mode::Editing || bit as u32 >= WORD_BITS {
            return false;
        }
        self.set_cursor(row, bit);
        self.mem[(row & 0xF) as usize] ^= 0x4000 >> bit;
        true
    }

    pub fn cursor_left(&mut self) {
        self.cursor_bit = self.cursor_bit.saturating_sub(1);
    }
    pub fn cursor_right(&mut self) {
        self.cursor_bit = (self.cursor_bit + 1).min(WORD_BITS as u8 - 1);
    }
    pub fn cursor_up(&mut self) {
        self.cursor_row = self.cursor_row.wrapping_sub(1) & 0xF;
    }
    pub fn cursor_down(&mut self) {
        self.cursor_row = (self.cursor_row + 1) & 0xF;
    }
    /// Enter: перший біт наступного рядка.
    pub fn cursor_newline(&mut self) {
        self.cursor_bit = 0;
        self.cursor_down();
    }
    pub fn cursor_home(&mut self) {
        self.set_cursor(0, 0);
    }
    pub fn cursor_end(&mut self) {
        self.set_cursor(15, WORD_BITS as u8 - 1);
    }

    // ---- виконання -----------------------------------------------------

    /// Виконує одну мікрооперацію (кнопка Такт, F3 / T).
    pub fn takt(&mut self) -> Result<(), SimError> {
        self.mode = Mode::Takt;
        self.exec_takt()
    }

    /// Виконує решту поточної команди (кнопка Крок, F4 / S).
    pub fn step(&mut self) -> Result<(), SimError> {
        self.mode = Mode::Step;
        self.exec_step()
    }

    /// Виконує програму до STOP (кнопка Пуск, F5 / R). Оригінал не має ліміту
    /// й зависає на нескінченних циклах; тут від цього захищає `max_instructions`.
    pub fn run(&mut self, max_instructions: u64) -> Result<(), SimError> {
        self.mode = Mode::Run;
        let mut executed = 0;
        while !self.halted {
            if executed >= max_instructions {
                return Err(SimError::RunLimit);
            }
            self.exec_step()?;
            executed += 1;
        }
        Ok(())
    }

    /// Встановлює режим без виконання (для анімованого запуску в інтерфейсі).
    pub fn set_mode(&mut self, mode: Mode) {
        self.mode = mode;
    }

    fn exec_step(&mut self) -> Result<(), SimError> {
        if let Some(e) = self.error {
            return Err(e);
        }
        if self.halted {
            return Ok(());
        }
        self.instr_done = false;
        loop {
            self.exec_takt()?;
            if self.instr_done || self.halted {
                return Ok(());
            }
        }
    }

    fn fail(&mut self, e: SimError) -> Result<(), SimError> {
        self.error = Some(e);
        Err(e)
    }

    fn exec_takt(&mut self) -> Result<(), SimError> {
        if let Some(e) = self.error {
            return Err(e);
        }
        if self.halted {
            return Ok(());
        }
        if self.pc as usize >= MEM_SIZE {
            return self.fail(SimError::PcOverflow);
        }
        let takt = if self.phase == 0 {
            Takt::GetCommand
        } else {
            micro_sequence(self.op, self.jump_taken)[self.phase as usize]
        };
        self.access = None;
        self.takt = takt;
        let (x0, x1, x2) = (a0(self.ir) as usize, a1(self.ir) as usize, a2(self.ir) as usize);
        match takt {
            Takt::GetCommand => {
                self.standby = false;
                self.printed = false;
                self.instr_done = false;
                self.ir = self.mem[self.pc as usize];
                self.op = opcode(self.ir);
                self.jump_taken = None;
                self.access = Some(Access { kind: AccessKind::Fetch, addr: self.pc });
            }
            Takt::GetR0 => {
                self.r0 = self.mem[x0];
                self.access = Some(Access { kind: AccessKind::Read, addr: x0 as u8 });
            }
            Takt::GetR1 => {
                self.r1 = self.mem[x1];
                self.access = Some(Access { kind: AccessKind::Read, addr: x1 as u8 });
            }
            Takt::GetR2 => {
                self.r2 = self.mem[x2];
                self.access = Some(Access { kind: AccessKind::Read, addr: x2 as u8 });
            }
            Takt::SetR2 => {
                self.mem[x2] = self.r2;
                self.access = Some(Access { kind: AccessKind::Write, addr: x2 as u8 });
            }
            Takt::Mov => self.r2 = self.r0,
            Takt::Add => self.r2 = self.r0.wrapping_add(self.r1),
            Takt::AbsSub => {
                let d = self.r0.wrapping_sub(self.r1);
                self.r2 = if d < 0 { self.r1.wrapping_sub(self.r0) } else { d };
            }
            Takt::Mul => self.r2 = self.r0.wrapping_mul(self.r1),
            Takt::Div => {
                if self.r1 == 0 {
                    return self.fail(SimError::DivisionByZero);
                }
                self.r2 = self.r0.wrapping_div(self.r1);
            }
            Takt::Compare => {
                self.jump_taken = Some(if self.op == op::JE { self.r0 == self.r1 } else { self.r0 > self.r1 });
            }
            Takt::PcInc => self.pc += 1,
            Takt::PcJump => self.pc = x2 as u8,
            Takt::Stop => {
                self.halted = true;
                self.printed = true;
            }
            Takt::Standby => unreachable!("standby is never scheduled"),
        }
        self.takts += 1;
        self.phase += 1;
        if self.phase as usize >= micro_sequence(self.op, self.jump_taken).len() {
            self.phase = 0;
            self.instr_done = true;
            self.instructions += 1;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encode;
    use crate::op::*;
    use Takt::*;

    fn machine(program: &[(usize, i32)]) -> Machine {
        let mut m = Machine::new();
        for &(addr, v) in program {
            m.set_cell(addr, v);
        }
        m
    }

    /// Приклад із методички (рис. 1.9–1.11): 17 + 23 = 40.
    fn manual_example() -> Machine {
        machine(&[(0, encode(ADD, 13, 14, 15)), (1, encode(STOP, 13, 14, 15)), (13, 17), (14, 23)])
    }

    #[test]
    fn manual_example_runs() {
        let mut m = manual_example();
        assert!(m.can_execute());
        m.run(100).unwrap();
        assert_eq!(m.memory()[15], 40);
        assert!(m.halted());
        let s = m.snapshot();
        assert!(s.printed);
        assert_eq!(s.pc, 1, "STOP does not advance PC");
        assert_eq!((s.r0, s.r1, s.r2), (17, 23, 40));
        assert!(!s.can_execute);
    }

    #[test]
    fn takt_labels_follow_micro_sequence() {
        let mut m = manual_example();
        let mut seen = Vec::new();
        while !m.halted() {
            m.takt().unwrap();
            seen.push(m.current_takt());
        }
        assert_eq!(
            seen,
            [GetCommand, GetR0, GetR1, Add, SetR2, PcInc, GetCommand, GetR0, GetR1, GetR2, Stop]
        );
        let s = m.snapshot();
        assert_eq!((s.takts, s.instructions), (11, 2));
    }

    #[test]
    fn step_completes_current_instruction() {
        let mut m = manual_example();
        m.takt().unwrap();
        m.takt().unwrap();
        m.step().unwrap();
        assert_eq!(m.pc(), 1);
        assert_eq!(m.memory()[15], 40);
        assert_eq!(m.snapshot().phase, 0);
    }

    fn exec_one(op: u8, x: i32, y: i32) -> Machine {
        let mut m = machine(&[(0, encode(op, 10, 11, 12)), (1, encode(STOP, 10, 11, 12)), (10, x), (11, y)]);
        m.step().unwrap();
        m
    }

    #[test]
    fn arithmetic() {
        assert_eq!(exec_one(MOV, 7, 99).memory()[12], 7);
        assert_eq!(exec_one(ADD, 7, 5).memory()[12], 12);
        assert_eq!(exec_one(DIV, 17, 5).memory()[12], 3);
        assert_eq!(exec_one(SUB, 5, 17).memory()[12], 12);
        assert_eq!(exec_one(SUB, 17, 5).memory()[12], 12);
        assert_eq!(exec_one(MUL, 6, 7).memory()[12], 42);
    }

    #[test]
    fn results_are_not_masked_to_15_bits() {
        assert_eq!(exec_one(ADD, 20000, 20000).memory()[12], 40000);
        assert_eq!(exec_one(MUL, 0x7FFF, 0x7FFF).memory()[12], 0x7FFF * 0x7FFF);
        assert_eq!(exec_one(MUL, 1 << 20, 1 << 20).memory()[12], 0, "i32 wraps");
    }

    #[test]
    fn division_by_zero_faults() {
        let mut m = machine(&[(0, encode(DIV, 10, 11, 12)), (1, encode(STOP, 0, 0, 0)), (10, 5)]);
        assert_eq!(m.step(), Err(SimError::DivisionByZero));
        assert_eq!(m.current_takt(), Div);
        assert!(!m.can_execute());
        assert_eq!(m.takt(), Err(SimError::DivisionByZero));
        m.edit();
        assert!(m.can_execute());
    }

    #[test]
    fn conditional_jumps_target_a2_address() {
        for (op, x, y, taken) in [(JE, 3, 3, true), (JE, 3, 4, false), (JG, 4, 3, true), (JG, 3, 3, false), (JG, 3, 4, false)] {
            let mut m = machine(&[(0, encode(op, 10, 11, 7)), (1, encode(STOP, 0, 0, 0)), (7, encode(STOP, 0, 0, 0)), (10, x), (11, y)]);
            for _ in 0..4 {
                m.takt().unwrap();
            }
            assert_eq!(m.current_takt(), Compare);
            assert_eq!(m.snapshot().jump_taken, Some(taken));
            m.takt().unwrap();
            assert_eq!(m.current_takt(), if taken { PcJump } else { PcInc });
            assert_eq!(m.pc(), if taken { 7 } else { 1 }, "{op:03b} {x} {y}");
        }
    }

    #[test]
    fn countdown_loop() {
        // acc += n; n = |n - 1|; якщо n > 0, перейти на 0; стоп
        let mut m = machine(&[
            (0, encode(ADD, 12, 10, 12)),
            (1, encode(SUB, 10, 11, 10)),
            (2, encode(JG, 10, 13, 0)),
            (3, encode(STOP, 10, 12, 12)),
            (10, 5),
            (11, 1),
        ]);
        m.run(1000).unwrap();
        assert_eq!(m.memory()[12], 15);
    }

    #[test]
    fn variant_1_sum_of_three() {
        // Y = A + B + C, A=1, B=2, C=3 -> Y=6
        let mut m = machine(&[
            (0, encode(ADD, 12, 13, 15)),
            (1, encode(ADD, 15, 14, 15)),
            (2, encode(STOP, 12, 13, 15)),
            (12, 1),
            (13, 2),
            (14, 3),
        ]);
        m.run(100).unwrap();
        assert_eq!(m.memory()[15], 6);
    }

    #[test]
    fn infinite_loop_hits_run_limit() {
        let mut m = machine(&[(0, encode(JE, 0, 0, 0)), (1, encode(STOP, 0, 0, 0))]);
        assert!(m.can_execute());
        assert_eq!(m.run(50), Err(SimError::RunLimit));
        assert!(m.error().is_none(), "run limit is not a machine fault");
    }

    #[test]
    fn pc_overflow() {
        // Комірки 0..14 містять MOV [0] -> [0]; PC доходить до STOP у комірці 15.
        let mut m = machine(&[(15, encode(STOP, 0, 0, 0))]);
        m.run(100).unwrap();
        assert_eq!(m.pc(), 15);

        // Без STOP виконання виходить за межі пам'яті.
        let mut m = Machine::new();
        assert!(!m.can_execute());
        assert_eq!(m.run(100), Err(SimError::PcOverflow));
        assert_eq!(m.pc(), 16);
    }

    #[test]
    fn edit_cursor_and_bits() {
        let mut m = Machine::new();
        for _ in 0..3 {
            m.write_bit(true);
        }
        assert_eq!(m.memory()[0], 0b111 << 12);
        m.set_cursor(0, 14);
        m.write_bit(true);
        assert_eq!(m.memory()[0], (0b111 << 12) | 1);
        assert_eq!(m.cursor(), (1, 0), "wraps to next row");
        m.cursor_up();
        m.cursor_up();
        assert_eq!(m.cursor(), (15, 0));
        m.cursor_left();
        assert_eq!(m.cursor(), (15, 0));
        m.cursor_end();
        m.cursor_right();
        assert_eq!(m.cursor(), (15, 14));
        m.cursor_newline();
        assert_eq!(m.cursor(), (0, 0));
        assert!(m.toggle_bit(2, 3));
        assert_eq!(m.memory()[2], 0x0800);

        m.takt().ok();
        assert!(!m.write_bit(true), "editing only in edit mode");
    }

    #[test]
    fn edit_resets_processor_but_keeps_memory() {
        let mut m = manual_example();
        m.run(100).unwrap();
        m.edit();
        let s = m.snapshot();
        assert_eq!((s.pc, s.halted, s.printed, s.standby, s.mode), (0, false, false, true, Mode::Editing));
        assert_eq!(s.mem[15], 40);
        assert!(s.can_execute);
    }
}
