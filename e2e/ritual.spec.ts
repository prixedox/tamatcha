import { test, expect } from '@playwright/test'

test.describe('ritual rotation scene (JS, desktop)', () => {
  test('pins with rotating canvas and progressive step reveal', async ({ page }) => {
    await page.goto('./')
    const section = page.locator('.ritual')
    await expect(section).toHaveClass(/ritual-live/) // real fizz frames ship in the repo
    await expect(page.locator('.ritual__canvas')).toBeVisible()
    const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // pin start: step 1 on, steps 2+3 off
    await page.evaluate((t) => window.scrollTo(0, t + 0.05 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(0)).toHaveClass(/active/)
    await expect(page.locator('.step').nth(1)).not.toHaveClass(/active/)
    // middle: step 2 joins, step 3 still off
    await page.evaluate((t) => window.scrollTo(0, t + 0.5 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(1)).toHaveClass(/active/)
    await expect(page.locator('.step').nth(2)).not.toHaveClass(/active/)
    // near the end: all three on
    await page.evaluate((t) => window.scrollTo(0, t + 0.9 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(2)).toHaveClass(/active/)
    // scrolling back hides later steps again
    await page.evaluate((t) => window.scrollTo(0, t + 0.05 * 2.5 * window.innerHeight), top)
    await expect(page.locator('.step').nth(2)).not.toHaveClass(/active/)
  })

  test('no manifest: static fallback, no pin, steps reveal normally', async ({ page }) => {
    await page.route('**/brand/turntable/fizz/manifest.json', (route) => route.fulfill({ status: 404 }))
    await page.goto('./')
    await page.locator('.ritual').scrollIntoViewIfNeeded()
    await expect(page.locator('.ritual')).not.toHaveClass(/ritual-live/)
    await expect(page.locator('.ritual__canvas')).toHaveCount(0)
    await expect(page.locator('.step').nth(2)).toHaveClass(/\bin\b/)
  })

  test('reduced motion: static fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./')
    await expect(page.locator('.ritual')).not.toHaveClass(/ritual-live/)
    await expect(page.locator('.ritual__canvas')).toHaveCount(0)
    await expect(page.locator('.step').nth(2)).toBeVisible()
  })
})
