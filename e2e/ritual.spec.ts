import { test, expect } from '@playwright/test'

async function scrollToRitual(page: import('@playwright/test').Page, frac: number) {
  await page.evaluate((f) => {
    const [start, end] = window.__tamatcha.ritualRange!
    window.scrollTo(0, start + (end - start) * f)
  }, frac)
  await page.waitForTimeout(600) // let Lenis/ScrollTrigger settle
}

test('ritual scene scrubs through chapters both directions', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.waitForFunction(() => window.__tamatcha.ritualRange !== null)
  await scrollToRitual(page, 0.5) // middle => chapter 1 (Šleháme)
  expect(await page.evaluate(() => window.__tamatcha.ritualStep)).toBe(1)
  await expect(page.locator('.step[data-step="1"]')).toHaveClass(/active/)
  await scrollToRitual(page, 0.9) // => chapter 2
  expect(await page.evaluate(() => window.__tamatcha.ritualStep)).toBe(2)
  await scrollToRitual(page, 0.1) // back => chapter 0
  expect(await page.evaluate(() => window.__tamatcha.ritualStep)).toBe(0)
})

test('drink switcher swaps captions, frames dir, and URL', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.waitForFunction(() => window.__tamatcha.ritualRange !== null)
  await scrollToRitual(page, 0.1)
  const latteFrames: string[] = []
  page.on('request', (r) => { if (r.url().includes('ritual/latte/')) latteFrames.push(r.url()) })
  await page.locator('.dbtn[data-drink="latte"]').click()
  await expect(page.locator('.step[data-step="0"] h3')).toHaveText('Mléko a led')
  await expect(page.locator('.dbtn[data-drink="latte"]')).toHaveClass(/is-active/)
  expect(await page.evaluate(() => window.__tamatcha.ritualDrink)).toBe('latte')
  expect(page.url()).toContain('drink=latte')
  await page.waitForTimeout(400)
  expect(latteFrames.length).toBeGreaterThan(0)
  // back to the default matcha: original captions restored, param dropped
  await page.locator('.dbtn[data-drink=""]').click()
  await expect(page.locator('.step[data-step="0"] h3')).toHaveText('Prosíváme')
  expect(page.url()).not.toContain('drink=')
})

test('reduced motion: no pin, static ritual photos visible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('.pin-spacer')).toHaveCount(0)
  await expect(page.locator('.ritual--live')).toHaveCount(0)
  await page.locator('#ritual').scrollIntoViewIfNeeded()
  // photos render as a static 3-up grid (not pinned) when not live
  await expect(page.locator('.ritual__stage .ritual__photo img').first()).toBeVisible()
  await expect(page.locator('.ritual__photo')).toHaveCount(3)
})
