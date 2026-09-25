use crate::{MEM_SIZE, WORD_MASK};
use std::fmt;

/// Оригінал відхиляє файли проєкту розміром від 512 байт.
pub const MAX_FILE_SIZE: usize = 511;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ParseError {
    /// Файл більший за [`MAX_FILE_SIZE`].
    TooLarge(usize),
    /// Дані закінчилися раніше, ніж прочитано всі 16 комірок.
    Truncated { cell: usize },
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::TooLarge(n) => write!(f, "file is too large ({n} bytes, max {MAX_FILE_SIZE})"),
            ParseError::Truncated { cell } => write!(f, "file ends before memory cell {cell}"),
        }
    }
}

impl std::error::Error for ParseError {}

/// Розбирає файл проєкту (оригінальна `sParseText`).
///
/// Для кожної з 16 комірок: пропустити все до `:` включно, потім зібрати
/// 15 двійкових цифр, ігноруючи будь-які інші символи.
pub fn parse_text(bytes: &[u8]) -> Result<[i32; MEM_SIZE], ParseError> {
    if bytes.len() > MAX_FILE_SIZE {
        return Err(ParseError::TooLarge(bytes.len()));
    }
    let mut mem = [0; MEM_SIZE];
    let mut it = bytes.iter().copied();
    for (cell, slot) in mem.iter_mut().enumerate() {
        if !it.by_ref().any(|b| b == b':') {
            return Err(ParseError::Truncated { cell });
        }
        let mut value = 0;
        let mut bit = 0x4000;
        let mut read = 0;
        while read < 15 {
            match it.next() {
                Some(b'1') => value |= bit,
                Some(b'0') => {}
                Some(_) => continue,
                None => return Err(ParseError::Truncated { cell }),
            }
            bit >>= 1;
            read += 1;
        }
        *slot = value;
    }
    Ok(mem)
}

/// Записує пам'ять у форматі проєкту оригіналу (оригінальна `sMakeText`):
/// `AAAA : OOO AAAA AAAA AAAA\r\n` на комірку, лише молодші 15 біт.
pub fn format_text(mem: &[i32; MEM_SIZE]) -> String {
    let mut out = String::with_capacity(MEM_SIZE * 28);
    for (addr, &word) in mem.iter().enumerate() {
        let w = word & WORD_MASK;
        out.push_str(&format!(
            "{:04b} : {:03b} {:04b} {:04b} {:04b}\r\n",
            addr,
            (w >> 12) & 7,
            (w >> 8) & 0xF,
            (w >> 4) & 0xF,
            w & 0xF
        ));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{encode, op};

    #[test]
    fn roundtrip() {
        let mut mem = [0; MEM_SIZE];
        mem[0] = encode(op::ADD, 13, 14, 15);
        mem[1] = encode(op::STOP, 13, 14, 15);
        mem[13] = 17;
        mem[14] = 23;
        let text = format_text(&mem);
        assert!(text.starts_with("0000 : 001 1101 1110 1111\r\n0001 : 111 1101 1110 1111\r\n"));
        assert!(text.len() <= MAX_FILE_SIZE);
        assert_eq!(parse_text(text.as_bytes()).unwrap(), mem);
    }

    #[test]
    fn format_writes_only_15_bits() {
        let mut mem = [0; MEM_SIZE];
        mem[3] = 40000; // 0b1001_1100_0100_0000
        let parsed = parse_text(format_text(&mem).as_bytes()).unwrap();
        assert_eq!(parsed[3], 40000 & WORD_MASK);
    }

    #[test]
    fn tolerant_to_separators_and_line_endings() {
        let mut text = String::new();
        for a in 0..16 {
            text.push_str(&format!("{a:04b}:111000000000000\n"));
        }
        let mem = parse_text(text.as_bytes()).unwrap();
        assert!(mem.iter().all(|&w| w == 0b111 << 12));
    }

    #[test]
    fn rejects_truncated_and_large_files() {
        assert_eq!(parse_text(b"0000 : 000 0000 0000 0000\r\n"), Err(ParseError::Truncated { cell: 1 }));
        assert_eq!(parse_text(b"0000 : 000 00"), Err(ParseError::Truncated { cell: 0 }));
        assert!(matches!(parse_text(&[b' '; 600]), Err(ParseError::TooLarge(600))));
    }
}
