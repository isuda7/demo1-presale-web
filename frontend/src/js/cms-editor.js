/**
 * 화면 편집기 — 관리자에게만 로드된다 (cms.js 가 관리자 표시 쿠키를 보고 동적으로 import).
 * 서버에서 로그인 상태를 다시 확인한 뒤에만 편집 바를 띄운다.
 *
 * - 문장·버튼 글자: 클릭해서 그 자리에서 수정
 * - 링크 주소·이미지·배경 이미지: 클릭하면 오른쪽 아래 속성 창에서 수정
 * - 저장 전 변경은 편집 바에 건수로 표시, 저장 시 한 번에 서버로 전송
 */
import '../styles/cms-editor.css';
import { isSafeHref, isSafeSrc } from '@shared/cms.ts';
import { applyValue, sanitizeHtml } from './cms.js';

const KIND_LABEL = { text: '문장', link: '버튼·링크', href: '링크 영역', img: '이미지', bg: '배경 이미지' };
const HINT_COOKIE_CLEAR = 'admin_ui=; Max-Age=0; Path=/; SameSite=Strict';

let state;
let bar;
let panel;
let editing = false;
let selectedKey = null;
const dirty = new Map(); // key → {set: value} | {remove: true}

/* ---------- 공통 ---------- */
async function apiFetch(path, init = {}) {
  const res = await fetch(`/api${path}`, { credentials: 'same-origin', ...init });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* JSON 아님 */
  }
  return { ok: res.ok, status: res.status, data };
}

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, String(v));
  }
  el.append(...children.filter((c) => c != null));
  return el;
}

