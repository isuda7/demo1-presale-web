import type { ConfigOverride } from './config/schema.js';

/**
 * 현장 설정 — 기본(base) → 유형(preset) 위에 마지막으로 덮어쓴다.
 * 이 파일에는 비밀값(비밀번호·토큰·DB 접속정보)을 절대 넣지 않는다. (환경변수 사용)
 *
 * 페이지 구성은 참고 카탈로그의 목차를 따른다.
 *   INTRO / LOCATION / DESIGN / LANDSCAPE / COMMUNITY / PLOT PLAN /
 *   UNIT PLAN / INFORMATION / BRAND PR / CHECK LIST
 * (목차 항목 ↔ 페이지 대응 근거와 미확인 사항은 doc/site-design.md 참고)
 */
export const siteOverride: ConfigOverride = {
  preset: null,

  site: {
    // 현장명 미입력 — 확정되면 입력 (비워두면 기본값 '분양 사이트' 유지)
    // name: '',
    // description: '',
  },

  pages: {
    brand: { enabled: true },
    design: { enabled: true },
    landscape: { enabled: true },
    community: { enabled: true },
    checklist: { enabled: true },
  },

  // 카탈로그 목차 순서. INTRO 는 메인(home)이 담당.
  nav: [
    'location',
    'design',
    'landscape',
    'community',
    'plot-plan',
    'unit-plan',
    'information',
    'brand',
    'checklist',
    'apply',
  ],

  apply: {
    // 신청 마감 스위치: false 로 바꾸고 배포하면 화면은 안내만, 서버는 접수 거부
    open: true,
  },

  privacy: {
    // 미확정 — 확정 문구를 받으면 입력
    consentText: '',
    retentionText: '',
  },
};
