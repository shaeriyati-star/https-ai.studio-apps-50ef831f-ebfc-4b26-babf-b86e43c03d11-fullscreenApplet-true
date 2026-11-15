import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const disableHmrWsPlugin: Plugin = {
  name: 'disable-hmr-websocket',
  apply: 'serve',
  enforce: 'post',
  transform(code: string, id: string) {
    if (id.replace(/\\/g, '/').includes('vite/dist/client/client.mjs')) {
      return {
        code: code
          .replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR WebSocket disabled in middlewareMode */',
          )
          .replace(
            'setupForwardConsoleHandler(transport, forwardConsole);',
            '/* Forward console disabled */',
          ),
        map: null,
      };
    }
  },
};

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      disableHmrWsPlugin,
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'MARKETVERSE X — Digital Marketing Academy',
          short_name: 'MarketverseX',
          description: 'Belajar Pemasaran, Bermain, Berprestasi, Menjadi Profesional. LMS dan Game Edukasi Dasar-Dasar Pemasaran Kelas X SMK.',
          theme_color: '#0B193D',
          background_color: '#0B193D',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      hmr: false as const,
      ws: false as const,
      watch: null,
    },
  };
});
