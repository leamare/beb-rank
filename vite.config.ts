import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const base = process.env.VITE_BASE || (mode === 'production' ? '/baby-management/' : '/')

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/icon.svg'],
        manifest: {
          name: 'Baby Management Counter',
          short_name: 'BabyMgmt',
          description: 'Daily point log across self-management categories',
          theme_color: '#2a78d6',
          background_color: '#fcfcfb',
          display: 'standalone',
          start_url: '.',
          scope: '.',
          icons: [
            { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
          shortcuts: [
            { name: 'Log Main', short_name: 'Main', url: '#/', description: 'Open Main tab' },
            { name: 'Log Points', short_name: 'Log', url: '#/log', description: 'Open Log tab' },
            { name: 'Dynamics', short_name: 'Dynamics', url: '#/dynamics', description: 'Open Dynamics tab' },
          ],
        },
        workbox: {
          navigateFallbackDenylist: [/^\/?v4\/spreadsheets/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/sheets\.googleapis\.com\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'sheets-api',
                networkTimeoutSeconds: 5,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  }
})
