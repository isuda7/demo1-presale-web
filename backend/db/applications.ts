import type { InValue, Row } from '@libsql/client';
import type { ApplyInput } from '../../shared/forms/apply.js';
import { getDb } from './client.js';
import { ensureSchema } from './schema.js';

export interface Application {
  id: number;
  name: string;
  phone: string;
  message: string;
  privacyAgreedAt: string;
  status: string;
  createdAt: string;
}

export interface ListFilter {
  /** 성함·연락처·문의사항 검색어 */
  q?: string;
  status?: string;
  /** 기간 시작일 YYYY-MM-DD (한국시간 기준, 포함) */
  from?: string;
  /** 기간 종료일 YYYY-MM-DD (한국시간 기준, 포함) */
  to?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 한국시간 날짜의 0시를 UTC ISO 문자열로 */
function kstDayStartUtc(date: string, addDays = 0): string {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString();
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function buildWhere(f: ListFilter): { sql: string; args: InValue[] } {
  const parts: string[] = [];
  const args: InValue[] = [];

  const q = f.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const digits = q.replace(/\D/g, '');
    const cond = ["name LIKE ? ESCAPE '\\'", "message LIKE ? ESCAPE '\\'"];
    args.push(like, like);
    if (digits) {
      cond.push('phone LIKE ?');
      args.push(`%${digits}%`);
    }
    parts.push(`(${cond.join(' OR ')})`);
  }
  if (f.status) {
    parts.push('status = ?');
    args.push(f.status);
  }
  if (f.from && DATE_RE.test(f.from)) {
    parts.push('created_at >= ?');
    args.push(kstDayStartUtc(f.from));
  }
  if (f.to && DATE_RE.test(f.to)) {
    parts.push('created_at < ?');
    args.push(kstDayStartUtc(f.to, 1));
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', args };
}

function toApplication(r: Row): Application {
  return {
    id: Number(r.id),
    name: String(r.name),
    phone: String(r.phone),
    message: String(r.message ?? ''),
    privacyAgreedAt: String(r.privacy_agreed_at),
    status: String(r.status),
    createdAt: String(r.created_at),
  };
}

const COLUMNS = 'id, name, phone, message, privacy_agreed_at, status, created_at';

export async function insertApplication(input: ApplyInput, status: string): Promise<number> {
  await ensureSchema();
  const now = new Date().toISOString();
  const rs = await getDb().execute({
    sql: `INSERT INTO applications (name, phone, message, privacy_agreed_at, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [input.name, input.phone, input.message, now, status, now],
  });
  return Number(rs.lastInsertRowid);
}

export async function listApplications(
  f: ListFilter,
  page: number,
  pageSize: number,
): Promise<{ items: Application[]; total: number }> {
  await ensureSchema();
  const { sql, args } = buildWhere(f);
  const db = getDb();
  const [countRs, rowsRs] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS n FROM applications ${sql}`, args }),
    db.execute({
      sql: `SELECT ${COLUMNS} FROM applications ${sql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      args: [...args, pageSize, (page - 1) * pageSize],
    }),
  ]);
  return { items: rowsRs.rows.map(toApplication), total: Number(countRs.rows[0]?.n ?? 0) };
}

/** CSV 내보내기용 전체 조회 (상한 적용) */
export async function listAllApplications(f: ListFilter, limit = 50000): Promise<Application[]> {
  await ensureSchema();
  const { sql, args } = buildWhere(f);
  const rs = await getDb().execute({
    sql: `SELECT ${COLUMNS} FROM applications ${sql} ORDER BY id DESC LIMIT ?`,
    args: [...args, limit],
  });
  return rs.rows.map(toApplication);
}

export async function updateApplicationStatus(id: number, status: string): Promise<boolean> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: 'UPDATE applications SET status = ? WHERE id = ?',
    args: [status, id],
  });
  return rs.rowsAffected > 0;
}

export async function deleteApplication(id: number): Promise<boolean> {
  await ensureSchema();
  const rs = await getDb().execute({ sql: 'DELETE FROM applications WHERE id = ?', args: [id] });
  return rs.rowsAffected > 0;
}
