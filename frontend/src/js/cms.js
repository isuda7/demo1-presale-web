/**
 * 화면 편집 내용 적용 (모든 방문자에게 로드되는 작은 스크립트)
 *
 * 1) 페이지 본문(main)에서 편집 가능한 요소를 정해진 규칙으로 찾아 키를 매긴다.
 * 2) /api/content/<페이지> 의 저장된 편집 내용을 적용한다.
 *    원래 내용의 해시가 저장 당시와 다르면(HTML 이 바뀌면) 적용하지 않는다.
 * 3) 관리자 표시 쿠키가 있을 때만 편집기(cms-editor.js)를 따로 받아 온다.
 *    → 방문자는 편집기 코드를 내려받지 않는다.
 */
import { CMS_ALLOWED_TAGS, cmsHash, isSafeHref, isSafeSrc } from '@shared/cms.ts';

const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'P', 'LI', 'DT', 'DD', 'FIGCAPTION', 'TH', 'TD', 'CAPTION', 'SPAN', 'STRONG', 'SMALL', 'A']);
const INLINE_TAGS = new Set(CMS_ALLOWED_TAGS.map((t) => t.toUpperCase()));
const BG_SELECTOR = '.home-hero, .page-title--image, .apply-visual';

/* ---------- 정리(sanitize): 허용 태그와 class 만 남김 ---------- */
export function sanitizeHtml(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const clean = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) continue;
      if (child.nodeType !== Node.ELEMENT_NODE || !INLINE_TAGS.has(child.tagName)) {
        // 허용되지 않은 요소는 글자만 남김
        child.replaceWith(document.createTextNode(child.textContent ?? ''));
        continue;
      }
      for (const attr of [...child.attributes]) {
        if (attr.name !== 'class' || !/^[\w\- ]*$/.test(attr.value)) child.removeAttribute(attr.name);
      }
      clean(child);
    }
  };
  clean(tpl.content);
  return tpl.innerHTML.trim();
}

/* ---------- 편집 가능한 요소 찾기 ---------- */
function isInlineOnly(el) {
  for (const child of el.children) {
    if (!INLINE_TAGS.has(child.tagName) || child.children.length) return false;
  }
  return true;
}

function bgUrl(el) {
  const m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage || '');
  return m ? m[1] : '';
}

/** 페이지의 편집 대상 목록: Map<key, {el, kind, orig, original}> */
export function collectEditables(root = document.querySelector('main')) {
  const entries = new Map();
  if (!root) return entries;
  const counters = { text: 0, link: 0, href: 0, img: 0, bg: 0 };
  const add = (kind, el, original) => {
    const key = `${kind}:${counters[kind]++}`;
    const orig = cmsHash(JSON.stringify(original));
    el.dataset.cmsKey = key;
    entries.set(key, { key, el, kind, orig, original });
  };
  const skipped = (el) => !!el.closest('[data-cms-skip]');
  const taken = new Set();

  for (const el of root.querySelectorAll(BG_SELECTOR)) {
    if (!skipped(el) && bgUrl(el)) add('bg', el, { src: bgUrl(el) });
  }
  for (const el of root.querySelectorAll('*')) {
    if (skipped(el)) continue;
    if (el.tagName === 'IMG') {
      add('img', el, { src: el.getAttribute('src') ?? '', alt: el.getAttribute('alt') ?? '' });
      continue;
    }
    if (!TEXT_TAGS.has(el.tagName)) continue;
    // 이미 편집 대상인 요소 안쪽은 건너뜀
    if ([...taken].some((t) => t.contains(el))) continue;
    const hasText = el.textContent.trim() !== '';
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') ?? '';
      if (hasText && isInlineOnly(el)) {
        add('link', el, { html: el.innerHTML.trim(), href });
        taken.add(el);
      } else {
        add('href', el, { href }); // 카드처럼 안에 다른 요소가 있는 링크는 주소만
      }
      continue;
    }
    if (hasText && isInlineOnly(el)) {
      add('text', el, { html: el.innerHTML.trim() });
      taken.add(el);
    }
  }
  return entries;
}

/* ---------- 값 적용 ---------- */
export function applyValue(entry, value) {
  const { el, kind } = entry;
  if ((kind === 'text' || kind === 'link') && typeof value.html === 'string') {
    el.innerHTML = sanitizeHtml(value.html);
  }
  if ((kind === 'link' || kind === 'href') && typeof value.href === 'string' && isSafeHref(value.href)) {
    el.setAttribute('href', value.href);
  }
  if (kind === 'img' && typeof value.src === 'string' && isSafeSrc(value.src)) {
    el.setAttribute('src', value.src);
    if (typeof value.alt === 'string') el.setAttribute('alt', value.alt);
  }
  if (kind === 'bg' && typeof value.src === 'string' && isSafeSrc(value.src)) {
    el.style.backgroundImage = `url('${value.src.replace(/'/g, '%27')}')`;
  }
}

function readyDone() {
  document.documentElement.classList.remove('cms-pending');
}

export const state = {
  page: document.documentElement.dataset.page ?? '',
  entries: new Map(),
  overrides: new Map(), // key → 저장된 항목
};

async function init() {
  state.entries = collectEditables();
  try {
    const res = await fetch(`/api/content/${encodeURIComponent(state.page)}`, { credentials: 'same-origin' });
    if (res.ok) {
      const { items } = await res.json();
      for (const item of items ?? []) {
        const entry = state.entries.get(item.key);
        if (!entry || entry.kind !== item.kind) continue;
        if (entry.orig !== item.orig) continue; // 원본이 바뀐 편집은 적용하지 않음
        applyValue(entry, item.value);
        state.overrides.set(item.key, item);
      }
    }
  } catch {
    // 편집 내용을 못 받아도 원래 화면은 그대로 보여 준다
  } finally {
    readyDone();
  }

  // 관리자 표시 쿠키가 있을 때만 편집기를 받아 옴 (실제 권한은 편집기가 서버에 확인)
  if (/(?:^|;\s*)admin_ui=1(?:;|$)/.test(document.cookie)) {
    const { startEditor } = await import('./cms-editor.js');
    startEditor(state);
  }
}

init();
