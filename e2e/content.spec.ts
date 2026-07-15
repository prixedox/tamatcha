import { test, expect } from '@playwright/test'

const MUST_HAVE = [
  'Ceremoniální matcha', 'čerstvě našleháno.', 'První Matcha Bar v Ostravě',
  'Z Kagoshimy',
  'Matcha Fizz', 'Matcha Cloud', 'Iced / Hot Matcha Latté', 'Iced Yerba Maté',
  '( matcha, soda, pyré dle výběru )', 'Pistácie',
  '450 ml', '119,- Kč', '79,- Kč',
  'Prosíváme', 'Mícháme pastu', 'Došleháváme',
  'Na Hradbách 1481/6', '+420 605 000 456', 'Drink zdarma?',
  '© 2026 Tamatcha · Ostrava',
]

const MUST_NOT = [
  'Prémiová', 'prémiová',
  'Podáváme',
]

test('all brand-redesign content present with JS', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('body').innerText()
  for (const s of MUST_HAVE) expect(text, `missing: ${s}`).toContain(s)
  for (const s of MUST_NOT) expect(text, `stale copy: ${s}`).not.toContain(s)
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.lineup__item')).toHaveCount(5)
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('page fully readable without JS', async ({ page }) => {
    await page.goto('./')
    const text = await page.locator('body').innerText()
    for (const s of MUST_HAVE) expect(text, `missing: ${s}`).toContain(s)
    for (const s of MUST_NOT) expect(text, `stale copy: ${s}`).not.toContain(s)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('.mcard').first()).toBeVisible()
  })
})
