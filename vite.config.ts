import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';

const pkgPath = path.resolve(__dirname, 'package.json');

/** Read the version fresh from disk each time the config is loaded (no bundler/JSON caching). */
function readAppVersion(): string {
  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Restarts the dev server whenever package.json changes so __APP_VERSION__ is re-evaluated. */
function appVersionPlugin(): Plugin {
  return {
    name: 'curator-app-version',
    configureServer(server) {
      server.watcher.add(pkgPath);
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === pkgPath) {
          server.restart();
        }
      });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(readAppVersion()),
  },
  base: '/',
  server: {
    port: 5180,
    strictPort: false,
    host: true,
  },
  plugins: [
    react(),
    appVersionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        // Disabled so the dev server never serves a stale cached bundle (e.g. an old version string)
        enabled: false,
      },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'mask-icon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
      ],
      manifest: {
        id: '/',
        start_url: '/',
        scope: '/',
        name: 'Curator — Antiques & Fine Art Catalog',
        short_name: 'Curator',
        description: 'Offline-ready cataloging and valuation tool for antiques, ceramics, and fine art.',
        theme_color: '#5f4131',
        background_color: '#faf8f5',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
