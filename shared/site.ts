import type { ConfigOverride } from './config/schema.js';

/**
 * 현장 설정 — 기본(base) → 유형(preset) 위에 마지막으로 덮어쓴다.
 * 이 파일에는 비밀값(비밀번호·토큰·DB 접속정보)을 절대 넣지 않는다. (환경변수 사용)
 *
 * 내용 출처: 참고 카탈로그(e-book) 24장 전체
 *   https://vertium.hobanapt.co.kr/hobansummit-cjdn/final/e_book/
 * 쪽 ↔ 페이지 대응과 미반영·미확인 항목은 doc/site-design.md 참고.
 */
const IMG = '/images/catalog';

export const siteOverride: ConfigOverride = {
  preset: null,

  site: {
    name: 'HOBAN SUMMIT BROOKSIDE',
    description:
      '청주 동남지구 B8블록 호반써밋 — 지하 2층~지상 25층 14개동 총 1,215세대 (74㎡A·74㎡B·84㎡)',
  },

  pages: {
    home: { title: '메인' },
    overview: { title: '사업개요', eyebrow: 'INTRO', heroImage: `${IMG}/exterior-river.jpg` },
    brand: { title: '브랜드', enabled: true, eyebrow: 'BRAND', heroImage: `${IMG}/brand-lounge.jpg` },
    location: { title: '입지환경', eyebrow: 'LOCATION', heroImage: `${IMG}/hero-exterior.jpg` },
    design: { title: '단지설계', enabled: true, eyebrow: 'DESIGN', heroImage: `${IMG}/design-night.jpg` },
    landscape: { title: '조경', enabled: true, eyebrow: 'LANDSCAPE', heroImage: `${IMG}/landscape-main.jpg` },
    community: { title: '커뮤니티', enabled: true, eyebrow: 'COMMUNITY', heroImage: `${IMG}/landscape-2.jpg` },
    'plot-plan': { title: '단지배치', eyebrow: 'PLOT PLAN', heroImage: `${IMG}/design-aerial.jpg` },
    'unit-plan': { title: '세대안내', eyebrow: 'UNIT PLAN', heroImage: `${IMG}/exterior-river.jpg` },
    information: { title: '분양안내', eyebrow: 'INFORMATION', heroImage: `${IMG}/hero-exterior.jpg` },
    // CHECK LIST: 카탈로그 목차에는 있으나 e-book 본문에 해당 쪽이 없어 비활성 유지
    checklist: { enabled: false },
    apply: { title: '관심고객등록', eyebrow: 'REGISTER' },
  },

  nav: [
    { title: '사업안내', children: ['overview', 'brand', 'location'] },
    { title: '단지안내', children: ['design', 'landscape', 'community', 'plot-plan'] },
    'unit-plan',
    'information',
    'apply',
  ],

  footer: {
    lines: [
      '사업명 : 청주동남지구 B8블록 공동주택 신축공사',
      '대지위치 : 충청북도 청주시 동남택지개발지구 B-8BL',
    ],
    notices: [
      '※ 상기 CG 이미지, 사진 및 내용은 소비자의 이해를 돕기 위한 것으로 분양대상물을 축소 표현하여 실제 크기 및 거리 등과 차이가 있습니다.',
      '※ 본 홍보물 상의 개발계획, 교통계획과 외관 이미지는 소비자의 이해를 돕기 위한 것으로 관계기관의 계획변경 등에 따라 달라질 수 있습니다.',
      '※ 건물의 색채, 외관, 조경, 식재 및 보행로는 입주자의 이해를 돕기 위한 것으로 실제와 다소 차이가 있으며, 추후 인허가 과정 및 실제 시공 시 변경될 수 있습니다. 또한 구획선과 시설물의 위치 및 규모 역시 측량결과 및 각종 평가에 따라 시공 시 변경될 수 있습니다.',
      '※ 본 홍보물의 제작과정상 오탈자가 있을 수 있으므로 계약 시 반드시 확인하시기 바랍니다.',
      '※ 사용검사 때와 달리 입주 후 교통량 증가 등 주변여건 변화로 소음이 심화될 경우에는 행정청, 사업주체 및 시공사에 이의제기 및 보상 요구를 할 수 없으므로 소음에 대한 내용을 반드시 숙지하시고 분양 계약을 하시기 바랍니다.',
    ],
  },

  apply: {
    // 신청 마감 스위치: false 로 바꾸고 배포하면 화면은 안내만, 서버는 접수 거부
    open: true,
  },

  privacy: {
    // 미확정 — 확정 문구를 받으면 입력 (카탈로그에 해당 내용 없음)
    consentText: '',
    retentionText: '',
  },
};
