// 화면 편집 내용 적용 (편집기 자체는 관리자에게만 따로 로드됨)
import './cms.js';

// 공통 동작: 모바일 메뉴 열기/닫기
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}
