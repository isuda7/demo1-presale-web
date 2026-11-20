import { Hono } from 'hono';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';
import { dbTarget, getDb } from './db/client.js';

/**
 * API 앱 (모든 경로는 /api 아래)
 * - 로컬: backend/dev-server.ts 가 실행
 * - Vercel: api/index.ts 가 실행
 */
export const app = new Hono().basePath('/api');

app.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
});

app.get('/health', async (c) => {
  let db = 'ok';
  try {
    await getDb().execute('SELECT 1');
  } catch {
    db = 'error';
  }
  return c.json({ ok: db === 'ok', db, target: dbTarget() }, db === 'ok' ? 200 : 503);
});

app.route('/', publicRoutes);
app.route('/admin', adminRoutes);

app.notFound((c) => c.json({ error: 'not_found' }, 404));

app.onError((err, c) => {
  console.error('[api]', err);
  return c.json({ error: 'server_error' }, 500);
});