function toast(message, isError = false) {
  const t = h('div', { class: `cms-toast${isError ? ' cms-toast--error' : ''}`, role: 'status' }, message);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

/** 지금 화면에 보이는 값 (저장 전 변경 포함) */
function currentValue(entry) {
  const d = dirty.get(entry.key);
  if (d?.set) return d.set;
  if (d?.remove) return entry.original;
  return state.overrides.get(entry.key)?.value ?? entry.original;
}

function sameValue(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeOriginal(entry) {
  const o = { ...entry.original };
  if (o.html !== undefined) o.html = sanitizeHtml(o.html);
  return o;
}

/** 값 변경 기록: 원래 값과 같아지면 '원래대로'로 처리 */
function markChange(entry, value) {
  const isOriginal = sameValue(value, normalizeOriginal(entry));
  const hasSaved = state.overrides.has(entry.key);
  if (isOriginal) {
    if (hasSaved) dirty.set(entry.key, { remove: true });
    else dirty.delete(entry.key);
  } else if (hasSaved && sameValue(value, state.overrides.get(entry.key).value)) {
    dirty.delete(entry.key);
  } else {
    dirty.set(entry.key, { set: value });
  }
  entry.el.classList.toggle('cms-dirty', dirty.has(entry.key));
  updateBar();
}

/* ---------- 편집 바 ---------- */
function buildBar() {
  const toggle = h(
    'button',
    { type: 'button', class: 'cms-switch', 'aria-pressed': 'false', on: { click: () => setEditing(!editing) } },
    h('span', { class: 'cms-switch__knob' }),
    h('span', { class: 'cms-switch__label' }, '편집 모드'),
  );
  bar = h(
    'div',
    { class: 'cms-bar', role: 'region', 'aria-label': '화면 편집' },
    h('span', { class: 'cms-bar__badge' }, 'ADMIN'),
    toggle,
    h('span', { class: 'cms-bar__status', 'aria-live': 'polite' }),
    h('span', { class: 'cms-bar__spacer' }),
    h('button', { type: 'button', class: 'cms-btn cms-btn--ghost', 'data-act': 'discard', on: { click: discard } }, '변경 취소'),
    h('button', { type: 'button', class: 'cms-btn cms-btn--primary', 'data-act': 'save', on: { click: save } }, '저장'),
    h('a', { class: 'cms-btn cms-btn--ghost', href: '/admin/' }, '신청 관리'),
    h('button', { type: 'button', class: 'cms-btn cms-btn--ghost', on: { click: logout } }, '로그아웃'),
  );
  document.body.append(bar);
  document.documentElement.classList.add('cms-has-bar');
  updateBar();
}

function updateBar() {
  if (!bar) return;
  const n = dirty.size;
  bar.querySelector('.cms-bar__status').textContent = editing
    ? n
      ? `저장하지 않은 변경 ${n}건`
      : '편집할 곳을 클릭하세요'
    : `편집 가능 영역 ${state.entries.size}곳`;
  bar.querySelector('[data-act="save"]').disabled = n === 0;
  bar.querySelector('[data-act="discard"]').disabled = n === 0;
  bar.querySelector('.cms-switch').setAttribute('aria-pressed', String(editing));
}

/* ---------- 편집 모드 ---------- */
function setEditing(on) {
  editing = on;
  document.documentElement.classList.toggle('cms-editing', on);
  for (const entry of state.entries.values()) {
    if (entry.kind === 'text' || entry.kind === 'link') {
      if (on) {
        entry.el.setAttribute('contenteditable', 'true');
        entry.el.setAttribute('spellcheck', 'false');
      } else {
        entry.el.removeAttribute('contenteditable');
        entry.el.removeAttribute('spellcheck');
      }
    }
  }
  if (!on) closePanel();
  updateBar();
}

function entryOf(el) {
  const key = el?.closest?.('[data-cms-key]')?.dataset.cmsKey;
  return key ? state.entries.get(key) : null;
}

/** 클릭한 요소와 그 바깥쪽 링크·배경 항목을 함께 모음 */
function entriesAt(target) {
  const list = [];
  let node = target.closest('[data-cms-key]');
  while (node) {
    const entry = state.entries.get(node.dataset.cmsKey);
    if (entry) list.push(entry);
    node = node.parentElement?.closest('[data-cms-key]');
  }
  return list;
}

function onClick(e) {
  if (!editing || bar.contains(e.target) || panel?.contains(e.target)) return;
  const main = document.querySelector('main');
  if (!main?.contains(e.target)) return;
  // 편집 중에는 링크 이동·버튼 동작을 막는다
  if (e.target.closest('a, button')) e.preventDefault();
  const list = entriesAt(e.target);
  if (!list.length) return closePanel();
  select(list);
}

function onInput(e) {
  const entry = entryOf(e.target);
  if (!entry || (entry.kind !== 'text' && entry.kind !== 'link')) return;
  const value = { ...currentValue(entry), html: sanitizeHtml(entry.el.innerHTML) };
  markChange(entry, value);
}

function onKeydown(e) {
  if (!editing || !e.target.isContentEditable) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    document.execCommand('insertLineBreak');
  } else if (e.key === 'Escape') {
    e.target.blur();
  }
}

function onPaste(e) {
  if (!editing || !e.target.isContentEditable) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
}

/* ---------- 속성 창 ---------- */
function closePanel() {
  panel?.remove();
  panel = null;
  document.querySelector('.cms-selected')?.classList.remove('cms-selected');
  selectedKey = null;
}

function field(label, input) {
  return h('label', { class: 'cms-field' }, h('span', {}, label), input);
}

async function upload(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await apiFetch('/admin/media', { method: 'POST', body: fd });
  if (res.status === 401) {
    expired();
    return null;
  }
  if (!res.ok) {
    toast(res.data?.message ?? '이미지를 올리지 못했습니다.', true);
    return null;
  }
  return res.data.url;
}

function sectionFor(entry) {
  const value = currentValue(entry);
  const sec = h('div', { class: 'cms-panel__section' }, h('p', { class: 'cms-panel__kind' }, KIND_LABEL[entry.kind]));
  const update = (patch) => {
    const next = { ...currentValue(entry), ...patch };
    applyValue(entry, next);
    markChange(entry, next);
  };

  if (entry.kind === 'text' || entry.kind === 'link') {
    sec.append(h('p', { class: 'cms-panel__hint' }, '글자는 화면에서 바로 고치세요. 줄바꿈은 Enter.'));
  }
  if (entry.kind === 'link' || entry.kind === 'href') {
    const input = h('input', { type: 'text', value: value.href ?? '', placeholder: '/apply/ 또는 https://…' });
    input.addEventListener('change', () => {
      const href = input.value.trim();
      if (!isSafeHref(href)) return toast('사이트 경로(/…), https://, tel:, mailto: 주소만 쓸 수 있습니다.', true);
      update({ href });
    });
    sec.append(field('링크 주소', input));
  }
  if (entry.kind === 'img' || entry.kind === 'bg') {
    sec.append(h('img', { class: 'cms-panel__preview', src: value.src, alt: '' }));
    const file = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      const url = await upload(f);
      if (!url) return;
      update({ src: url });
      sec.querySelector('.cms-panel__preview').src = url;
      sec.querySelector('[data-src]').value = url;
    });
    sec.append(field('이미지 올리기 (JPG·PNG·WebP, 2MB 이하)', file));
    const src = h('input', { type: 'text', value: value.src ?? '', 'data-src': '' });
    src.addEventListener('change', () => {
      const v = src.value.trim();
      if (!isSafeSrc(v)) return toast('/images/…, /api/media/… 또는 https:// 주소만 쓸 수 있습니다.', true);
      update({ src: v });
      sec.querySelector('.cms-panel__preview').src = v;
    });
    sec.append(field('이미지 주소', src));
  }
  if (entry.kind === 'img') {
    const alt = h('input', { type: 'text', value: value.alt ?? '', maxlength: '300' });
    alt.addEventListener('change', () => update({ alt: alt.value.trim() }));
    sec.append(field('대체텍스트 (이미지 설명)', alt));
  }

  const canReset = state.overrides.has(entry.key) || dirty.has(entry.key);
  sec.append(
    h(
      'button',
      {
        type: 'button',
        class: 'cms-btn cms-btn--ghost cms-btn--sm',
        disabled: !canReset,
        on: {
          click: () => {
            const original = normalizeOriginal(entry);
            applyValue(entry, original);
            markChange(entry, original);
            select(entriesAt(entry.el));
          },
        },
      },
      '원래대로',
    ),
  );
  return sec;
}

