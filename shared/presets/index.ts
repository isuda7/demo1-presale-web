import type { ConfigOverride } from '../config/schema.js';

/**
 * 유형(템플릿) 등록부.
 * 기본(base)과 현장 설정(site.ts) 사이에 끼워 넣는 중간 단계 설정이다.
 *
 * 추가 방법:
 *   1) shared/presets/<이름>.ts 에서 ConfigOverride 를 export
 *   2) 아래 presets 에 등록
 *   3) shared/site.ts 의 preset 에 이름 지정
 *
 * 구축 초안 단계에서는 등록된 유형이 없다.
 */
export const presets: Record<string, ConfigOverride> = {};
