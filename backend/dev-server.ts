/**
 * 로컬 API 서버 (npm run dev:api)
 * .env.local 을 읽고 http://localhost:8787 에서 /api 를 제공한다.
 * 프론트(Vite)는 /api 요청을 이 서버로 프록시한다.
 */
import { serve } from '@hono/node-server';

try {
  process.loadEnvFile('.env.local');
} catch {
  console.warn('[dev-server] .env.local 없음 — 관리자 로그인은 동작하지 않습니다. (.env.example 참고)');
}

const { app } = await import('./app.js');
const { dbTarget } = await import('./db/client.js');

const port = Number(process.env.API_PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[dev-server] API http://localhost:${info.port}/api  (DB: ${dbTarget()})`);
});
