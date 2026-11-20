/**
 * 화면 편집(CMS) 공통 규칙 — 프론트(적용·편집기)와 백엔드(검증)가 함께 쓴다.
 *
 * 편집 단위(kind)
 *   text : 문장 (허용 태그만 남긴 HTML)
 *   link : 글자가 있는 링크·버튼 (HTML + 주소)
 *   href : 이미지·카드 등을 감싼 링크 (주소만)
 *   img  : 이미지 (주소 + 대체텍스트)
 *   bg   : 배경 이미지 (주소)
 * 키 형식: "<kind>:<순번>" — 페이지 안에서 같은 종류끼리 문서 순서대로 매긴 번호
 */

export const CMS_KINDS = ['text', 'link', 'href', 'img', 'bg'] as const;
export type CmsKind = (typeof CMS_KINDS)[number];

export const CMS_KEY_RE = /^(text|link|href|img|bg):\d{1,4}$/;

/** 문장 안에서 허용하는 태그 (속성은 class 만) */
export const CMS_ALLOWED_TAGS = ['br', 'em', 'strong', 'small', 'b', 'i', 'span', 'sup', 'sub'];

export const CMS_MAX_HTML = 5000;
export const CMS_MAX_ITEMS = 300;
export const MEDIA_MAX_BYTES = 2 * 1024 * 1024;

export interface CmsValue {
  html?: string;
  href?: string;
  src?: string;
  alt?: string;
}

export interface CmsItem {
  key: string;
  kind: CmsKind;
  /** 편집 당시 원래 내용의 해시 — 원본 HTML 이 바뀌면 적용하지 않기 위한 안전장치 */
  orig: string;
  value: CmsValue;
}

/** 링크 주소 허용 범위: 사이트 내부 경로, #, http(s), tel:, mailto: */
export function isSafeHref(href: string): boolean {
  if (href.length > 500) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (href.startsWith('#')) return true;
  return /^(https?:\/\/|tel:|mailto:)[^\s<>"']+$/i.test(href);
}

/** 이미지 주소 허용 범위: 사이트 내부 경로(/images, /api/media), https */
export function isSafeSrc(src: string): boolean {
  if (src.length > 500) return false;
  if (/^\/(images|api\/media)\/[\w\-./]+$/.test(src) && !src.includes('..')) return true;
  return /^https:\/\/[^\s<>"'()]+$/i.test(src);
}

/** 허용 태그·class 속성만 있는지 검사 (서버 검증용, 고치지 않고 거부) */
export function isSafeHtml(html: string): boolean {
  if (html.length > CMS_MAX_HTML) return false;
  const tagRe = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
  let rest = html;
  for (const m of html.matchAll(tagRe)) {
    const name = m[1]!.toLowerCase();
    if (!CMS_ALLOWED_TAGS.includes(name)) return false;
    const attrs = m[2]!.trim().replace(/\/$/, '').trim();
    if (attrs && !/^class="[\w\- ]*"$/.test(attrs)) return false;
    rest = rest.replace(m[0], '');
  }
  // 태그를 지운 나머지에 < 또는 > 가 남아 있으면 깨진 태그로 간주
  return !/[<>]/.test(rest);
}

/** 키·종류·값 형태 검증. 문제가 있으면 오류 문구, 없으면 null */
export function validateCmsItem(item: unknown): string | null {
  if (typeof item !== 'object' || item === null) return '형식 오류';
  const { key, kind, orig, value } = item as Record<string, unknown>;
  if (typeof key !== 'string' || !CMS_KEY_RE.test(key)) return '키 형식 오류';
  if (typeof kind !== 'string' || !key.startsWith(`${kind}:`)) return '종류 불일치';
  if (typeof orig !== 'string' || !/^[0-9a-z]{1,16}$/.test(orig)) return '원본 해시 오류';
  if (typeof value !== 'object' || value === null) return '값 형식 오류';
  const v = value as Record<string, unknown>;
  const str = (x: unknown) => typeof x === 'string';

  switch (kind as CmsKind) {
    case 'text':
      return str(v.html) && isSafeHtml(v.html as string) ? null : '허용되지 않은 문장 서식';
    case 'link':
      if (!str(v.html) || !isSafeHtml(v.html as string)) return '허용되지 않은 문장 서식';
      return str(v.href) && isSafeHref(v.href as string) ? null : '허용되지 않은 링크 주소';
    case 'href':
      return str(v.href) && isSafeHref(v.href as string) ? null : '허용되지 않은 링크 주소';
    case 'img':
      if (!str(v.src) || !isSafeSrc(v.src as string)) return '허용되지 않은 이미지 주소';
      return v.alt === undefined || (str(v.alt) && (v.alt as string).length <= 300) ? null : '대체텍스트 오류';
    case 'bg':
      return str(v.src) && isSafeSrc(v.src as string) ? null : '허용되지 않은 이미지 주소';
    default:
      return '알 수 없는 종류';
  }
}

/** 짧은 문자열 해시 (FNV-1a 32bit, 36진수) */
export function cmsHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
