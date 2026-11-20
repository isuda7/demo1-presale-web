// 관리자 화면: 로그인 / 신청 목록(검색·상태·기간) / 상태변경 / 삭제 / CSV
import { formatPhone } from '@shared/forms/apply.ts';
import { api } from './api.js';

const loginView = document.getElementById('admin-login');
const listView = document.getElementById('admin-list');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const filterForm = document.getElementById('filter-form');
const statusFilter = document.getElementById('filter-status');
const tbody = document.getElementById('list-body');
const summary = document.getElementById('list-summary');
const pager = document.getElementById('list-pager');
const csvLink = document.getElementById('csv-link');
const logoutBtn = document.getElementById('logout-btn');

let statuses = [];
let page = 1;

const LOGIN_ERRORS = {
  invalid_password: '비밀번호가 올바르지 않습니다.',
  too_many_attempts: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  admin_not_configured: '관리자 환경변수(ADMIN_PASSWORD, TOKEN_SECRET)가 설정되지 않았습니다.',
};

function kst(iso) {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 16);
}

function td(text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function filterQuery(withPage) {
  const params = new URLSearchParams();
  for (const [k, v] of new FormData(filterForm).entries()) if (v) params.set(k, String(v));
  if (withPage) params.set('page', String(page));
  return params.toString();
}

function showLogin() {
  listView.hidden = true;
  loginView.hidden = false;
}

async function showList() {
  loginView.hidden = true;
  listView.hidden = false;
  await loadList();
}

function renderStatusOptions() {
  statusFilter.replaceChildren(new Option('전체', ''), ...statuses.map((s) => new Option(s.label, s.value)));
}

function renderRow(item) {
  const tr = document.createElement('tr');
  tr.append(
    td(String(item.id)),
    td(kst(item.createdAt)),
    td(item.name),
    td(formatPhone(item.phone)),
    td(item.message),
  );

  const statusCell = document.createElement('td');
  const select = document.createElement('select');
  select.className = 'status-select';
  select.dataset.status = item.status;
  select.setAttribute('aria-label', `${item.id}번 상태`);
  for (const s of statuses) select.append(new Option(s.label, s.value, false, s.value === item.status));
  select.addEventListener('change', async () => {
    const res = await api(`/admin/applications/${item.id}`, { method: 'PATCH', body: { status: select.value } });
    if (res.status === 401) return showLogin();
    if (!res.ok) return alert('상태를 변경하지 못했습니다.');
    select.dataset.status = select.value;
  });
  statusCell.append(select);

  const actionCell = document.createElement('td');
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn btn--danger';
  del.textContent = '삭제';
  del.addEventListener('click', async () => {
    if (!confirm(`${item.id}번 신청을 삭제할까요? 삭제하면 되돌릴 수 없습니다.`)) return;
    const res = await api(`/admin/applications/${item.id}`, { method: 'DELETE' });
    if (res.status === 401) return showLogin();
    if (!res.ok) return alert('삭제하지 못했습니다.');
    await loadList();
  });
  actionCell.append(del);

  tr.append(statusCell, actionCell);
  return tr;
}

function renderPager(total, pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  pager.replaceChildren();
  for (let i = 1; i <= pages; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(i);
    if (i === page) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', () => {
      page = i;
      loadList();
    });
    pager.append(b);
  }
}

async function loadList() {
  const res = await api(`/admin/applications?${filterQuery(true)}`);
  if (res.status === 401) return showLogin();
  if (!res.ok) {
    summary.textContent = '목록을 불러오지 못했습니다.';
    return;
  }
  const { items, total, pageSize } = res.data;
  const count = document.createElement('strong');
  count.textContent = total.toLocaleString('ko-KR');
  summary.replaceChildren('총 ', count, '건');
  tbody.replaceChildren(...items.map(renderRow));
  if (!items.length) {
    const tr = document.createElement('tr');
    const cell = td('신청 내역이 없습니다.');
    cell.className = 'is-empty';
    cell.colSpan = 7;
    tr.append(cell);
    tbody.append(tr);
  }
  renderPager(total, pageSize);
  csvLink.href = `/api/admin/applications.csv?${filterQuery(false)}`;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const password = new FormData(loginForm).get('password');
  const res = await api('/admin/login', { method: 'POST', body: { password } });
  if (!res.ok) {
    loginError.textContent = LOGIN_ERRORS[res.data?.error] ?? '로그인하지 못했습니다.';
    return;
  }
  loginForm.reset();
  await init();
});

filterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  page = 1;
  loadList();
});

filterForm.addEventListener('reset', () => {
  setTimeout(() => {
    page = 1;
    loadList();
  });
});

logoutBtn.addEventListener('click', async () => {
  await api('/admin/logout', { method: 'POST' });
  showLogin();
});

async function init() {
  const res = await api('/admin/me');
  if (!res.ok) {
    if (res.status === 503) loginError.textContent = LOGIN_ERRORS.admin_not_configured;
    return showLogin();
  }
  statuses = res.data.statuses;
  renderStatusOptions();
  await showList();
}

init();
