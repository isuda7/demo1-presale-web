import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { config, enabledPages } from '../shared/config/index.js';
import { layoutPlugin } from './build/layout.js';

const root = dirname(fileURLToPath(import.meta.url));

/** 페이지 경로 → HTML 파일 (예: /location/ → frontend/location/index.html) */
export function pageHtmlFile(path: string): string {
  return resolve(root, `.${path}`, 'index.html');
}

// 활성화된 페이지만 빌드 입력으로 사용 (Vite 멀티페이지)
const input = Object.fromEntries(
  enabledPages(config).map((p) => {
    const file = pageHtmlFile(p.path);
    if (!existsSync(file)) {
      throw new Error(`페이지 HTML 없음: ${p.id} → ${file} (npm run pages:scaffold)`);
    }
    return [p.id, file];
  }),
);

export default defineConfig({
  root,
  publicDir: resolve(root, 'public'),
  appType: 'mpa',
  resolve: {
    alias: {
      '@shared': resolve(root, '../shared'),
    },
  },
  plugins: [layoutPlugin(config)],
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    rollupOptions: { input },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
