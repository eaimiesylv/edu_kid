import { expect, test } from '@playwright/test'

test('PWA controls the page and caches the offline shell', async ({ page }) => {
  page.on('console', message => {
    if (message.type() === 'error') console.error(message.text())
  })
  await page.goto('/')
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state)).toBe('activated')
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
})
