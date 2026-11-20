import { Hono, type Context } from 'hono';
import { config } from '../../shared/config/index.js';
import { formatPhone } from '../../shared/forms/apply.js';
import {
  deleteApplication,
  listAllApplications,
  listApplications,
  updateApplicationStatus,
  type ListFilter,
} from '../db/applications.js';
import {
  adminConfigError,
  checkPassword,
  clearAdminCookie,
  clearLoginFailures,
  clientIp,
  isLoginBlocked,
  issueToken,
  recordLoginFailure,
  requireAdmin,
  setAdminCookie,
} from '../lib/auth.js';
import { toCsv } from '../lib/csv.js';

export const adminRoutes = new Hono();

const statusValues = () => new Set(config.admin.statuses.map((s) => s.value));
const statusLabel = (v: string) => config.admin.statuses.find((s) => s.value === v)?.label ?? v;

function readFilter(c: Context): ListFilter {
  const status = c.req.query('status') ?? '';
  return {
    q: (c.req.query('q') ?? '').slice(0, 100),
    status: statusValues().has(status) ? status : undefined,
    from: c.req.query('from'),
    to: c.req.query('to'),
  };
}

function readId(c: Context): number | null {
  const id = Number(c.req.param('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** KST 표기 (YYYY-MM-DD HH:mm:ss) */
function kst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

adminRoutes.post('/login', async (c) => {
  const cfgErr = adminConfigError();
  if (cfgErr) {
    console.error(`[admin] 로그인 불가: ${cfgErr}`);
    return c.json({ error: 'admin_not_configured' }, 503);
  }
  const ip = clientIp(c);
  if (isLoginBlocked(ip)) return c.json({ error: 'too_many_attempts' }, 429);

  let password = '';
  try {
    const body = (await c.req.json()) as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return c.json({ error: 'bad_request' }, 400);
  }
  if (!checkPassword(password)) {
    recordLoginFailure(ip);
    return c.json({ error: 'invalid_password' }, 401);
  }
  clearLoginFailures(ip);
  const hours = config.admin.sessionHours;
  setAdminCookie(c, await issueToken(hours), hours);
  return c.json({ ok: true });
});

adminRoutes.post('/logout', (c) => {
  clearAdminCookie(c);
  return c.json({ ok: true });
});

adminRoutes.use('/me', requireAdmin);
adminRoutes.use('/applications', requireAdmin);
adminRoutes.use('/applications/*', requireAdmin);
adminRoutes.use('/applications.csv', requireAdmin);

adminRoutes.get('/me', (c) =>
  c.json({ ok: true, statuses: config.admin.statuses, pageSize: config.admin.pageSize }),
);

adminRoutes.get('/applications', async (c) => {
  const page = Math.max(1, Number.parseInt(c.req.query('page') ?? '1', 10) || 1);
  const pageSize = config.admin.pageSize;
  const { items, total } = await listApplications(readFilter(c), page, pageSize);
  return c.json({ items, total, page, pageSize });
});

adminRoutes.get('/applications.csv', async (c) => {
  const rows = await listAllApplications(readFilter(c));
  const csv = toCsv(
    ['번호', '성함', '연락처', '문의사항', '상태', '개인정보동의일시', '신청일시'],
    rows.map((r) => [
      r.id,
      r.name,
      formatPhone(r.phone),
      r.message,
      statusLabel(r.status),
      kst(r.privacyAgreedAt),
      kst(r.createdAt),
    ]),
  );
  const stamp = kst(new Date().toISOString()).slice(0, 10).replace(/-/g, '');
  return c.body(csv, 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="applications-${stamp}.csv"`,
  });
});

adminRoutes.patch('/applications/:id', async (c) => {
  const id = readId(c);
  if (!id) return c.json({ error: 'bad_request' }, 400);
  let status = '';
  try {
    const body = (await c.req.json()) as { status?: unknown };
    status = typeof body.status === 'string' ? body.status : '';
  } catch {
    return c.json({ error: 'bad_request' }, 400);
  }
  if (!statusValues().has(status)) return c.json({ error: 'invalid_status' }, 422);
  const ok = await updateApplicationStatus(id, status);
  return ok ? c.json({ ok: true }) : c.json({ error: 'not_found' }, 404);
});

adminRoutes.delete('/applications/:id', async (c) => {
  const id = readId(c);
  if (!id) return c.json({ error: 'bad_request' }, 400);
  const ok = await deleteApplication(id);
  return ok ? c.json({ ok: true }) : c.json({ error: 'not_found' }, 404);
});
