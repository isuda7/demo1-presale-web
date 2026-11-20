import { Hono } from 'hono';
import { config } from '../../shared/config/index.js';
import { CMS_MAX_ITEMS, CMS_KEY_RE, MEDIA_MAX_BYTES, validateCmsItem, type CmsItem } from '../../shared/cms.js';
import { getMedia, getOverrides, insertMedia, saveOverrides } from '../db/content.js';
import { requireAdmin } from '../lib/auth.js';

const isEditablePage = (page: string) => {
  const p = config.pages[page];
  return !!p && p.enabled && p.layout !== 'admin';
};

/** 이미지 형식을 파일 앞부분(매직 바이트)으로 판별 — SVG 등은 받지 않음 */
function sniffImage(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp';
  return null;
}

/* ---------- 공개: 방문자 화면에 편집 내용 적용 ---------- */
export const contentPublicRoutes = new Hono();

contentPublicRoutes.get('/content/:page', async (c) => {
  const page = c.req.param('page');
  if (!isEditablePage(page)) return c.json({ error: 'not_found' }, 404);
  return c.json({ items: await getOverrides(page) });
});

contentPublicRoutes.get('/media/:id', async (c) => {
  const id = c.req.param('id');
  if (!/^[0-9a-f]{24}$/.test(id)) return c.json({ error: 'not_found' }, 404);
  const media = await getMedia(id);
  if (!media) return c.json({ error: 'not_found' }, 404);
  return c.body(media.data as Uint8Array<ArrayBuffer>, 200, {
    'Content-Type': media.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Security-Policy': "default-src 'none'",
  });
});

/* ---------- 관리자: 편집 저장·이미지 업로드 ---------- */
export const contentAdminRoutes = new Hono();
// '*' 로 걸면 같은 /admin 아래의 로그인 경로까지 막히므로 경로별로 지정
contentAdminRoutes.use('/content/*', requireAdmin);
contentAdminRoutes.use('/media', requireAdmin);

contentAdminRoutes.put('/content/:page', async (c) => {
  const page = c.req.param('page');
  if (!isEditablePage(page)) return c.json({ error: 'not_found' }, 404);

  let body: { set?: unknown; remove?: unknown };
  try {
    body = (await c.req.json()) as typeof body;
  } catch {
    return c.json({ error: 'bad_request' }, 400);
  }
  const set = Array.isArray(body.set) ? body.set : [];
  const remove = Array.isArray(body.remove) ? body.remove : [];
  if (set.length + remove.length > CMS_MAX_ITEMS) return c.json({ error: 'too_many_items' }, 422);

  for (const item of set) {
    const err = validateCmsItem(item);
    if (err) return c.json({ error: 'validation', message: `${(item as CmsItem)?.key ?? ''} ${err}` }, 422);
  }
  if (!remove.every((k) => typeof k === 'string' && CMS_KEY_RE.test(k))) {
    return c.json({ error: 'validation', message: '삭제 키 형식 오류' }, 422);
  }

  const items = (set as CmsItem[]).map(({ key, kind, orig, value }) => ({ key, kind, orig, value }));
  await saveOverrides(page, items, remove as string[]);
  return c.json({ ok: true, items: await getOverrides(page) });
});

contentAdminRoutes.post('/media', async (c) => {
  let file: unknown;
  try {
    file = (await c.req.parseBody())['file'];
  } catch {
    return c.json({ error: 'bad_request' }, 400);
  }
  if (!(file instanceof File)) return c.json({ error: 'bad_request', message: '파일이 없습니다.' }, 400);
  if (file.size > MEDIA_MAX_BYTES) return c.json({ error: 'too_large', message: '2MB 이하 이미지만 올릴 수 있습니다.' }, 413);

  const data = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(data);
  if (!mime) return c.json({ error: 'unsupported', message: 'JPG, PNG, WebP 이미지만 올릴 수 있습니다.' }, 415);

  const id = await insertMedia(mime, data);
  return c.json({ ok: true, url: `/api/media/${id}` }, 201);
});
