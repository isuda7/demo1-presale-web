import { Hono } from 'hono';
import { config } from '../../shared/config/index.js';
import { HONEYPOT_FIELD, validateApply } from '../../shared/forms/apply.js';
import { insertApplication } from '../db/applications.js';
import { isApplyOpen } from '../lib/apply-status.js';

export const publicRoutes = new Hono();

/** 신청 접수 상태 */
publicRoutes.get('/apply/status', (c) => {
  const open = isApplyOpen();
  return c.json({ open, message: open ? '' : config.apply.closedMessage });
});

/** 관심고객 신청 */
publicRoutes.post('/apply', async (c) => {
  if (!isApplyOpen()) {
    return c.json({ error: 'closed', message: config.apply.closedMessage }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await c.req.json();
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return c.json({ error: 'bad_request' }, 400);
  }

  // 숨김 필드에 값이 있으면 저장하지 않고 성공처럼 응답
  if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD] !== '') {
    return c.json({ ok: true, message: config.apply.doneMessage }, 201);
  }

  const result = validateApply(body);
  if (!result.ok) return c.json({ error: 'validation', errors: result.errors }, 422);

  await insertApplication(result.data, config.admin.defaultStatus);
  return c.json({ ok: true, message: config.apply.doneMessage }, 201);
});
