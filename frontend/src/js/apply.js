// 관심고객 신청 화면
import { config } from '@shared/config/index.ts';
import { applyFields, HONEYPOT_FIELD, validateApply } from '@shared/forms/apply.ts';
import { api } from './api.js';

const form = document.getElementById('apply-form');
const fieldsBox = document.getElementById('apply-fields');
const closedBox = document.getElementById('apply-closed');
const resultBox = document.getElementById('apply-result');
const submitBtn = form.querySelector('button[type="submit"]');

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === true) node.setAttribute(k, '');
    else if (v !== false && v != null) node.setAttribute(k, String(v));
  }
  if (text != null) node.textContent = text;
  return node;
}

/** 동의문·보유기간 (미확정이면 초안 표시) */
function consentBlock() {
  const wrap = el('div', { class: 'form-row' });
  const { consentText, retentionText } = config.privacy;
  const box = el('div', { class: 'consent-box', id: 'consent-text' });
  if (consentText || retentionText) {
    box.textContent = [consentText, retentionText].filter(Boolean).join('\n\n');
  } else {
    box.append(el('p', { class: 'draft-note' }, '[미확정] 개인정보 수집·이용 동의문 및 보유·이용 기간 문구 입력 필요'));
  }
  wrap.append(box);
  return wrap;
}

function renderFields() {
  for (const f of applyFields) {
    const id = `f-${f.name}`;
    const row = el('div', { class: 'form-row', 'data-field': f.name });
    const common = { id, name: f.name, required: f.required, 'aria-describedby': `${id}-err` };

    if (f.type === 'checkbox') {
      fieldsBox.append(consentBlock());
      const label = el('label');
      label.append(el('input', { ...common, type: 'checkbox', value: 'true' }), ` ${f.label}`);
      if (f.required) label.append(' (필수)');
      row.append(label);
    } else {
      row.append(el('label', { for: id }, `${f.label}${f.required ? ' (필수)' : ''}`));
      const attrs = {
        ...common,
        maxlength: f.maxLength,
        placeholder: f.placeholder,
        autocomplete: f.autocomplete,
      };
      row.append(f.type === 'textarea' ? el('textarea', attrs) : el('input', { ...attrs, type: f.type }));
    }
    row.append(el('p', { class: 'form-error', id: `${id}-err`, 'aria-live': 'polite' }));
    fieldsBox.append(row);
  }
  // 스팸 방지 숨김 필드
  const hp = el('div', { class: 'hp-field', 'aria-hidden': 'true' });
  hp.append(el('input', { type: 'text', name: HONEYPOT_FIELD, tabindex: '-1', autocomplete: 'off' }));
  fieldsBox.append(hp);
}

function readForm() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  data.privacyAgree = fd.get('privacyAgree') === 'true';
  return data;
}

function showErrors(errors = {}) {
  for (const f of applyFields) {
    const msg = errors[f.name] ?? '';
    const input = document.getElementById(`f-${f.name}`);
    document.getElementById(`f-${f.name}-err`).textContent = msg;
    input?.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
}

function showClosed(message) {
  form.hidden = true;
  closedBox.hidden = false;
  closedBox.textContent = message || config.apply.closedMessage;
}

async function init() {
  renderFields();
  const { ok, data } = await api('/apply/status');
  if (ok && data && data.open === false) showClosed(data.message);
  else form.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  resultBox.hidden = true;
  const data = readForm();
  const check = validateApply(data);
  if (!check.ok) {
    showErrors(check.errors);
    return;
  }
  showErrors();
  submitBtn.disabled = true;
  try {
    const res = await api('/apply', { method: 'POST', body: data });
    if (res.ok) {
      form.reset();
      form.hidden = true;
      resultBox.hidden = false;
      resultBox.textContent = res.data?.message || config.apply.doneMessage;
    } else if (res.status === 403 && res.data?.error === 'closed') {
      showClosed(res.data.message);
    } else if (res.status === 422) {
      showErrors(res.data?.errors);
    } else {
      resultBox.hidden = false;
      resultBox.textContent = '일시적인 오류로 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
  } catch {
    resultBox.hidden = false;
    resultBox.textContent = '네트워크 오류로 등록하지 못했습니다.';
  } finally {
    submitBtn.disabled = false;
  }
});

init();