function select(list) {
  closePanel();
  const [first] = list;
  selectedKey = first.key;
  first.el.classList.add('cms-selected');
  panel = h(
    'div',
    { class: 'cms-panel', role: 'dialog', 'aria-label': '편집 속성' },
    h(
      'div',
      { class: 'cms-panel__head' },
      h('strong', {}, '속성'),
      h('button', { type: 'button', class: 'cms-panel__close', 'aria-label': '닫기', on: { click: closePanel } }, '×'),
    ),
    ...list.map(sectionFor),
  );
  document.body.append(panel);
}

/* ---------- 저장·취소·로그아웃 ---------- */
async function save() {
  if (!dirty.size) return;
  const set = [];
  const remove = [];
  for (const [key, d] of dirty) {
    const entry = state.entries.get(key);
    if (d.remove) remove.push(key);
    else set.push({ key, kind: entry.kind, orig: entry.orig, value: d.set });
  }
  const res = await apiFetch(`/admin/content/${encodeURIComponent(state.page)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ set, remove }),
  });
  if (res.status === 401) return expired();
  if (!res.ok) return toast(res.data?.message ?? '저장하지 못했습니다.', true);

  state.overrides = new Map((res.data.items ?? []).map((i) => [i.key, i]));
  dirty.clear();
  document.querySelectorAll('.cms-dirty').forEach((el) => el.classList.remove('cms-dirty'));
  if (selectedKey) select(entriesAt(state.entries.get(selectedKey).el));
  updateBar();
  toast('저장했습니다.');
}

function discard() {
  if (!dirty.size) return;
  if (!confirm(`저장하지 않은 변경 ${dirty.size}건을 버릴까요?`)) return;
  dirty.clear();
  location.reload();
}

/**
 * 다른 탭(관리자 화면 등)에서 로그아웃해 표시 쿠키가 사라졌으면 편집 바를 내림.
 * 로그아웃 알림(BroadcastChannel), 탭 전환·포커스, 1.5초 주기 쿠키 확인으로 감지한다.
 */
const logoutChannel = 'BroadcastChannel' in window ? new BroadcastChannel('admin-session') : null;
let cookieTimer = null;

function onVisibility() {
  if (!bar) return;
  if (!/(?:^|;\s*)admin_ui=1(?:;|$)/.test(document.cookie)) {
    dirty.clear();
    teardown();
    toast('로그아웃되어 편집 모드를 종료했습니다.');
  }
}

function teardown() {
  setEditing(false);
  bar?.remove();
  bar = null;
  document.documentElement.classList.remove('cms-has-bar', 'cms-editing');
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('input', onInput, true);
  document.removeEventListener('keydown', onKeydown, true);
  document.removeEventListener('paste', onPaste, true);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('focus', onVisibility);
  clearInterval(cookieTimer);
  if (logoutChannel) logoutChannel.onmessage = null;
}

function expired() {
  document.cookie = HINT_COOKIE_CLEAR;
  teardown();
  toast('관리자 로그인이 만료되었습니다. 다시 로그인해 주세요.', true);
}

async function logout() {
  if (dirty.size && !confirm(`저장하지 않은 변경 ${dirty.size}건이 있습니다. 로그아웃할까요?`)) return;
  dirty.clear();
  await apiFetch('/admin/logout', { method: 'POST' });
  document.cookie = HINT_COOKIE_CLEAR;
  logoutChannel?.postMessage('logout');
  teardown();
  location.reload(); // 편집 중이던 화면 상태를 지우고 방문자 화면으로
}

function onBeforeUnload(e) {
  if (dirty.size) {
    e.preventDefault();
    e.returnValue = '';
  }
}

/* ---------- 시작 ---------- */
export async function startEditor(s) {
  state = s;
  // 실제 권한 확인 — 실패하면 표시 쿠키를 지우고 아무것도 띄우지 않음
  const me = await apiFetch('/admin/me');
  if (!me.ok) {
    document.cookie = HINT_COOKIE_CLEAR;
    return;
  }
  buildBar();
  // 관리자 화면의 '화면 편집'으로 들어오면 편집 모드를 바로 켬 (주소의 ?cms=edit 은 지움)
  const url = new URL(location.href);
  if (url.searchParams.get('cms') === 'edit') {
    url.searchParams.delete('cms');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    setEditing(true);
  }
  document.addEventListener('click', onClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('paste', onPaste, true);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onVisibility);
  cookieTimer = setInterval(onVisibility, 1500);
  if (logoutChannel) logoutChannel.onmessage = (e) => e.data === 'logout' && onVisibility();
}
