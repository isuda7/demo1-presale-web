/**
 * DB 테이블 생성 (npm run db:init)
 * .env.local 의 TURSO_DATABASE_URL 이 있으면 Turso, 없으면 ./local.db.
 * (API 도 첫 요청 때 자동 생성하므로 필수는 아님)
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  // .env.local 없음 → 로컬 DB
}

const { dbTarget, getDb } = await import('../backend/db/client.js');
const { ensureSchema } = await import('../backend/db/schema.js');

await ensureSchema();
const rs = await getDb().execute('SELECT COUNT(*) AS n FROM applications');
console.log(`DB 준비 완료 (대상: ${dbTarget()}, 신청 ${String(rs.rows[0]?.n)}건)`);
