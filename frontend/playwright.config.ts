import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', workers: 1, timeout: 90000, expect: { timeout: 15000 },
  use: { baseURL: 'http://127.0.0.1:3173', channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge', headless: true,
    viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node .output/server/index.mjs', url: 'http://127.0.0.1:3173', reuseExistingServer: false,
      env: { PORT: '3173', HOST: '127.0.0.1', NUXT_PUBLIC_API_BASE: 'http://127.0.0.1:8173/api' } },
    { command: 'node scripts/api-test-server.mjs', url: 'http://127.0.0.1:8173/up', reuseExistingServer: false },
  ],
})
