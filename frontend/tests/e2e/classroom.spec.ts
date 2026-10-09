import { expect, test, type Page } from '@playwright/test'
import { tracingStrokes } from '../../app/classroom/tracing'

async function mockVoice(page: Page) {
  await page.addInitScript(() => {
    const state = window as typeof window & { spoken: string[]; overlap: boolean; unlocked: boolean }
    state.spoken = []; state.overlap = false; state.unlocked = false
    let active: any = null, timer: ReturnType<typeof setTimeout> | undefined, paused = false
    class Utterance { text: string; onend?: () => void; onerror?: () => void; constructor(text: string) { this.text = text } }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
    const schedule = () => { if (active && !paused) timer = setTimeout(() => { const item = active; active = null; item?.onend?.() }, 120) }
    Object.defineProperty(window, 'speechSynthesis', { value: {
      speak(item: any) { state.overlap ||= active !== null; state.spoken.push(item.text); active = item; schedule() },
      cancel() { clearTimeout(timer); active = null },
      pause() { paused = true; clearTimeout(timer) },
      resume() { paused = false; schedule() }, getVoices: () => [{ lang: 'en-GB', name: 'Test voice' }],
    }, configurable: true })
  })
}
async function waitInput(page: Page, phase: string) {
  await expect(page.locator('main')).toHaveAttribute('data-phase', phase, { timeout: 30000 })
  await expect(page.locator('main')).toHaveAttribute('data-waiting', 'tap', { timeout: 10000 })
}
async function parentMenu(page: Page) {
  await page.getByRole('button', { name: 'Parent and teacher menu' }).click()
  const question = await page.locator('label[for="gate-answer"]').innerText()
  const numbers = question.match(/\d+/g)!.map(Number)
  await page.locator('#gate-answer').fill(String(numbers[0]! + numbers[1]!))
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}
async function trace(page: Page) {
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'trace', { timeout: 30000 })
  const surface = page.locator('.tracing-surface')
  await expect(surface).toBeVisible()
  await page.screenshot({ path: '../artifacts/refined-classroom-desktop-tracing.png' })
  // A tap or arbitrary line cannot finish tracing.
  await surface.click({ position: { x: 10, y: 10 } })
  await expect(surface).toHaveAttribute('data-stroke', '0')
  for (let i = 0; i < tracingStrokes.length; i++) {
    await expect(surface).toHaveAttribute('data-ready', 'true')
    await expect(surface).toHaveAttribute('data-stroke', String(i))
    const box = (await surface.boundingBox())!
    const path = tracingStrokes[i]!
    await page.mouse.move(box.x + path[0]!.x * box.width, box.y + path[0]!.y * box.height)
    await page.mouse.down()
    await page.mouse.move(box.x + path[1]!.x * box.width, box.y + path[1]!.y * box.height, { steps: 24 })
    await page.mouse.up()
  }
}

test('child-first narrated lesson, three strokes, five contexts, recall and saved progress', async ({ page }) => {
  const errors: string[] = [], requests: string[] = []
  page.on('pageerror', error => errors.push(error.message)); page.on('request', request => requests.push(request.url()))
  await mockVoice(page); await page.goto('/')
  await expect(page.locator('.speech-card,.progress-dots,.action-controls,.classroom-caption,.letter-options')).toHaveCount(0)
  await expect(page.getByText('Teacher Sunny', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => (window as any).spoken)).toEqual([])
  await page.screenshot({ path: '../artifacts/refined-classroom-desktop-welcome.png' })
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'see')
  await page.screenshot({ path: '../artifacts/refined-classroom-desktop-introduction.png' })
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'imitate', { timeout: 10000 })
  await page.screenshot({ path: '../artifacts/refined-classroom-board.png' })
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'pupil-one', { timeout: 10000 })
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'pupil-two', { timeout: 10000 })
  await waitInput(page, 'touch')
  const target = page.getByRole('button', { name: 'Touch letter A' })
  const box = (await target.boundingBox())!
  expect(box.width).toBeGreaterThan(44); expect(box.height).toBeGreaterThan(44)
  // Exercise the genuine scene Raycaster, through A's hollow centre and invisible collider.
  await page.locator('.three-stage canvas').dispatchEvent('pointerdown', { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerId: 1 })
  await waitInput(page, 'explore-jump'); await target.click()
  await waitInput(page, 'explore-move'); await target.click()
  await trace(page)
  for (let round = 0; round < 5; round++) {
    await waitInput(page, `recognition-${round}`)
    if (round === 0) {
      await page.getByRole('button', { name: 'Touch letter B' }).click()
      await page.getByRole('button', { name: 'Touch letter C' }).click()
      await expect(page.locator('main')).toHaveAttribute('data-phase', 'recognition-0')
    }
    await page.getByRole('button', { name: 'Touch letter A' }).click({ clickCount: 3 })
  }
  await waitInput(page, 'recall'); await page.getByRole('button', { name: 'Touch letter A' }).click()
  await expect(page.getByRole('button', { name: 'Play the lesson again' })).toBeVisible({ timeout: 10000 })
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('bright-steps-classroom-v2')!))
  expect(progress.tracingCompleted).toBe(true)
  expect(progress.completed).toContain('reward')
  expect(progress.attempts.filter((row: any) => row.correct && row.phase.startsWith('recognition-'))).toHaveLength(5)
  const voice = await page.evaluate(() => ({ spoken: (window as any).spoken, overlap: (window as any).overlap }))
  expect(voice.overlap).toBe(false)
  expect(voice.spoken.slice(0, 4)).toEqual(["Hello! Let's learn a new letter.", 'Look! This is A.', 'A.', 'A.'])
  expect(voice.spoken).toContain('Can you say A?')
  expect(voice.spoken).toContain('Down.'); expect(voice.spoken).toContain('Across.')
  expect(requests.some(url => url.includes('/api/'))).toBe(false)
  expect(errors).toEqual([])
})

