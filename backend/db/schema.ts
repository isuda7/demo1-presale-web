import { getDb } from './client.js';

/** 테이블 정의. 첫 요청 시 한 번 실행(IF NOT EXISTS)된다. */
export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    privacy_agreed_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_applications_status ON applications (status)`,
];

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  ready ??= getDb()
    .batch(schemaStatements, 'write')
    .then(() => undefined)
    .catch((err: unknown) => {
      ready = null;
      throw err;
    });
  return ready;
}
