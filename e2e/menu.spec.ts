import { test, expect } from '@playwright/test'

test('menu: 4 drinks, screens-version prices, real photos load', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.mcard .price')).toHaveText([
    '119,- Kč', '119,- Kč', '119,- Kč', '79,- Kč',
  ])
  // lazy images: bring each into view, then poll until decoded
  for (const img of await page.locator('.mcard__drink').all()) {
    await img.scrollIntoViewIfNeeded()
    await expect(img).toBeVisible()
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0)
  }
})

test('menu matches the current flyer wording', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('#menu').innerText()
  expect(text).toContain('( matcha, tonic, pyré dle výběru )')
  expect(text).toContain('( matcha cloud, kokosová voda, pyré dle výběru, posyp )')
  expect(text).toContain('( matcha, ovesné/mandlové mléko, sirup dle výběru, posyp )')
  expect(text).toContain('Kokos')
  expect(text).not.toContain('soda')
  expect(text).not.toContain('Pistácie')
})
