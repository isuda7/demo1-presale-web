# 사이트 설계 — 구축 초안

> 상태: **구축 초안** — 레이아웃·페이지 형식·필수 화면만 있는 상태. 콘텐츠·디자인·유형(템플릿)은 적용하지 않았다.
> 표기: **미확인** = 확인하지 못해 비워 둔 것 / **미확정** = 결정이 필요해 빈칸·초안으로 둔 것

## 1. 환경

| 구분 | 사용 | 로컬 | 배포 |
| --- | --- | --- | --- |
| 코드 | GitHub | — | push 시 Vercel 자동 배포 |
| 프론트엔드 | HTML/CSS/JS, Vite 멀티페이지 | `vite` (5173) | `frontend/dist` 정적 배포 |
| 백엔드 | Hono | `backend/dev-server.ts` (8787) | `api/index.ts` 서버리스 함수 |
| 데이터 | Turso(libSQL) | `./local.db` 파일 | Turso |

로컬에서는 Vite 가 `/api` 요청을 8787 포트로 프록시하므로, 배포와 같은 주소 구조(`/api/...`)로 동작한다.

## 2. 폴더

```
api/        Vercel 진입점 (index.ts → backend/app.ts)
backend/    API·DB
  app.ts          Hono 앱 (/api 기준 경로)
  dev-server.ts   로컬 실행용 Node 서버 (.env.local 로드)
  db/             client(접속), schema(테이블), applications(신청 데이터)
  routes/         public(신청), admin(관리자)
  lib/            auth(로그인·토큰), csv, apply-status(마감 스위치)
frontend/   화면·페이지·빌드 설정
  vite.config.ts  멀티페이지 빌드 (활성 페이지만 입력)
  build/layout.ts 공통 레이아웃(head·header·title·footer) 주입 플러그인
  <페이지>/index.html, index.html(메인)
  src/styles/base.css, src/js/(common, api, apply, admin)
shared/     설정·폼 정의 (프론트·백엔드 공용)
  config/         schema(타입), base(기본), merge(병합 규칙), index(최종 config)
  presets/        유형(템플릿) 등록부 — 현재 비어 있음
  forms/apply.ts  신청 폼 필드·검증
  site.ts         현장 설정 (마지막 덮어쓰기)
doc/        사이트설계 문서
scripts/    점검·콘텐츠 도구
```

## 3. 설정 구조 (기본 → 유형 → 현장)

```
shared/config/base.ts  ──▶  shared/presets/<유형>.ts  ──▶  shared/site.ts
   (단독으로 완결)            (선택, site.ts 의 preset)       (현장 값)
```

- 병합 규칙: 객체는 키 단위로 병합, **배열·값은 통째로 교체**, `undefined` 는 무시.
- 기본(base)만으로 완전한 사이트: `site.ts` 를 비워도(`{}`) 메인·사업개요·입지환경·단지배치·세대안내·분양안내·관심고객등록·개인정보처리방침·관리자가 동작.
- 유형 추가: `shared/presets/<이름>.ts` 작성 → `presets/index.ts` 에 등록 → `site.ts` 의 `preset` 에 이름 지정. (현재 등록된 유형 없음)
- 비밀값은 설정 파일에 넣지 않는다 (아래 6. 환경변수).

## 4. 페이지

참고 카탈로그: `https://vertium.hobanapt.co.kr/hobansummit-cjdn/final/e_book/`
카탈로그 목차(1쪽)에서 확인한 항목: INTRO, LOCATION, DESIGN, LANDSCAPE, COMMUNITY, PLOT PLAN, UNIT PLAN, INFORMATION, BRAND PR, CHECK LIST

