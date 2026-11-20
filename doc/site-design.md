# 사이트 설계

> 상태: **콘텐츠·디자인 1차 반영** — 참고 카탈로그(e-book) 24장 전체를 열람해 페이지 구성·문구·이미지·톤을 반영했다. 유형(템플릿)은 적용하지 않았다.
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

참고 카탈로그: `https://vertium.hobanapt.co.kr/hobansummit-cjdn/final/e_book/` — 이미지 24장(표지, 1~11쪽 좌·우, 뒤표지)

### 카탈로그 쪽 ↔ 사이트 페이지

| 카탈로그 쪽 (파일) | 내용 | 사이트 페이지 |
| --- | --- | --- |
| 표지 (page0_2) | HOBAN SUMMIT BROOKSIDE 로고 | 브랜드 |
| 1쪽 좌 (page1_1) | 목차 | 메뉴 구성 근거 |
| 1쪽 우 (page1_2) | "하나만 선택해야 한다면," 단지 모형 | 미반영 (광고 카피 쪽) |
| 2쪽 (page2_1·2_2) | 청주에 새로운 기준을 짓다 / 견본주택 사진 | 메인, 브랜드 |
| 3쪽 (page3_1·3_2) | 청주 첫 번째 호반써밋 / 사업개요 / 외관 투시도 | 메인, 사업개요 |
| 4쪽 (page4_1·4_2) | 기대되는 이름·가치 / 5대 환경 / 입지 지도 | 입지환경 |
| 5쪽 (page5_1·5_2) | 호반써밋의 품격 대단지의 여유 / 설계 특화 5가지 | 단지설계 |
| 6쪽 (page6_1·6_2) | 테마조경 / HEALING 6가지 | 조경 |
| 7쪽 (page7_1·7_2) | 커뮤니티 시설 9종 / 시설 배치 투시도 | 커뮤니티 |
| 8쪽 (page8_1·8_2) | 동·호수 배치도 / 동·호수 배치표 | 단지배치 |
| 9~10쪽 (page9_1~10_2) | UNIT PLAN 74㎡A·74㎡B·84㎡ 면적·평면·유상옵션 | 세대안내 |
| 11쪽 (page11_1·11_2) | 분양안내(공급대상·금액·일정·계좌·구비서류·발코니·옵션) | 분양안내 (일부, 아래 참고) |
| 뒤표지 (end_1) | HOBAN / 청주 동남지구 B8블록 / 홈페이지 주소 | 미반영 |

### 페이지·메뉴

| 메뉴 그룹 | 페이지 ID | 경로 | 이름 | 비고 |
| --- | --- | --- | --- | --- |
| — | home | `/` | 메인 | INTRO |
| 사업안내 | overview | `/overview/` | 사업개요 | |
| 사업안내 | brand | `/brand/` | 브랜드 | 목차 BRAND PR. 독립 쪽이 없어 2쪽 견본주택 내용 배치 |
| 사업안내 | location | `/location/` | 입지환경 | |
| 단지안내 | design | `/design/` | 단지설계 | |
| 단지안내 | landscape | `/landscape/` | 조경 | |
| 단지안내 | community | `/community/` | 커뮤니티 | |
| 단지안내 | plot-plan | `/plot-plan/` | 단지배치 | |
| — | unit-plan | `/unit-plan/` | 세대안내 | 주택형 3개는 한 페이지 안 앵커 이동 |
| — | information | `/information/` | 분양안내 | |
| — | apply | `/apply/` | 관심고객등록 | 시스템 |
| (푸터) | privacy | `/privacy/` | 개인정보처리방침 | 시스템, 본문 미확정 |
| — | admin | `/admin/` | 관리자 | 시스템, noindex |
| (꺼짐) | checklist | `/checklist/` | 체크리스트 | 목차 CHECK LIST. e-book 본문에 해당 쪽 없음 → 비활성 |

- 메뉴는 그룹(대메뉴 → 하위) 구조를 지원한다: `nav` 항목에 `{ title, children: [...] }`. 그룹 이름(사업안내·단지안내)과 묶음은 **임의 구성**이다.
- 페이지 제목 영역의 영문 표기(eyebrow)·배경 이미지는 `site.ts` 의 `pages.<id>.eyebrow / heroImage`.
- 새 페이지 추가: `base.ts`(또는 `site.ts`) `pages` 에 정의 → `npm run pages:scaffold` → `nav` 에 추가.

### 콘텐츠 반영 원칙
- 문구·수치는 카탈로그 원문 그대로 옮겼다. 면적·세대수·금액은 행·열 합계로 검산했다(공급면적 = 전용+공용, 계약면적 = 공급+기타공용, 분양대금 = 대지비+건축비, 특별공급 합계 등).
- 동별 최고층·호수 배치는 표로 옮기지 않고 카탈로그 배치표 이미지를 그대로 사용했다(옮겨 적을 때 오독 위험).
- 카탈로그에 없는 문구(임의 작성 UI 문구): 메인 "CONTENTS", 바로가기 카드, 하단 "호반써밋의 소식을 가장 먼저 받아보세요.", 관심고객등록 안내문, 커뮤니티 그룹명(운동·건강 / 문화·교육·생활), 분양안내 상단 경고문, "MODEL HOUSE / 호반써밋 견본주택" 제목. 확정 카피로 교체 필요.

