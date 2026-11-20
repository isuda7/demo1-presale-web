/**
 * 사이트 설정의 형태(타입) 정의.
 * 설정 값은 base.ts → presets(유형) → site.ts 순으로 덮어써서 최종 config 가 된다.
 */

export interface PageDef {
  /** 화면·메뉴에 쓰이는 페이지 이름 */
  title: string;
  /** 배포 경로 (끝 슬래시 포함). 페이지 HTML 은 frontend/<경로>/index.html */
  path: string;
  /** false 면 빌드·메뉴에서 제외 */
  enabled: boolean;
  /** 시스템 페이지(신청·개인정보·관리자). 일반 메뉴 대상 아님 */
  system?: boolean;
  /** 레이아웃 종류. admin 은 사이트 헤더/푸터 없이 출력 */
  layout?: 'default' | 'admin';
  /** 검색엔진 비노출 */
  noindex?: boolean;
}

export interface StatusDef {
  value: string;
  label: string;
}

export interface SiteConfig {
  site: {
    /** 현장명(사이트명) */
    name: string;
    /** meta description */
    description: string;
    lang: string;
  };
  /** 적용할 유형(템플릿) 이름. null 이면 기본(base)만 사용 */
  preset: string | null;
  /** 페이지 목록. key = 페이지 ID (HTML 의 data-page 값) */
  pages: Record<string, PageDef>;
  /** 헤더 메뉴 순서 (페이지 ID 배열) */
  nav: string[];
  /** 푸터 링크 (페이지 ID 배열) */
  footerLinks: string[];
  footer: {
    /** 사업자 정보 등 푸터 문구 줄 단위. 비어 있으면 출력하지 않음 */
    lines: string[];
  };
  apply: {
    /** 신청 접수 스위치. false 면 화면은 안내만, 서버도 접수 거부 */
    open: boolean;
    /** 마감 시 안내 문구 */
    closedMessage: string;
    /** 접수 완료 문구 */
    doneMessage: string;
  };
  privacy: {
    /** 개인정보 수집·이용 동의문 (미확정 → 빈 문자열) */
    consentText: string;
    /** 보유·이용 기간 문구 (미확정 → 빈 문자열) */
    retentionText: string;
  };
  admin: {
    /** 목록 한 페이지당 건수 */
    pageSize: number;
    /** 로그인 유지 시간(시간) */
    sessionHours: number;
    /** 신청 처리 상태 목록 */
    statuses: StatusDef[];
    /** 신규 신청의 기본 상태 값 */
    defaultStatus: string;
  };
}

export type DeepPartial<T> = T extends readonly (infer _U)[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type ConfigOverride = DeepPartial<SiteConfig>;
