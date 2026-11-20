/**
 * 콘텐츠 도구: 설정(shared/config)에 정의됐지만 HTML 이 없는 일반 페이지를 빈 틀로 생성한다.
 *   npm run pages:scaffold            # 없는 파일만 생성
 *   npm run pages:scaffold -- <id>    # 특정 페이지만
 * 기존 파일은 절대 덮어쓰지 않는다. 시스템 페이지(apply/privacy/admin)와 home 은 대상 아님.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allPages } from '../shared/config/index.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontendRoot = resolve(repoRoot, 'frontend');

function template(id: string): string {
  return `<!doctype html>
<html lang="ko" data-page="${id}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- @layout:head -->
    <link rel="stylesheet" href="/src/styles/base.css" />
  </head>
  <body>
    <!-- @layout:header -->
    <main id="main" class="page page--${id}">
      <!-- @layout:title -->
      <section class="page-section" data-slot="content"></section>
    </main>
    <!-- @layout:footer -->
    <script type="module" src="/src/js/common.js"></script>
  </body>
</html>
`;
}

const only = process.argv[2];
const targets = allPages().filter((p) => !p.system && p.id !== 'home' && (!only || p.id === only));
if (only && !targets.length) {
  console.error(`대상 페이지 없음: ${only}`);
  process.exit(1);
}

for (const p of targets) {
  const file = resolve(frontendRoot, `.${p.path}`, 'index.html');
  const rel = relative(repoRoot, file);
  if (existsSync(file)) {
    console.log(`유지  ${rel}`);
    continue;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, template(p.id));
  console.log(`생성  ${rel}`);
}
