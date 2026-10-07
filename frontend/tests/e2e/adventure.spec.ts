import { expect, test, type Page } from '@playwright/test'
import { curriculum } from '../../app/domain/curriculum'

async function drawLetter(page: Page) {
  await expect(page.locator('canvas.writing-canvas')).toBeVisible()
  const box = await page.locator('canvas.writing-canvas').boundingBox()
  for (const path of curriculum[0]!.strokes) {
    const first = path[0]!
    await page.mouse.move(box!.x + first.x * box!.width, box!.y + first.y * box!.height)
    await page.mouse.down()
    for (const point of path.slice(1)) await page.mouse.move(box!.x + point.x * box!.width, box!.y + point.y * box!.height, { steps: 16 })
    await page.mouse.up()
  }
  await page.getByRole('button', { name: 'I’m done' }).click()
  await expect(page.getByText('Lovely work! You made it.')).toBeVisible()
  await page.getByRole('button', { name: /Next step|Finish session/ }).click()
}
async function parentGate(page: Page) {
  await page.getByRole('button', { name: 'Parent corner' }).click()
  const question = await page.locator('label[for="gate-answer"]').innerText()
  const numbers = question.match(/\d+/g)!.map(Number)
  await page.locator('#gate-answer').fill(String(numbers[0]! + numbers[1]!))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}
async function queuedCount(page: Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open('bright-steps', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const request = open.result.transaction('attempts').objectStore('attempts').count()
      request.onsuccess = () => { resolve(request.result); open.result.close() }
    }
  }))
}
async function setupFamily(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Learn.*Play.*Grow/ })).toBeVisible()
  await page.screenshot({ path: '../artifacts/welcome-desktop.png', fullPage: true })
  await page.getByRole('button', { name: 'Get Started' }).click()
  await page.getByLabel(/Parent.*name/).fill('Test Parent')
  await page.getByLabel('Email', { exact: true }).fill(`family-${crypto.randomUUID()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('safe-password-123')
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.getByLabel('Child’s first name').or(page.getByLabel("Child's first name")).fill('Teni')
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.getByRole('button', { name: /^Save and Continue/ }).click()
  await page.getByRole('button', { name: /Continue.*Continue learning/ }).click()
}
async function firstLesson(page: Page) {
  await expect(page.getByRole('heading', { name: 'This is A.' })).toBeVisible()
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(page.getByRole('heading', { name: 'A. Say A.' })).toBeVisible()
  await page.getByRole('button', { name: 'Hear instruction' }).click()
  await page.getByRole('button', { name: 'Next step' }).click()
  await expect(page.getByRole('heading', { name: 'Watch how we write A.' })).toBeVisible()
  await page.getByRole('button', { name: 'Next step' }).click()
  await drawLetter(page); await drawLetter(page); await drawLetter(page)
  await expect(page.getByRole('heading', { name: 'Touch A.' })).toBeVisible()
}
test('family setup, writing, recognition, offline resume and parent progress', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await setupFamily(page)
  await firstLesson(page)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await context.setOffline(true)
  await page.locator('.accessible-options').getByRole('button', { name: 'A', exact: true }).click()
  await expect(page.getByText('You found it!')).toBeVisible()
  await expect.poll(() => queuedCount(page)).toBeGreaterThan(0)
  await page.getByRole('button', { name: /Next step|Finish session/ }).click()
  await page.getByRole('button', { name: 'Take a break' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ready to learn, Teni?' })).toBeVisible()
  await context.setOffline(false)
  await expect.poll(() => queuedCount(page)).toBe(0)
  await parentGate(page)
  await expect(page.getByRole('heading', { name: /Teni.*Letters/ })).toBeVisible()
  await expect(page.getByText('Independent writing', { exact: true })).toBeVisible()
  await page.screenshot({ path: '../artifacts/parent-dashboard.png', fullPage: true })
  expect(errors).toEqual([])
})

test('storyboard steps, celebrations, previous navigation, games and completion', async ({ page }) => {
  await setupFamily(page)
  await firstLesson(page)
  await page.getByRole('button', { name: 'Previous step' }).click()
  await expect(page.getByText('This step is saved.', { exact: false })).toBeVisible()
  const stars = await page.locator('.star-count').innerText()
  await page.getByRole('button', { name: 'Next step', exact: false }).click()
  expect(await page.locator('.star-count').innerText()).toBe(stars)
  for (const pattern of ['Road lanes', 'Underwater bubbles', 'Sky balloons', 'Moving train', 'Hidden letters', 'Catch the letter', 'Listen and choose']) {
    await expect(page.locator('.lesson-title')).toContainText(pattern)
    await page.getByRole('button', { name: 'Pause game' }).click()
    await expect(page.getByText('Game paused. Ready when you are.')).toBeVisible()
    await page.getByRole('button', { name: 'Resume game' }).click()
    if (pattern === 'Hidden letters') {
      const canvas = page.locator('.game-host canvas')
      const box = (await canvas.boundingBox())!
      const values = await page.locator('.accessible-options button').allTextContents()
      const target = values.indexOf('A')
      const position = { x: box.width * (target + 1) / (values.length + 1), y: box.height * (190 + target % 2 * 25) / 400 }
      await canvas.click({ position }); await expect(page.locator('.success-splash')).not.toBeVisible()
      await canvas.click({ position })
    } else await page.locator('.accessible-options').getByRole('button', { name: 'A', exact: true }).click()
    await expect(page.locator('.success-splash')).toBeVisible()
    if (pattern === 'Road lanes') await page.screenshot({ path: '../artifacts/letter-success.png', fullPage: true })
    await page.getByRole('button', { name: /Next step|Finish session/ }).click()
  }
  await expect(page.getByRole('heading', { name: 'Great Job!' })).toBeVisible()
  await expect(page.getByText('You earned 13 stars!')).toBeVisible()
  await page.screenshot({ path: '../artifacts/session-complete.png', fullPage: true })
  await page.getByRole('button', { name: 'Previous step' }).click()
  await expect(page.locator('.lesson-title')).toContainText('Mixed Review')
  await expect(page.getByText('This step is saved.', { exact: false })).toBeVisible()
})
test('mobile welcome fits the viewport and parent mode stays protected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Get Started' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '../artifacts/welcome-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Parent corner' }).click()
  await page.locator('#gate-answer').fill('0')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Try that once more.')).toBeVisible()
})
