// API 호출 공통 (같은 도메인의 /api, 쿠키 포함)
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // JSON 이 아닌 응답
  }
  return { ok: res.ok, status: res.status, data };
}
