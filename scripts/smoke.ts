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
