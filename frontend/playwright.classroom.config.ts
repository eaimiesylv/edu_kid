import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e', testMatch: 'classroom.spec.ts', workers: 1,
  timeout: 90000,
  use: { baseURL: process.env.CLASSROOM_TEST_URL ?? 'http://127.0.0.1:3174', channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: process.env.CLASSROOM_TEST_URL ? undefined : { command: 'node .output/server/index.mjs', url: 'http://127.0.0.1:3174', reuseExistingServer: true, env: { PORT: '3174', HOST: '127.0.0.1' } },
})
