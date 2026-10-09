import { expect, test } from '@playwright/test'
for (const width of [1440, 390]) {
  test(`A lesson completes independently at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      const state = window as any; state.spoken = []; state.overlap = false
      let active: any, timer: any
      class Utterance { constructor(public text: string) {} }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance })
      Object.defineProperty(window, 'speechSynthesis', { value: {
        getVoices: () => [{ lang: 'en-GB', name: 'Test' }],
        speak(item: any) { state.overlap ||= !!active; state.spoken.push(item.text); active = item; timer = setTimeout(() => { active = undefined; item.onend?.() }, 30) },
        cancel() { clearTimeout(timer); active = undefined }, pause() {}, resume() {},
      } })
    })
    await page.goto('/')
    const main = page.locator('main')
    const target = page.getByRole('button', { name: 'Touch letter A', exact: true })
    await expect(page.locator('.touch-instruction')).toHaveText('Touch A')
    const picker = page.getByRole('combobox', { name: 'Select a letter to learn' })
    await expect(picker).toHaveValue('A')
    await expect(picker.locator('option')).toHaveCount(26)
    await expect(picker.locator('option[value="B"]')).toHaveJSProperty('disabled', true)
    await expect(target).toBeEnabled()
    const headerBox = (await page.locator('.game-header').boundingBox())!
    const gameBox = (await page.locator('.classroom-card').boundingBox())!
    expect(headerBox.y + headerBox.height).toBeLessThan(gameBox.y)
    expect((await target.boundingBox())!.width).toBeGreaterThan(44)
    await target.dispatchEvent('click'); await target.dispatchEvent('click'); await target.dispatchEvent('click')
    await expect(main).toHaveAttribute('data-busy', 'false')
    await expect(main).toHaveAttribute('data-phase', 'exploring')
    for (let i = 0; i < 3; i++) { await target.click(); await expect(main).toHaveAttribute('data-busy', 'false') }
    await expect(main).toHaveAttribute('data-phase', 'recognition-easy')
    await expect(page.locator('.touch-instruction')).toHaveText('Find A')
    await page.getByRole('button', { name: 'Touch car', exact: true }).click()
    await expect(main).toHaveAttribute('data-busy', 'false')
    await expect(main).toHaveAttribute('data-phase', 'recognition-easy')
    await target.click(); await expect(main).toHaveAttribute('data-busy', 'false')
    await expect(main).toHaveAttribute('data-phase', 'recognition-letters')
    await target.click(); await expect(main).toHaveAttribute('data-busy', 'false')
    await expect(main).toHaveAttribute('data-phase', 'recognition-collection')
    for (let i = 0; i < 3; i++) { await target.first().click(); await expect(main).toHaveAttribute('data-busy', 'false') }
    await expect(main).toHaveAttribute('data-phase', 'assessing')
    await expect(page.locator('.demo-hand')).toHaveCount(0)
    await page.screenshot({ path: `test-results/touch-assessment-${width}.png` })
    const wrongChoice = () => page.locator('.letter-hit-target').filter({ hasNot: page.locator('span', { hasText: /^A$/ }) }).first()
    for (let i = 0; i < 2; i++) { await wrongChoice().click(); await expect(main).toHaveAttribute('data-busy', 'false') }
    await expect(main).toHaveAttribute('data-phase', 'reinforcing')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('bright-steps-touch-progress')!).trials)).toEqual([])
    await target.click(); await expect(main).toHaveAttribute('data-busy', 'false')
    await expect(main).toHaveAttribute('data-phase', 'recognition-letters')
    await target.click(); await expect(main).toHaveAttribute('data-busy', 'false')
    for (let i = 0; i < 3; i++) { await target.first().click(); await expect(main).toHaveAttribute('data-busy', 'false') }
    await expect(main).toHaveAttribute('data-phase', 'assessing')
    await expect(page.locator('.demo-hand')).toHaveCount(0)
    for (let i = 0; i < 5; i++) {
      if (i === 0) {
        await page.locator('.letter-hit-target').filter({ hasNot: page.locator('span', { hasText: /^A$/ }) }).first().click()
        await expect(main).toHaveAttribute('data-busy', 'false')
        await expect(main).toHaveAttribute('data-phase', 'assessing')
        const evidence = await page.evaluate(() => JSON.parse(localStorage.getItem('bright-steps-touch-progress')!).trials)
        expect(evidence).toHaveLength(1)
        expect(evidence[0].correct).toBe(false)
      }
      const arrangement = await page.locator('.letter-hit-target').allTextContents()
      await target.click()
      if (i === 0) {
        await expect(main).toHaveAttribute('data-busy', 'true')
        await page.waitForTimeout(900)
        await expect(main).toHaveAttribute('data-phase', 'assessing')
        expect(await page.locator('.letter-hit-target').allTextContents()).toEqual(arrangement)
        await expect(target).toBeDisabled()
      }
      await expect(main).toHaveAttribute('data-busy', 'false')
    }
    await expect(main).toHaveAttribute('data-complete', 'true')
    await expect(page.getByRole('heading', { name: 'Amazing A!' })).toBeVisible()
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    const state = await page.evaluate(() => ({ spoken: (window as any).spoken, overlap: (window as any).overlap }))
    expect(state.overlap).toBe(false)
    expect(state.spoken.every((text: string) => ['A', 'B', 'Oops!'].includes(text))).toBe(true)
    expect(errors).toEqual([])
    await page.screenshot({ path: `test-results/a-complete-${width}.png` })
    await page.getByRole('button', { name: 'Play A again' }).click()
    await expect(page.locator('.touch-instruction')).toHaveText('Touch A')
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
}
