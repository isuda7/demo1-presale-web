import { randomBytes } from 'node:crypto';
import type { CmsItem, CmsKind, CmsValue } from '../../shared/cms.js';
import { getDb } from './client.js';
import { ensureSchema } from './schema.js';

export async function getOverrides(page: string): Promise<CmsItem[]> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: 'SELECT key, kind, orig, value FROM content_overrides WHERE page = ? ORDER BY key',
    args: [page],
  });
  return rs.rows.map((r) => ({
    key: String(r.key),
    kind: String(r.kind) as CmsKind,
    orig: String(r.orig),
    value: JSON.parse(String(r.value)) as CmsValue,
  }));
}

/** 저장(덮어쓰기)과 원래대로(삭제)를 한 번에 처리 */
export async function saveOverrides(page: string, set: CmsItem[], remove: string[]): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  const stmts = [
    ...set.map((i) => ({
      sql: `INSERT INTO content_overrides (page, key, kind, orig, value, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (page, key) DO UPDATE SET
              kind = excluded.kind, orig = excluded.orig, value = excluded.value, updated_at = excluded.updated_at`,
      args: [page, i.key, i.kind, i.orig, JSON.stringify(i.value), now],
    })),
    ...remove.map((key) => ({ sql: 'DELETE FROM content_overrides WHERE page = ? AND key = ?', args: [page, key] })),
  ];
  if (stmts.length) await getDb().batch(stmts, 'write');
}

export async function insertMedia(mime: string, data: Uint8Array): Promise<string> {
  await ensureSchema();
  const id = randomBytes(12).toString('hex');
  await getDb().execute({
    sql: 'INSERT INTO media (id, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, mime, data.byteLength, data, new Date().toISOString()],
  });
  return id;
}

export async function getMedia(id: string): Promise<{ mime: string; data: Uint8Array } | null> {
  await ensureSchema();
  const rs = await getDb().execute({ sql: 'SELECT mime, data FROM media WHERE id = ?', args: [id] });
  const row = rs.rows[0];
  if (!row) return null;
  const raw = row.data as ArrayBuffer | Uint8Array;
  return { mime: String(row.mime), data: raw instanceof Uint8Array ? raw : new Uint8Array(raw) };
}