test('portrait composition, replay, parent pause, resume and phase restart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await mockVoice(page); await page.goto('/')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await waitInput(page, 'touch')
  const a = page.getByRole('button', { name: 'Touch letter A' }), box = (await a.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.width).toBeGreaterThan(44)
  await page.getByRole('button', { name: 'Replay instruction' }).click()
  await page.screenshot({ path: '../artifacts/refined-classroom-mobile.png' })
  await parentMenu(page)
  await expect(page.locator('main')).toHaveAttribute('data-paused', 'true')
  await page.getByLabel('Choose lesson phase').selectOption('recognition-4')
  await waitInput(page, 'recognition-4')
  const boxes = await page.locator('.letter-hit-target').evaluateAll(buttons => buttons.map(button => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }))
  boxes.forEach((first, i) => {
    expect(first.width).toBeGreaterThan(44); expect(first.height).toBeGreaterThan(44)
    expect(first.x).toBeGreaterThanOrEqual(0); expect(first.x + first.width).toBeLessThanOrEqual(390)
    boxes.slice(i + 1).forEach(other => expect(first.x + first.width <= other.x || other.x + other.width <= first.x || first.y + first.height <= other.y || other.y + other.height <= first.y).toBe(true))
  })
  await page.screenshot({ path: '../artifacts/refined-classroom-mobile-recognition.png' })
  await page.reload(); await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Continue', exact: true }).click(); await waitInput(page, 'recognition-4')
  await parentMenu(page); await page.getByLabel('Choose lesson phase').selectOption('trace')
  await expect(page.locator('.tracing-surface')).toBeVisible()
  await page.waitForTimeout(1400)
  await page.screenshot({ path: '../artifacts/refined-classroom-mobile-tracing.png' })
  await parentMenu(page); await page.getByRole('button', { name: 'Restart lesson', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'see', { timeout: 10000 })
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(150)
  const landscapeA = (await page.getByRole('button', { name: 'Touch letter A' }).boundingBox())!
  expect(landscapeA.x).toBeGreaterThanOrEqual(0); expect(landscapeA.x + landscapeA.width).toBeLessThanOrEqual(844)
  expect(landscapeA.y).toBeGreaterThanOrEqual(70); expect(landscapeA.y + landscapeA.height).toBeLessThanOrEqual(390)
  await page.screenshot({ path: '../artifacts/refined-classroom-landscape.png' })
})

test('missing recording falls back, and mute stops speech without ending the lesson', async ({ page }) => {
  await mockVoice(page)
  await page.route('**/audio/letter-a/manifest.json', async route => {
    const response = await route.fetch()
    const manifest = await response.json()
    manifest.introduce.available = true
    await route.fulfill({ json: manifest })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-phase', 'see')
  await expect.poll(() => page.evaluate(() => (window as any).spoken)).toContain('Look! This is A.')
  await page.getByRole('button', { name: 'Mute narration' }).click()
  await expect(page.getByRole('button', { name: 'Unmute narration' })).toBeVisible()
  await page.getByRole('button', { name: 'Unmute narration' }).click()
  await waitInput(page, 'touch')
  expect(await page.evaluate(() => (window as any).overlap)).toBe(false)
  await expect(page.locator('.lesson-error')).toHaveCount(0)
})

test('a device without speech enables captions and keeps the touch lesson usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('.optional-caption')).toBeVisible()
  await parentMenu(page)
  await page.getByLabel('Choose lesson phase').selectOption('recognition-0')
  await waitInput(page, 'recognition-0')
  await page.getByRole('button', { name: 'Touch letter A' }).click()
  await waitInput(page, 'recognition-1')
})
