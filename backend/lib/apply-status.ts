import { config } from '../../shared/config/index.js';

/** 신청 접수 여부 — 마감 스위치는 shared/site.ts 의 apply.open */
export function isApplyOpen(): boolean {
  return config.apply.open === true;
}
