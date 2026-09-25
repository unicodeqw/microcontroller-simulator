use crate::{a2, opcode, op, MEM_SIZE};

/// Перевіряє, чи можна запускати програму (оригінальна `sRecursiveCheck`).
///
/// Перенесено дослівно, разом із поблажливою семантикою: результат визначає
/// *останній* досліджений шлях. Обхід іде від адреси 0; умовні переходи
/// додатково досліджують свою ціль (кожну стартову адресу не більше одного разу).
/// `STOP` позначає шлях як завершений, вихід за межі пам'яті — як незавершений.
pub fn check_program(mem: &[i32; MEM_SIZE]) -> bool {
    let mut visited = [false; MEM_SIZE];
    let mut ok = false;
    walk(mem, 0, &mut visited, &mut ok);
    ok
}

fn walk(mem: &[i32; MEM_SIZE], start: usize, visited: &mut [bool; MEM_SIZE], ok: &mut bool) {
    if visited[start] {
        return;
    }
    for addr in start..MEM_SIZE {
        let word = mem[addr];
        visited[addr] = true;
        match opcode(word) {
            op::STOP => {
                *ok = true;
                return;
            }
            op::JE | op::JG => walk(mem, a2(word) as usize, visited, ok),
            _ => {}
        }
    }
    *ok = false;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::encode;

    fn mem(words: &[i32]) -> [i32; MEM_SIZE] {
        let mut m = [0; MEM_SIZE];
        m[..words.len()].copy_from_slice(words);
        m
    }

    #[test]
    fn empty_memory_is_not_runnable() {
        assert!(!check_program(&[0; MEM_SIZE]));
    }

    #[test]
    fn stop_makes_program_runnable() {
        assert!(check_program(&mem(&[encode(op::ADD, 13, 14, 15), encode(op::STOP, 13, 14, 15)])));
        assert!(check_program(&mem(&[encode(op::STOP, 0, 0, 0)])));
    }

    #[test]
    fn self_loop_before_stop_is_accepted() {
        // 0: JE 0,0 -> 0 (на практиці нескінченний цикл), 1: STOP
        assert!(check_program(&mem(&[encode(op::JE, 0, 0, 0), encode(op::STOP, 0, 0, 0)])));
    }

    #[test]
    fn last_explored_path_wins() {
        // 0: JG -> 15 (ціль виходить за межі), 1: STOP => приймається (особливість оригіналу)
        let mut m = mem(&[encode(op::JG, 0, 0, 15), encode(op::STOP, 0, 0, 0)]);
        assert!(check_program(&m));
        // Без STOP на шляху без переходу програма відхиляється.
        m[1] = encode(op::ADD, 0, 0, 0);
        assert!(!check_program(&m));
    }
}
