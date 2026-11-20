# 분양 사이트 — 구축 초안

Vite 멀티페이지(HTML/CSS/JS) + Hono API + Turso(로컬은 `local.db`), Vercel 배포.

```bash
npm install
cp .env.example .env.local   # ADMIN_PASSWORD, TOKEN_SECRET 입력
npm run dev                  # http://localhost:5173
```

설계·설정 구조·API·배포 절차·미확인 목록은 [doc/site-design.md](doc/site-design.md) 참고.
