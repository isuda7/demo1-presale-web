import type { SiteConfig } from './schema.js';

/**
 * 기본(base) 설정 — 이것만으로 완결된 분양 사이트가 동작해야 한다.
 * 현장별 값은 여기를 고치지 말고 shared/site.ts 에서 덮어쓴다.
 *
 * pages 에는 분양 사이트에서 쓰일 수 있는 페이지를 모두 정의해 두고,
 * 기본으로 켜 둘 최소 구성만 enabled: true 로 둔다.
 */
export const baseConfig: SiteConfig = {
  site: {
    name: '분양 사이트',
    description: '',
    lang: 'ko',
  },
  preset: null,
  pages: {
    home: { title: '메인', path: '/', enabled: true },
    overview: { title: '사업개요', path: '/overview/', enabled: true },
    location: { title: '입지환경', path: '/location/', enabled: true },
    brand: { title: '브랜드', path: '/brand/', enabled: false },
    design: { title: '단지설계', path: '/design/', enabled: false },
    landscape: { title: '조경', path: '/landscape/', enabled: false },
    community: { title: '커뮤니티', path: '/community/', enabled: false },
    'plot-plan': { title: '단지배치', path: '/plot-plan/', enabled: true },
    'unit-plan': { title: '세대안내', path: '/unit-plan/', enabled: true },
    information: { title: '분양안내', path: '/information/', enabled: true },
    checklist: { title: '체크리스트', path: '/checklist/', enabled: false },
    apply: { title: '관심고객등록', path: '/apply/', enabled: true, system: true },
    privacy: { title: '개인정보처리방침', path: '/privacy/', enabled: true, system: true },
    admin: {
      title: '관리자',
      path: '/admin/',
      enabled: true,
      system: true,
      layout: 'admin',
      noindex: true,
    },
  },
  nav: ['overview', 'location', 'plot-plan', 'unit-plan', 'information', 'apply'],
  footerLinks: ['privacy'],
  footer: {
    lines: [],
  },
  apply: {
    open: true,
    closedMessage: '관심고객 등록이 마감되었습니다.',
    doneMessage: '등록이 완료되었습니다.',
  },
  privacy: {
    // 미확정: 동의문·보유기간은 현장 확정 문구를 shared/site.ts 에 입력한다.
    consentText: '',
    retentionText: '',
  },
  admin: {
    pageSize: 20,
    sessionHours: 8,
    // 초안: 처리 상태 구분은 운영 방식 확정 후 site.ts 에서 덮어쓴다.
    statuses: [
      { value: 'new', label: '접수' },
      { value: 'done', label: '처리완료' },
    ],
    defaultStatus: 'new',
  },
};