| 페이지 ID | 경로 | 이름 | base | site.ts | 카탈로그 목차 |
| --- | --- | --- | --- | --- | --- |
| home | `/` | 메인 | 켜짐 | — | INTRO |
| overview | `/overview/` | 사업개요 | 켜짐 | (메뉴 제외) | 없음 — 기본 페이지로 유지 |
| location | `/location/` | 입지환경 | 켜짐 | 메뉴 | LOCATION |
| design | `/design/` | 단지설계 | 꺼짐 | 켬 | DESIGN |
| landscape | `/landscape/` | 조경 | 꺼짐 | 켬 | LANDSCAPE |
| community | `/community/` | 커뮤니티 | 꺼짐 | 켬 | COMMUNITY |
| plot-plan | `/plot-plan/` | 단지배치 | 켜짐 | 메뉴 | PLOT PLAN |
| unit-plan | `/unit-plan/` | 세대안내 | 켜짐 | 메뉴 | UNIT PLAN |
| information | `/information/` | 분양안내 | 켜짐 | 메뉴 | INFORMATION |
| brand | `/brand/` | 브랜드 | 꺼짐 | 켬 | BRAND PR |
| checklist | `/checklist/` | 체크리스트 | 꺼짐 | 켬 | CHECK LIST |
| apply | `/apply/` | 관심고객등록 | 켜짐 (시스템) | 메뉴 | — |
| privacy | `/privacy/` | 개인정보처리방침 | 켜짐 (시스템) | 푸터 | — |
| admin | `/admin/` | 관리자 | 켜짐 (시스템, noindex) | — | — |

- 한글 페이지 이름은 목차의 영문 항목을 옮긴 **가칭**이다. 각 목차 항목이 카탈로그의 어느 쪽에 대응하는지, 하위 구성(탭·세부 페이지)이 있는지는 **미확인**.
- overview(사업개요)를 메뉴에 넣을지, INFORMATION 에 합칠지는 **미확정**.
- 메뉴는 1단(평면) 구조. 대메뉴·하위메뉴 그룹 구성은 **미확정**.
- 콘텐츠 자리: 각 페이지의 `data-slot` 영역은 비어 있으며 화면에 회색 점선 박스로 표시된다.
- 새 페이지 추가: `base.ts`(또는 `site.ts`) `pages` 에 정의 → `npm run pages:scaffold` → `nav` 에 추가.

## 5. 신청·관리자

### 신청 (`/apply/`)
- 필드: 성함(필수, 30자) · 연락처(필수, 숫자 9~11자리, 0으로 시작) · 문의사항(선택, 1000자) · 개인정보 동의(필수)
- 정의 위치: `shared/forms/apply.ts` — 화면 생성과 서버 검증이 같은 정의를 사용.
- 스팸 방지: 숨김 필드(`website`)에 값이 있으면 저장하지 않음.
- **마감 스위치**: `shared/site.ts` → `apply.open: false` 후 배포
  - 화면: 폼을 숨기고 `apply.closedMessage` 안내만 표시 (`GET /api/apply/status`)
  - 서버: `POST /api/apply` 를 403 으로 거부

### 관리자 (`/admin/`)
- 비밀번호 로그인(`ADMIN_PASSWORD`) → `TOKEN_SECRET` 으로 서명한 토큰(HS256)을 HttpOnly·SameSite=Strict 쿠키(경로 `/api/admin`)로 발급. 유지 시간 `admin.sessionHours`(기본 8시간).
- 목록: 검색(성함·문의사항, 숫자는 연락처) · 상태 · 기간(신청일, 한국시간 기준) · 페이지 이동
- 상태 변경, 삭제(확인 후 영구 삭제), 현재 필터 기준 CSV 내려받기(엑셀용 BOM, 수식 주입 방지)
- 로그인 시도 제한: IP 당 10분 10회 (메모리 기반 — 서버리스 인스턴스마다 따로 세므로 보조 수단)
- 처리 상태 값(`접수`, `처리완료`)은 **초안**. 운영 방식에 맞춰 `site.ts` 의 `admin.statuses` 로 덮어쓴다.

