import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';

/**
 * 관리자 인증
 * - 비밀번호: 환경변수 ADMIN_PASSWORD
 * - 토큰 서명: 환경변수 TOKEN_SECRET (HS256)
 * - 토큰은 HttpOnly 쿠키로만 전달
 */
export const ADMIN_COOKIE = 'admin_token';
/**
 * 관리자 표시 쿠키 (비밀값 아님, 권한 없음).
 * 사이트 화면이 "편집기 코드를 받아 올지"만 판단하는 데 쓴다. 실제 권한은 admin_token 으로 서버가 확인.
 * 방문자에게는 이 쿠키가 없으므로 편집기 코드가 로드되지 않는다.
 */
export const ADMIN_HINT_COOKIE = 'admin_ui';
const COOKIE_PATH = '/api/admin';
const MIN_SECRET_LENGTH = 32;

export function adminConfigError(): string | null {
  if (!process.env.ADMIN_PASSWORD) return 'ADMIN_PASSWORD 미설정';
  if ((process.env.TOKEN_SECRET ?? '').length < MIN_SECRET_LENGTH) {
    return `TOKEN_SECRET 미설정 또는 ${MIN_SECRET_LENGTH}자 미만`;
  }
  return null;
}

function sha256(s: string): Buffer {
  return createHash('sha256').update(s, 'utf8').digest();
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  if (!expected) return false;
  return timingSafeEqual(sha256(input), sha256(expected));
}

export async function issueToken(hours: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: 'admin', iat: now, exp: now + hours * 3600 }, process.env.TOKEN_SECRET!, 'HS256');
}

async function isValidToken(token: string): Promise<boolean> {
  try {
    const payload = await verify(token, process.env.TOKEN_SECRET!, 'HS256');
    return payload.sub === 'admin';
  } catch {
    return false;
  }
}

function isHttps(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:' || c.req.header('x-forwarded-proto') === 'https' || !!process.env.VERCEL;
}

export function setAdminCookie(c: Context, token: string, hours: number): void {
  setCookie(c, ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Strict',
    path: COOKIE_PATH,
    maxAge: hours * 3600,
  });
  setAdminHintCookie(c, hours);
}

/** 사이트 화면에서 편집기를 불러오라는 표시 쿠키 (권한 아님) */
export function setAdminHintCookie(c: Context, hours: number): void {
  setCookie(c, ADMIN_HINT_COOKIE, '1', {
    secure: isHttps(c),
    sameSite: 'Strict',
    path: '/',
    maxAge: hours * 3600,
  });
}

export function clearAdminCookie(c: Context): void {
  deleteCookie(c, ADMIN_COOKIE, { path: COOKIE_PATH, secure: isHttps(c) });
  deleteCookie(c, ADMIN_HINT_COOKIE, { path: '/', secure: isHttps(c) });
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  if (adminConfigError()) return c.json({ error: 'admin_not_configured' }, 503);
  const token = getCookie(c, ADMIN_COOKIE);
  if (!token || !(await isValidToken(token))) return c.json({ error: 'unauthorized' }, 401);
  await next();
};

/**
 * 로그인 시도 제한 (IP 기준, 메모리).
 * 서버리스에서는 인스턴스마다 따로 세므로 "최소한의 방어"일 뿐이다.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;

export function clientIp(c: Context): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown';
}

export function isLoginBlocked(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() > a.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now > a.resetAt) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else a.count += 1;
}

export function clearLoginFailures(ip: string): void {
  attempts.delete(ip);
}
