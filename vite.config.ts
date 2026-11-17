import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vercel serves from the domain root. BASE_PATH lets you test/deploy under a subpath (e.g. /devcodex/).
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev') },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      injectManifest: {
        // Books are downloaded per-book on demand (src/services/offline.ts), never precached.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        globIgnores: ['books/**'],
      },
      manifest: {
        id: base,
        name: 'DevCodex — 개발 족보집',
        short_name: 'DevCodex',
        description: '개발 학습용 HTML 족보집을 모아 오프라인에서도 읽는 개인 라이브러리',
        lang: 'ko',
        start_url: base,
        scope: base,
        display: 'standalone',
        theme_color: '#1f2a37',
        background_color: '#f7f5f0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { include: ['tests/unit/**/*.test.ts'] },
});
