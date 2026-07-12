import { test, expect } from '@playwright/test'

test('lineup shows all five drinks in brand order', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.lineup__item figcaption')).toHaveText([
    'Matcha Fizz', 'Iced Matcha Latté', 'Hot Matcha Latté', 'Matcha Cloud', 'Iced Yerba Maté',
  ])
  for (const img of await page.locator('.lineup__item img').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }
})