### API

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/health` | 서버·DB 상태 |
| GET | `/api/apply/status` | 신청 접수 여부 |
| POST | `/api/apply` | 신청 저장 (201 / 422 검증오류 / 403 마감) |
| POST | `/api/admin/login` | 로그인 |
| POST | `/api/admin/logout` | 로그아웃 |
| GET | `/api/admin/me` | 로그인 확인·상태 목록 |
| GET | `/api/admin/applications` | 목록 (`q`, `status`, `from`, `to`, `page`) |
| GET | `/api/admin/applications.csv` | CSV (목록과 같은 필터) |
| PATCH | `/api/admin/applications/:id` | 상태 변경 `{status}` |
| DELETE | `/api/admin/applications/:id` | 삭제 |

### DB — `applications`

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | INTEGER PK | 자동 증가 |
| name | TEXT | 성함 |
| phone | TEXT | 연락처(숫자만 저장, 표시할 때 하이픈) |
| message | TEXT | 문의사항 |
| privacy_agreed_at | TEXT | 개인정보 동의 일시 (UTC ISO) |
| status | TEXT | 처리 상태 |
| created_at | TEXT | 신청 일시 (UTC ISO) |

테이블은 API 첫 요청 때 자동 생성된다(`CREATE TABLE IF NOT EXISTS`). 수동 생성: `npm run db:init`.

## 6. 환경변수

| 이름 | 용도 | 로컬 | 배포(Vercel) |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | 관리자 비밀번호 | `.env.local` | Project Settings → Environment Variables |
| `TOKEN_SECRET` | 토큰 서명 (32자 이상) | `.env.local` | 〃 |
| `TURSO_DATABASE_URL` | Turso DB 주소 | 비움 → `local.db` | 〃 (필수) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 | 비움 | 〃 (필수) |

- 값은 코드·문서·`.env.example` 에 적지 않는다. `.env.local`, `local.db` 는 `.gitignore` 로 저장소 제외.
- `ADMIN_PASSWORD`·`TOKEN_SECRET` 이 없으면 관리자 API 는 503 을 반환한다(로그인 불가).
- Vercel 에서 `TURSO_DATABASE_URL` 이 없으면 DB 접근 시 오류를 낸다(파일 DB 로 대체하지 않음).
- `TOKEN_SECRET` 을 바꾸면 기존 로그인은 모두 무효가 된다.

## 7. 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (TOKEN_SECRET 예: openssl rand -hex 32)
npm run dev                  # http://localhost:5173  (API 8787)
```

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | API + 프론트 동시 실행 |
| `npm run build` | 프론트 빌드 (`frontend/dist`) |
| `npm run typecheck` | TypeScript 검사 |
| `npm run check` | 설정·페이지·import 규칙·비밀값 관리 점검 |
| `npm run smoke` | 임시 DB 로 API 전체 흐름 점검 |
| `npm run db:init` | DB 테이블 생성 |
| `npm run pages:scaffold` | 설정에 있는데 HTML 이 없는 페이지 생성 |

## 8. 배포 (Vercel)

1. GitHub 저장소를 Vercel 프로젝트로 가져오기 (설정은 `vercel.json` 이 지정: 빌드 `npm run build`, 출력 `frontend/dist`, `/api/*` → `api/index.ts`)
2. Turso DB 생성 후 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 등록
3. `ADMIN_PASSWORD`, `TOKEN_SECRET` 등록
4. push → 자동 배포 → `/api/health` 에서 `"target":"turso"` 확인

### 코드 규칙
- `backend/`, `shared/`, `api/`, `scripts/` 의 상대 import 는 **`.js` 확장자**를 붙인다 (서버리스 런타임 모듈 해석 오류 방지). `npm run check` 와 `tsc`(NodeNext)가 검사한다.
- 프론트 JS 에서 shared 를 쓸 때는 별칭 `@shared/...ts` 로 가져온다 (Vite 가 번들).

## 9. 미확인·미확정 목록

| 구분 | 항목 | 위치 |
| --- | --- | --- |
| 미확정 | 개인정보 수집·이용 동의문 | `shared/site.ts` `privacy.consentText` (화면에 "[미확정]" 표시 중) |
| 미확정 | 개인정보 보유·이용 기간 문구 | `shared/site.ts` `privacy.retentionText` |
| 미확정 | 개인정보처리방침 본문 | `frontend/privacy/index.html` |
| 미확정 | 현장명·사이트 설명·푸터 사업자 정보 | `shared/site.ts` `site`, `footer.lines` |
| 미확정 | 신청 처리 상태 구분 (현재 초안: 접수/처리완료) | `admin.statuses` |
| 미확정 | 메뉴 그룹 구성, 사업개요 페이지 노출 여부 | `nav`, `pages.overview` |
| 미확인 | 카탈로그 목차 항목별 대응 쪽수·세부 구성 | — |
| 미확인 | 카탈로그 1쪽의 "청주 동남지구 B8블록", 표지의 브랜드 표기가 사이트명으로 확정된 것인지 | — |
| 미확인 | Vercel 실제 배포 동작(rewrites 경로 전달, libsql 함수 번들) — 로컬에서만 검증 | — |
| 미확인 | Turso 원격 접속 — 로컬은 파일 DB 로만 검증 | — |
