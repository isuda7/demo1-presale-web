/**
 * 설정 병합 규칙
 * - 객체: 키 단위로 재귀 병합
 * - 배열·원시값: 뒤의 값이 통째로 대체
 * - undefined: 무시(앞의 값 유지)
 */
type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mergeTwo(a: unknown, b: unknown): unknown {
  if (b === undefined) return a;
  if (isPlainObject(a) && isPlainObject(b)) {
    const out: Plain = { ...a };
    for (const key of Object.keys(b)) out[key] = mergeTwo(a[key], b[key]);
    return out;
  }
  return structuredClone(b);
}

export function deepMerge<T>(base: T, ...overrides: unknown[]): T {
  let out: unknown = structuredClone(base);
  for (const o of overrides) out = mergeTwo(out, o);
  return out as T;
}
