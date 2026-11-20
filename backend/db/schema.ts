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
  // 화면 편집 내용 (페이지·요소 키 단위)
  `CREATE TABLE IF NOT EXISTS content_overrides (
    page TEXT NOT NULL,
    key TEXT NOT NULL,
    kind TEXT NOT NULL,
    orig TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (page, key)
  )`,
  // 화면 편집에서 올린 이미지
  `CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL
  )`,
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
