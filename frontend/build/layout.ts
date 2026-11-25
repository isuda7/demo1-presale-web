import type { Plugin } from 'vite';
import type { NavItem, SiteConfig } from '../../shared/config/schema.js';

/**
 * 공통 레이아웃 주입 (빌드·개발 서버 공통)
 *
 * 각 페이지 HTML 은 <html data-page="페이지ID"> 와 아래 자리표시만 갖고,
 * 머리말·헤더·제목·푸터는 설정(shared/config)으로부터 생성해 끼워 넣는다.
 *   <!-- @layout:head -->    title, description, robots, 웹폰트
 *   <!-- @layout:header -->  사이트 헤더 + 메뉴
 *   <!-- @layout:title -->   페이지 제목 영역 (eyebrow·배경 이미지)
 *   <!-- @layout:footer -->  푸터
 */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Serif+KR:wght@400;600&display=swap';

function pageIdOf(html: string): string | null {
  return /<html[^>]*\sdata-page="([^"]+)"/.exec(html)?.[1] ?? null;
}

/**
 * 저장된 화면 편집 내용이 적용되기 전 원래 문구가 잠깐 보이는 것을 막는다.
 * cms.js 가 적용을 마치면 해제하고, 응답이 늦어도 1.2초 뒤에는 무조건 보이게 한다.
 */
const CMS_PENDING = `<style>.cms-pending main{visibility:hidden}</style>
    <script>document.documentElement.classList.add('cms-pending');setTimeout(function(){document.documentElement.classList.remove('cms-pending')},1200)</script>`;

function renderHead(c: SiteConfig, id: string): string {
  const page = c.pages[id];
  const title = id === 'home' ? c.site.name : `${page?.title ?? ''} | ${c.site.name}`;
  const lines = [
    `<title>${esc(title)}</title>`,
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
    `<link rel="stylesheet" href="${FONT_HREF}" />`,
  ];
  if (c.site.description) lines.push(`<meta name="description" content="${esc(c.site.description)}" />`);
  if (page?.noindex) lines.push('<meta name="robots" content="noindex, nofollow" />');
  if (page?.layout !== 'admin') lines.push(CMS_PENDING);
  return lines.join('\n    ');
}

function link(c: SiteConfig, id: string, current: string): string {
  const p = c.pages[id];
  if (!p?.enabled) return '';
  return `<a href="${p.path}"${id === current ? ' aria-current="page"' : ''}>${esc(p.title)}</a>`;
}

function renderNavItem(c: SiteConfig, item: NavItem, current: string): string {
  if (typeof item === 'string') {
    const a = link(c, item, current);
    return a ? `<li class="nav-item${item === 'apply' ? ' nav-item--cta' : ''}">${a}</li>` : '';
  }
  const children = item.children.map((id) => link(c, id, current)).filter(Boolean);
  if (!children.length) return '';
  const active = item.children.includes(current) ? ' is-active' : '';
  return `<li class="nav-item nav-item--group${active}">
          <span class="nav-group-title">${esc(item.title)}</span>
          <ul class="nav-sub">${children.map((a) => `<li>${a}</li>`).join('')}</ul>
        </li>`;
}

function renderLogo(c: SiteConfig): string {
  // 사이트명이 "브랜드 메인 서브" 3단어면 로고 형태로, 아니면 그대로 출력
  const words = c.site.name.split(/\s+/);
  if (words.length === 3) {
    const [a, b, d] = words.map(esc);
    return `<span class="logo-pre">${a}</span><span class="logo-main">${b}</span><span class="logo-sub">${d}</span>`;
  }
  return esc(c.site.name);
}

function renderHeader(c: SiteConfig, id: string): string {
  return `<a class="skip-link" href="#main">본문 바로가기</a>
  <header class="site-header">
    <div class="site-header__inner">
      <a class="site-logo" href="/" aria-label="${esc(c.site.name)} 메인">${renderLogo(c)}</a>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">
        <span class="nav-toggle__bar"></span><span class="sr-only">메뉴</span>
      </button>
      <nav id="site-nav" class="site-nav" aria-label="주 메뉴">
        <ul class="nav-list">${c.nav.map((item) => renderNavItem(c, item, id)).join('')}</ul>
      </nav>
    </div>
  </header>`;
}

function renderTitle(c: SiteConfig, id: string): string {
  const page = c.pages[id];
  if (!page || id === 'home') return '';
  const bg = page.heroImage ? ` style="background-image:url('${esc(page.heroImage)}')"` : '';
  const cls = page.heroImage ? 'page-title page-title--image' : 'page-title';
  const eyebrow = page.eyebrow ? `<p class="page-title__eyebrow">${esc(page.eyebrow)}</p>` : '';
  return `<div class="${cls}"${bg}>
        <div class="page-title__inner">${eyebrow}<h1>${esc(page.title)}</h1></div>
      </div>`;
}

function renderFooter(c: SiteConfig, id: string): string {
  const links = c.footerLinks.map((pid) => link(c, pid, id)).filter(Boolean);
  const lines = c.footer.lines.map((l) => `<p>${esc(l)}</p>`).join('');
  const notices = c.footer.notices.length
    ? `<div class="footer-notices">${c.footer.notices.map((n) => `<p>${esc(n)}</p>`).join('')}</div>`
    : '';
  return `<footer class="site-footer">
    <div class="site-footer__inner">
      <p class="footer-logo">${renderLogo(c)}</p>
      <ul class="footer-links">${links.map((a) => `<li>${a}</li>`).join('')}</ul>
      <div class="footer-info">${lines}</div>
      ${notices}
      <p class="copyright">&copy; ${esc(c.site.name)}</p>
    </div>
  </footer>`;
}

/** 관리자 레이아웃: 사이트 메뉴 없이 로고·구분 표기·사이트 바로가기만 */
function renderAdminHeader(c: SiteConfig): string {
  return `<a class="skip-link" href="#main">본문 바로가기</a>
  <header class="admin-header">
    <div class="admin-header__inner">
      <a class="site-logo" href="/admin/" aria-label="${esc(c.site.name)} 관리자">${renderLogo(c)}</a>
      <span class="admin-header__label">ADMIN</span>
      <a class="admin-header__edit" href="/?cms=edit" hidden>화면 편집</a>
      <a class="admin-header__site" href="/" target="_blank" rel="noopener">사이트 보기</a>
    </div>
  </header>`;
}

function renderAdminFooter(c: SiteConfig): string {
  return `<footer class="admin-footer"><p>&copy; ${esc(c.site.name)} · 관리자 전용 화면</p></footer>`;
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
          .replace('<!-- @layout:header -->', isAdmin ? renderAdminHeader(c) : renderHeader(c, id))
          .replace('<!-- @layout:title -->', isAdmin ? '' : renderTitle(c, id))
          .replace('<!-- @layout:footer -->', isAdmin ? renderAdminFooter(c) : renderFooter(c, id))
          .replace(/<html([^>]*)\slang="[^"]*"/, `<html$1 lang="${esc(c.site.lang)}"`);
      },
    },
  };
}
