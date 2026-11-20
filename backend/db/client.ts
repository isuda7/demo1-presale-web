import { createClient, type Client } from '@libsql/client';

/**
 * DB 연결
 * - TURSO_DATABASE_URL 이 있으면 Turso(원격)
 * - 없으면 로컬 파일 ./local.db (Vercel 에서는 파일 DB 불가 → 오류)
 */
let client: Client | null = null;

export type DbTarget = 'turso' | 'local';

export function dbTarget(): DbTarget {
  return process.env.TURSO_DATABASE_URL ? 'turso' : 'local';
}

export function getDb(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  } else {
    if (process.env.VERCEL) {
      throw new Error('TURSO_DATABASE_URL 환경변수가 설정되지 않았습니다.');
    }
    client = createClient({ url: 'file:local.db' });
  }
  return client;
}
