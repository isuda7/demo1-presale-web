/**
 * API 동작 점검 (npm run smoke)
 * 임시 DB 파일과 이 실행에서만 쓰는 무작위 비밀값으로 API 를 직접 호출해 본다.
 * .env.local·local.db 는 건드리지 않는다.
 */
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'presale-smoke-'));
process.env.TURSO_DATABASE_URL = `file:${join(dir, 'smoke.db')}`;
delete process.env.TURSO_AUTH_TOKEN;
const password = randomBytes(12).toString('hex');
process.env.ADMIN_PASSWORD = password;
process.env.TOKEN_SECRET = randomBytes(32).toString('hex');

const { app } = await import('../backend/app.js');
const { config } = await import('../shared/config/index.js');

let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? '통과' : '실패'}  ${name}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failed++;
}
const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

try {
  const originalOpen = config.apply.open;
  config.apply.open = true;

  let r = await app.request('/api/health');
  check('health', r.status === 200, String(r.status));

  r = await app.request('/api/apply', json({ name: '', phone: '123', privacyAgree: false }));
  check('신청 검증 오류 422', r.status === 422, String(r.status));

  r = await app.request('/api/apply', json({ name: '테스트', phone: '010-1234-5678', message: '=문의', privacyAgree: true }));
  check('신청 저장 201', r.status === 201, String(r.status));

  r = await app.request('/api/admin/applications');
  check('미로그인 목록 401', r.status === 401, String(r.status));

  r = await app.request('/api/admin/login', json({ password: 'wrong' }));
  check('틀린 비밀번호 401', r.status === 401, String(r.status));

  r = await app.request('/api/admin/login', json({ password }));
  const cookie = (r.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  check('로그인 200 + HttpOnly 쿠키', r.status === 200 && /HttpOnly/i.test(r.headers.get('set-cookie') ?? ''));
  const auth = { headers: { Cookie: cookie } };

  r = await app.request('/api/admin/applications?q=1234', auth);
  const list = (await r.json()) as { total: number; items: { id: number }[] };
  check('목록 검색', r.status === 200 && list.total === 1, JSON.stringify(list));
  const id = list.items[0]?.id;

  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  r = await app.request(`/api/admin/applications?from=${today}&to=${today}&status=new`, auth);
  check('기간·상태 필터', ((await r.json()) as { total: number }).total === 1);

  r = await app.request(`/api/admin/applications/${id}`, {
    method: 'PATCH',
    headers: { ...auth.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  });
  check('상태 변경', r.status === 200, String(r.status));

  r = await app.request('/api/admin/applications.csv', auth);
  // text() 는 BOM 을 떼어내므로 바이트로 확인
  const bytes = new Uint8Array(await r.arrayBuffer());
  const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const csv = new TextDecoder().decode(bytes);
  check('CSV (BOM·수식방지)', r.status === 200 && hasBom && csv.includes("'=문의"), csv.slice(0, 120));

  r = await app.request(`/api/admin/applications/${id}`, { method: 'DELETE', ...auth });
  check('삭제', r.status === 200, String(r.status));

  // ---- 화면 편집(CMS) ----
  const loginCookies = r.headers.get('set-cookie') ?? '';
  r = await app.request('/api/admin/login', json({ password }));
  const setCookies = r.headers.getSetCookie?.() ?? [];
  check('로그인 시 관리자 표시 쿠키(admin_ui) 발급', setCookies.some((s) => s.startsWith('admin_ui=1') && !/HttpOnly/i.test(s)), loginCookies);
  const putJson = (body: unknown, withAuth = true) => ({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(withAuth ? auth.headers : {}) },
    body: JSON.stringify(body),
  });

  r = await app.request('/api/content/home');
  check('공개 편집내용 조회', r.status === 200 && ((await r.json()) as { items: unknown[] }).items.length === 0);
  r = await app.request('/api/content/admin');
  check('관리자 페이지는 편집 대상 아님 404', r.status === 404, String(r.status));

  const item = { key: 'text:0', kind: 'text', orig: 'abc123', value: { html: '새 <em>문구</em><br>입니다' } };
  r = await app.request('/api/admin/content/home', putJson({ set: [item] }, false));
  check('미로그인 편집 저장 401', r.status === 401, String(r.status));
  r = await app.request('/api/admin/content/home', putJson({ set: [item] }));
  check('편집 저장', r.status === 200, String(r.status));
  r = await app.request('/api/admin/content/home', putJson({ set: [{ ...item, value: { html: '<img src=x onerror=alert(1)>' } }] }));
  check('허용 안 된 태그 거부 422', r.status === 422, String(r.status));
  r = await app.request('/api/admin/content/home', putJson({ set: [{ key: 'link:0', kind: 'link', orig: 'a1', value: { html: 'x', href: 'javascript:alert(1)' } }] }));
  check('javascript: 링크 거부 422', r.status === 422, String(r.status));
  r = await app.request('/api/admin/content/home', putJson({ set: [{ key: 'img:0', kind: 'img', orig: 'a1', value: { src: '//evil.example/a.png' } }] }));
  check('외부 // 이미지 주소 거부 422', r.status === 422, String(r.status));
  r = await app.request('/api/content/home');
  const saved = ((await r.json()) as { items: { key: string }[] }).items;
  check('저장 내용 공개 조회', saved.length === 1 && saved[0]?.key === 'text:0');
  r = await app.request('/api/admin/content/home', putJson({ remove: ['text:0'] }));
  check('원래대로(삭제)', r.status === 200 && ((await r.json()) as { items: unknown[] }).items.length === 0);

  // 이미지 업로드: PNG 시그니처를 가진 작은 바이트열, SVG 는 거부
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  let fd = new FormData();
  fd.append('file', new File([png], 'a.png', { type: 'image/png' }));
  r = await app.request('/api/admin/media', { method: 'POST', body: fd, ...auth });
  const media = (await r.json()) as { url?: string };
  check('이미지 업로드 201', r.status === 201 && !!media.url, JSON.stringify(media));
  r = await app.request(media.url ?? '/api/media/none');
  check(
    '업로드 이미지 제공 (형식·캐시)',
    r.status === 200 && r.headers.get('content-type') === 'image/png' && /immutable/.test(r.headers.get('cache-control') ?? ''),
    `${r.status} ${r.headers.get('content-type')} ${r.headers.get('cache-control')}`,
  );
  fd = new FormData();
  fd.append('file', new File(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], 'a.svg', { type: 'image/svg+xml' }));
  r = await app.request('/api/admin/media', { method: 'POST', body: fd, ...auth });
  check('SVG 업로드 거부 415', r.status === 415, String(r.status));
  fd = new FormData();
  fd.append('file', new File([png], 'a.png', { type: 'image/png' }));
  r = await app.request('/api/admin/media', { method: 'POST', body: fd });
  check('미로그인 업로드 401', r.status === 401, String(r.status));

  r = await app.request('/api/admin/logout', { method: 'POST', ...auth });
  const outCookies = r.headers.getSetCookie?.() ?? [];
  check('로그아웃 시 관리자 표시 쿠키 삭제', outCookies.some((s) => s.startsWith('admin_ui=;')), outCookies.join(' | '));

  config.apply.open = false;
  r = await app.request('/api/apply/status');
  check('마감 상태 조회', ((await r.json()) as { open: boolean }).open === false);
  r = await app.request('/api/apply', json({ name: '테스트', phone: '01012345678', privacyAgree: true }));
  check('마감 시 서버 거부 403', r.status === 403, String(r.status));
  config.apply.open = originalOpen;
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(failed ? `\n실패 ${failed}건` : '\n모두 통과');
process.exit(failed ? 1 : 0);