### 이미지
- `frontend/public/images/catalog/` — 카탈로그 쪽 이미지(896×1205)를 잘라 만든 24개 파일, 약 3.3MB.
- 해상도가 낮다(가로 최대 896px). 원본 고해상도 이미지로 교체해야 한다.
- 일부 이미지에는 카탈로그 원래 글자가 박혀 있다(입지 지도, 평면도 옵션 표기, 배치도 범례 등).

### 디자인
- `frontend/src/styles/tokens.css`(기본 토큰) → `theme.css`(현장 톤) → `base.css`(컴포넌트) 순서. 설정과 같은 기본 → 현장 덮어쓰기 구조.
- 톤: 테라코타 포인트(#c66b5b), 차콜(#4d4848), 연회색 바탕(#f1eff2), 주택형 색(74A 녹색·74B 청회색·84 테라코타), 제목 명조(Noto Serif KR)·본문 고딕(Noto Sans KR, Google Fonts).
- 색상 값은 카탈로그 화면을 보고 맞춘 **근사치**이며 브랜드 가이드 값은 **미확인**.

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
| GET | `/api/content/:page` | 화면 편집 내용 조회 (공개) |
| GET | `/api/media/:id` | 편집으로 올린 이미지 (공개, 1년 캐시) |
| PUT | `/api/admin/content/:page` | 화면 편집 저장 `{set:[…], remove:[키]}` |
| POST | `/api/admin/media` | 이미지 올리기 (multipart `file`, JPG·PNG·WebP, 2MB 이하) |

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

### DB — `content_overrides` (화면 편집)

| 컬럼 | 설명 |
| --- | --- |
| page, key | 페이지 ID, 요소 키 (`text:3`, `img:0` …) — 합쳐서 기본키 |
| kind | text / link / href / img / bg |
| orig | 편집 당시 원래 내용의 해시 |
| value | 편집 값 JSON (`html`, `href`, `src`, `alt`) |
| updated_at | 저장 일시 |

### DB — `media` (편집으로 올린 이미지)

`id`(무작위 24자), `mime`, `size`, `data`(BLOB), `created_at`. 지금은 쓰지 않는 이미지를 지우는 기능이 없다.

## 5-1. 화면 편집 (관리자 전용)

관리자가 사이트 화면에서 문장·버튼·링크·이미지·배경 이미지를 그 자리에서 고치고 저장한다.

**사용법**
1. `/admin/` 에서 로그인한 뒤 사이트 페이지로 이동하면 하단에 편집 바가 나타난다.
2. "편집 모드"를 켜고 고칠 곳을 클릭한다.
   - 문장·버튼 글자는 그 자리에서 입력한다. 줄바꿈은 Enter, 붙여넣기는 서식 없이 글자만 들어간다.
   - 링크 주소, 이미지(올리기·주소·대체텍스트), 배경 이미지는 오른쪽 아래 속성 창에서 고친다.
   - 항목마다 "원래대로"가 있다.
3. "저장"을 누르면 바뀐 항목만 한 번에 저장된다. "변경 취소"를 누르면 저장하지 않은 변경을 버린다.
4. 편집 바의 "로그아웃"이나 관리자 화면의 로그아웃을 누르면 편집 바가 사라진다.

**방문자에게는 편집 코드를 보내지 않는다**
- 모든 페이지는 작은 적용 스크립트(`frontend/src/js/cms.js`)만 받는다. 이 스크립트는 저장된 편집 내용을 받아 화면에 반영한다.
- 편집기(`cms-editor.js`·`cms-editor.css`)는 빌드할 때 별도 파일로 나뉜다. `admin_ui=1` 쿠키가 있을 때만 받아 온다.
  - 이 쿠키는 로그인할 때 발급되고 로그아웃할 때 지워진다.
  - 권한 정보가 아니라 "편집기를 불러올지"만 알려 주는 표시다.
- 편집기는 화면을 띄우기 전에 `/api/admin/me` 로 실제 로그인 상태를 확인한다. 로그인이 아니면 표시 쿠키를 지우고 아무것도 띄우지 않는다.
- 저장과 업로드는 서버에서 관리자 토큰(HttpOnly 쿠키)으로 다시 확인한다.

**편집 대상과 키**
- 대상은 각 페이지 `main` 안의 요소다. 헤더, 메뉴, 푸터는 설정(`shared/site.ts`)이 만들므로 화면 편집 대상이 아니다.
- 대상 요소
  - 글자만 있는 제목·문단·목록·표 칸 등(`text`)
  - 글자 링크·버튼(`link`), 카드처럼 안에 다른 요소가 있는 링크(`href`, 주소만)
  - 이미지(`img`)
  - 배경 이미지(`bg`): 메인 상단, 페이지 제목 영역, 신청 화면 좌측
- 키는 같은 종류끼리 문서 순서대로 매긴 번호다(`text:0`, `text:1` …).
- HTML 을 고쳐 요소 순서나 원문이 바뀌면, 저장 당시 원문 해시와 달라진 편집은 적용하지 않는다(엉뚱한 곳에 덮어쓰지 않도록). 이 경우 다시 편집해야 한다.
- 편집 대상에서 빼려면 `data-cms-skip` 속성을 단다. 신청 폼에 이미 달아 두었다.

**안전장치**
- 문장에는 `br, em, strong, small, b, i, span, sup, sub` 태그와 `class` 속성만 허용한다. 서버는 이 밖의 내용을 거부하고, 화면에 적용할 때도 한 번 더 걸러 낸다.
- 링크 주소는 사이트 경로(`/…`), `#`, `https://`, `http://`, `tel:`, `mailto:` 만 받는다. `javascript:` 와 `//외부` 는 거부한다.
- 이미지 주소는 `/images/…`, `/api/media/…`, `https://` 만 받는다. 올리는 이미지는 파일 앞부분을 읽어 JPG·PNG·WebP 인지 판별하고, SVG 는 받지 않는다.
- 편집 내용이 적용되기 전 원래 문구가 잠깐 보이지 않도록 본문을 숨긴다. 최대 1.2초까지이고, 그 뒤에는 무조건 보인다.

**한계·미확인**
- 신청 폼 항목(성함·연락처 등)과 동의문은 `shared/forms/apply.ts`·`site.ts` 에서 만들어지므로 화면 편집 대상이 아니다.
- 편집 이력과 되돌리기 기록은 없다. 저장하면 덮어쓴다.
- 이미지는 DB(Turso)에 BLOB 으로 저장한다. Turso 요청·저장 용량 제한과 Vercel 함수 응답 속도는 실제 배포에서 확인하지 않았다(**미확인**).
- 화면 편집은 HTML 원문을 바꾸지 않는다. 원문을 바꾸려면 HTML 을 직접 수정해야 한다.

## 5-2. 신청 화면 디자인
- 좌측은 비주얼 패널이다. 외관 이미지(편집 가능), 제목, 안내 문구, 대지위치·공급규모·주택형 요약이 들어간다.
- 우측은 입력 카드다. 필수 항목은 `*` 로 표시하고, 오류는 입력칸 아래에 보여 준다.
- 완료는 체크 아이콘 카드, 마감은 대시 아이콘 카드로 보여 준다. 오류 안내는 아이콘 없이 빨간 띠로 보여 준다.
- 960px 이하에서는 위아래로 쌓인다. 600px 이하에서는 여백 없이 화면 전체를 쓴다.
- "성함과 연락처를 남겨 주시면 분양 소식을 안내해 드립니다." 는 **임의 작성 문구**다. 화면 편집으로 바꿀 수 있다.

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
| 미확정 | 사이트명 — 카탈로그 표기 "HOBAN SUMMIT BROOKSIDE" 를 그대로 사용. 한글 단지명(BROOKSIDE 한글 표기)은 카탈로그에 없음 | `shared/site.ts` `site.name` |
| 미확정 | 푸터 시행·시공사·사업자 정보 (카탈로그에 없음. 현재 사업명·대지위치만) | `footer.lines` |
| 미확정 | 신청 처리 상태 구분 (현재 초안: 접수/처리완료) | `admin.statuses` |
| 미확정 | 메뉴 그룹명·묶음 (사업안내/단지안내는 임의) | `nav` |
| 미확정 | 임의 작성 UI 문구 (4. 콘텐츠 반영 원칙 참고) | 각 페이지 HTML |
| 미반영 | 분양대금·발코니·옵션 **납부계좌**(은행·계좌번호·예금주) — 결제 정보는 카탈로그를 옮겨 적지 않고 확정 모집공고 기준으로 따로 입력해야 함 | `information` |
| 미반영 | 구비서류 표, 플러스 옵션 납부일정, 회차별 납부 금액, 청약 관련 세부 유의사항(※) | `information` |
| 미반영 | 1쪽 우 광고 카피("하나만 선택해야 한다면,"), 뒤표지 홈페이지 주소 | — |
| 미확인 | 분양안내 내용의 현재 유효성 — 카탈로그 기준은 2021년 분양(청약 2021.03, 입주 2023.07 예정). 화면에 "2021년 분양 당시 기준" 안내를 넣음 | `information` |
| 미확인 | 카탈로그 이미지·로고의 사용 권한 | `frontend/public/images/catalog/` |
| 미확인 | 목차의 CHECK LIST 내용 (e-book 에 해당 쪽 없음) | `pages.checklist` (비활성) |
| 미확인 | 목차의 BRAND PR 에 해당하는 원래 쪽 (2쪽을 대신 배치) | `brand` |
| 미확인 | Vercel 실제 배포 동작(rewrites 경로 전달, libsql 함수 번들) — 로컬에서만 검증 | — |
| 미확인 | Turso 원격 접속 — 로컬은 파일 DB 로만 검증 | — |
