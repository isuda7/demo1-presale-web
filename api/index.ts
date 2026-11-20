/**
 * Vercel 서버리스 진입점 (Node.js 런타임, Web 표준 핸들러)
 * vercel.json 의 rewrites 로 /api/* 요청이 모두 이 함수로 들어온다.
 */
import { app } from '../backend/app.js';

const handler = (request: Request): Response | Promise<Response> => app.fetch(request);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
