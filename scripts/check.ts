/**
 * 점검 도구 (npm run check)
 *  1. 설정: 메뉴/푸터 링크가 존재·활성 페이지인지, 활성 페이지 HTML 이 있고 data-page 가 맞는지
 *  2. 서버리스 import 규칙: backend/shared/api/scripts 의 상대 import 에 .js 확장자가 있는지
 *  3. 비밀값 관리: .gitignore 에 .env.local·local.db 포함, .env.example 에 값이 비어 있는지
 *  4. 미확정 항목 경고: 개인정보 동의문·보유기간
 * 오류가 있으면 종료 코드 1.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPages, config } from '../shared/config/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors: string[] = [];
const warnings: string[] = [];
const rel = (p: string) => relative(root, p);

// 1. 설정 ----------------------------------------------------------------
for (const [label, ids] of [
  ['nav', config.nav],
  ['footerLinks', config.footerLinks],
] as const) {
  for (const id of ids) {
    const p = config.pages[id];
    if (!p) errors.push(`${label}: 정의되지 않은 페이지 "${id}"`);
    else if (!p.enabled) warnings.push(`${label}: 비활성 페이지 "${id}" (메뉴에 표시되지 않음)`);
  }
}
if (!config.admin.statuses.some((s) => s.value === config.admin.defaultStatus)) {
  errors.push(`admin.defaultStatus "${config.admin.defaultStatus}" 가 statuses 에 없음`);
}
for (const p of allPages()) {
  const file = resolve(root, 'frontend', `.${p.path}`, 'index.html');
  if (!existsSync(file)) {
    (p.enabled ? errors : warnings).push(`페이지 HTML 없음: ${p.id} → ${rel(file)}`);
    continue;
  }
  const m = /<html[^>]*\sdata-page="([^"]+)"/.exec(readFileSync(file, 'utf8'));
  if (m?.[1] !== p.id) errors.push(`${rel(file)}: data-page="${m?.[1] ?? ''}" ≠ "${p.id}"`);
}

// 2. 상대 import .js 확장자 ---------------------------------------------
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|mts)$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
  return out;
}
const importRe = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]*)['"]/g;
for (const file of ['backend', 'shared', 'api', 'scripts'].flatMap((d) => walk(resolve(root, d)))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(importRe)) {
    const spec = m[1]!;
    if (!/\.(js|mjs|json)$/.test(spec)) {
      const line = src.slice(0, m.index).split('\n').length;
      errors.push(`${rel(file)}:${line} 상대 import 에 .js 확장자 필요: "${spec}"`);
    }
  }
}

// 3. 비밀값 관리 ----------------------------------------------------------
const gitignore = existsSync(resolve(root, '.gitignore')) ? readFileSync(resolve(root, '.gitignore'), 'utf8') : '';
if (!/^\.env\.\*$/m.test(gitignore) && !/^\.env\.local$/m.test(gitignore)) errors.push('.gitignore 에 .env.local 제외 규칙 없음');
if (!/^local\.db$/m.test(gitignore)) errors.push('.gitignore 에 local.db 제외 규칙 없음');

const SECRET_KEYS = ['ADMIN_PASSWORD', 'TOKEN_SECRET', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];
const examplePath = resolve(root, '.env.example');
if (existsSync(examplePath)) {
  for (const line of readFileSync(examplePath, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && SECRET_KEYS.includes(m[1]!) && m[2]!.trim() !== '') errors.push(`.env.example 에 값이 들어 있음: ${m[1]}`);
  }
}
// 코드·문서에 비밀값을 직접 대입한 흔적
const assignRe = new RegExp(`\\b(${SECRET_KEYS.join('|')})\\s*[:=]\\s*['"][^'"]{4,}['"]`);
for (const file of ['backend', 'shared', 'api', 'scripts', 'frontend', 'doc'].flatMap((d) => {
  const files: string[] = [];
  const dirWalk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist') continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) dirWalk(full);
      else if (/\.(ts|js|html|md|json)$/.test(name)) files.push(full);
    }
  };
  dirWalk(resolve(root, d));
  return files;
})) {
  if (assignRe.test(readFileSync(file, 'utf8'))) errors.push(`${rel(file)}: 비밀값 직접 기재 의심`);
}

// 4. 미확정 항목 ----------------------------------------------------------
if (!config.privacy.consentText) warnings.push('미확정: 개인정보 수집·이용 동의문 (shared/site.ts privacy.consentText)');
if (!config.privacy.retentionText) warnings.push('미확정: 개인정보 보유·이용 기간 (shared/site.ts privacy.retentionText)');
if (config.site.name === '분양 사이트') warnings.push('미입력: 현장명 (shared/site.ts site.name)');
if (!config.apply.open) warnings.push('신청 마감 상태입니다 (apply.open = false)');

// 결과 --------------------------------------------------------------------
for (const w of warnings) console.log(`경고  ${w}`);
for (const e of errors) console.log(`오류  ${e}`);
console.log(`\n점검 완료: 오류 ${errors.length}건, 경고 ${warnings.length}건`);
process.exit(errors.length ? 1 : 0);
