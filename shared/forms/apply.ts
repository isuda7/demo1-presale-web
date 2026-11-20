/**
 * 관심고객 신청 폼 정의 — 프론트(화면 생성·검증)와 백엔드(서버 검증)가 함께 쓴다.
 */

export type FieldType = 'text' | 'tel' | 'textarea' | 'checkbox';

export interface FieldDef {
  name: keyof ApplyInput;
  label: string;
  type: FieldType;
  required: boolean;
  maxLength?: number;
  placeholder?: string;
  autocomplete?: string;
}

export interface ApplyInput {
  name: string;
  phone: string;
  message: string;
  privacyAgree: boolean;
}

export const applyFields: FieldDef[] = [
  { name: 'name', label: '성함', type: 'text', required: true, maxLength: 30, autocomplete: 'name' },
  {
    name: 'phone',
    label: '연락처',
    type: 'tel',
    required: true,
    maxLength: 13,
    placeholder: '010-0000-0000',
    autocomplete: 'tel',
  },
  { name: 'message', label: '문의사항', type: 'textarea', required: false, maxLength: 1000 },
  { name: 'privacyAgree', label: '개인정보 수집·이용에 동의합니다.', type: 'checkbox', required: true },
];

/** 스팸 방지용 숨김 필드 이름 (값이 들어오면 봇으로 간주) */
export const HONEYPOT_FIELD = 'website';

/** 숫자만 남긴 연락처 */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** 숫자 연락처를 하이픈 형식으로 (표시용) */
export function formatPhone(digits: string): string {
  const d = normalizePhone(digits);
  if (d.startsWith('02')) {
    if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
    if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return d;
}

export type ValidationResult =
  | { ok: true; data: ApplyInput }
  | { ok: false; errors: Partial<Record<keyof ApplyInput, string>> };

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'on' || v === '1' || v === 1;
}

export function validateApply(raw: Record<string, unknown>): ValidationResult {
  const data: ApplyInput = {
    name: asString(raw.name),
    phone: normalizePhone(asString(raw.phone)),
    message: asString(raw.message),
    privacyAgree: asBool(raw.privacyAgree),
  };
  const errors: Partial<Record<keyof ApplyInput, string>> = {};

  for (const f of applyFields) {
    const v = data[f.name];
    if (f.type === 'checkbox') continue; // 동의 여부는 아래에서 별도 검사
    const s = String(v);
    if (f.required && !s) errors[f.name] = `${f.label}을(를) 입력해 주세요.`;
    else if (f.maxLength && s.length > f.maxLength && f.name !== 'phone') {
      errors[f.name] = `${f.label}은(는) ${f.maxLength}자 이내로 입력해 주세요.`;
    }
  }
  if (data.phone && !/^0\d{8,10}$/.test(data.phone)) {
    errors.phone = '연락처 형식을 확인해 주세요.';
  }
  if (data.privacyAgree !== true) errors.privacyAgree = '개인정보 수집·이용 동의가 필요합니다.';

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
