import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

/** Fills the page URL into the SEO tags (canonical, Open Graph) from VITE_SITE_URL, e.g. https://game.example.com */
function siteUrl(): Plugin {
  let site = '';
  return {
    name: 'site-url',
    configResolved(config) {
      site = (config.env['VITE_SITE_URL'] as string | undefined)?.replace(/\/+$/, '') ?? '';
    },
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', site),
  };
}

export default defineConfig({
  define: { __GAME_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    // Keep the short sound effects as files too (Vite would inline anything under 4 kB as base64).
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined),
      },
    },
  },
  plugins: [
    siteUrl(),
    VitePWA({
      // 'prompt' = a new version waits until the app (src/app/updates.ts) says the booth is idle.
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Colgate Optic White Vitamin C - 95% Vitamin C Blast',
        short_name: '95% Vitamin C Blast',
        description:
          'Shoot the Vitamin C molecules and fill the toothbrush to 95% Vitamin C Blast.',
        display: 'fullscreen',
        orientation: 'portrait',
        // TODO(brand): confirm exact Colgate red with Oji
        theme_color: '#c8102e',
        background_color: '#c8102e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Default only precaches js/css/html: game assets MUST be listed here to work offline.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,mp3,ogg,mp4,otf,woff2,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
