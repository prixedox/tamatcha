import { test, expect } from '@playwright/test'

test.describe('drink showcase (JS, desktop)', () => {
  test('enhances the lineup and starts on Matcha Fizz', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__title')).toHaveText('Matcha Fizz')
    await expect(page.locator('.showcase__formula')).toHaveText('( matcha, soda, pyré dle výběru )')
    await expect(page.locator('.lineup__item.is-active figcaption')).toHaveText('Matcha Fizz')
  })

  test('scrubbing through the pin changes the active drink', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    const sectionTop = await page
      .locator('.lineup')
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // pin lasts 3 viewport heights (end: '+=300%'); 2.9vh ≈ segment 5
    await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.97 * 3 * 800)
    await expect(page.locator('.showcase__title')).toHaveText('Iced Yerba Maté')
    await expect(page.locator('.lineup__item.is-active figcaption')).toHaveText('Iced Yerba Maté')
    // middle of the pin ≈ third drink
    await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.5 * 3 * 800)
    await expect(page.locator('.showcase__title')).toHaveText('Hot Matcha Latté')
  })

  test('reduced motion: no pin, no stage, static strip', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./')
    await expect(page.locator('.lineup')).not.toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__stage')).toHaveCount(0)
    await expect(page.locator('.lineup__item')).toHaveCount(5)
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('static five-figure strip, no stage', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup__item')).toHaveCount(5)
    await expect(page.locator('.showcase__stage')).toHaveCount(0)
    await expect(page.locator('.lineup__item').first()).toBeVisible()
  })
})
