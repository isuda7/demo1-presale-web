import { baseConfig } from './base.js';
import { deepMerge } from './merge.js';
import { presets } from '../presets/index.js';
import { siteOverride } from '../site.js';
import type { PageDef, SiteConfig } from './schema.js';

export type { PageDef, SiteConfig, StatusDef, ConfigOverride } from './schema.js';

/** 기본 → 유형 → 현장 설정 순으로 병합한 최종 설정 */
export function resolveConfig(): SiteConfig {
  const presetName = siteOverride.preset ?? null;
  const preset = presetName ? presets[presetName] : undefined;
  if (presetName && !preset) {
    throw new Error(`등록되지 않은 유형(preset)입니다: ${presetName}`);
  }
  const merged = deepMerge(baseConfig, preset ?? {}, siteOverride);
  merged.preset = presetName;
  return merged;
}

export const config: SiteConfig = resolveConfig();

export interface ResolvedPage extends PageDef {
  id: string;
}

export function allPages(c: SiteConfig = config): ResolvedPage[] {
  return Object.entries(c.pages).map(([id, p]) => ({ id, ...p }));
}

export function enabledPages(c: SiteConfig = config): ResolvedPage[] {
  return allPages(c).filter((p) => p.enabled);
}
