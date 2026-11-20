/**
 * CSV 생성 (엑셀 한글 깨짐 방지 BOM 포함, 수식 주입 방지)
 */
function cell(value: unknown): string {
  let s = value == null ? '' : String(value);
  // =, +, -, @, 탭, CR 로 시작하면 엑셀이 수식으로 해석할 수 있어 앞에 ' 를 붙인다
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(cell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}
