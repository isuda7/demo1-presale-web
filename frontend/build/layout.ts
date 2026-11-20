import type { Plugin } from 'vite';
import type { SiteConfig } from '../../shared/config/schema.js';

/**
 * 공통 레이아웃 주입 (빌드·개발 서버 공통)
 *
 * 각 페이지 HTML 은 <html data-page="페이지ID"> 와 아래 자리표시만 갖고,
 * 머리말·헤더·푸터는 설정(shared/config)으로부터 생성해 끼워 넣는다.
 *   <!-- @layout:head -->    title, description, robots
 *   <!-- @layout:header -->  사이트 헤더 + 메뉴
 *   <!-- @layout:title -->   페이지 제목 영역
 *   <!-- @layout:footer -->  푸터
 */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function pageIdOf(html: string): string | null {
  return /<html[^>]*\sdata-page="([^"]+)"/.exec(html)?.[1] ?? null;
}

function renderHead(c: SiteConfig, id: string): string {
  const page = c.pages[id];
  const title = id === 'home' ? c.site.name : `${page?.title ?? ''} | ${c.site.name}`;
  const lines = [`<title>${esc(title)}</title>`];
  if (c.site.description) lines.push(`<meta name="description" content="${esc(c.site.description)}" />`);
  if (page?.noindex) lines.push('<meta name="robots" content="noindex, nofollow" />');
  return lines.join('\n    ');
}

function navLinks(c: SiteConfig, ids: string[], current: string): string {
  return ids
    .map((id) => ({ id, p: c.pages[id] }))
    .filter(({ p }) => p?.enabled)
    .map(
      ({ id, p }) =>
        `<li><a href="${p!.path}"${id === current ? ' aria-current="page"' : ''}>${esc(p!.title)}</a></li>`,
    )
    .join('');
}

function renderHeader(c: SiteConfig, id: string): string {
  return `<a class="skip-link" href="#main">본문 바로가기</a>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="site-logo" href="/">${esc(c.site.name)}</a>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">메뉴</button>
      <nav id="site-nav" class="site-nav" aria-label="주 메뉴">
        <ul>${navLinks(c, c.nav, id)}</ul>
      </nav>
    </div>
  </header>`;
}

function renderTitle(c: SiteConfig, id: string): string {
  const page = c.pages[id];
  if (!page || id === 'home') return '';
  return `<div class="page-title"><h1>${esc(page.title)}</h1></div>`;
}

function renderFooter(c: SiteConfig, id: string): string {
  const lines = c.footer.lines.map((l) => `<p>${esc(l)}</p>`).join('');
  return `<footer class="site-footer">
    <div class="site-footer__inner">
      <ul class="footer-links">${navLinks(c, c.footerLinks, id)}</ul>
      ${lines}
      <p class="copyright">&copy; ${esc(c.site.name)}</p>
    </div>
  </footer>`;
}

export function layoutPlugin(c: SiteConfig): Plugin {
  return {
    name: 'site-layout',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const id = pageIdOf(html);
        if (!id || !c.pages[id]) {
          throw new Error(`[site-layout] ${ctx.path}: <html data-page> 가 없거나 설정에 없는 페이지입니다.`);
        }
        const isAdmin = c.pages[id].layout === 'admin';
        return html
          .replace('<!-- @layout:head -->', renderHead(c, id))
          .replace('<!-- @layout:header -->', isAdmin ? '' : renderHeader(c, id))
          .replace('<!-- @layout:title -->', isAdmin ? '' : renderTitle(c, id))
          .replace('<!-- @layout:footer -->', isAdmin ? '' : renderFooter(c, id))
          .replace(/<html([^>]*)\slang="[^"]*"/, `<html$1 lang="${esc(c.site.lang)}"`);
      },
    },
  };
}
