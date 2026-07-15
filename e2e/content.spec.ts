import { test, expect } from '@playwright/test'

const MUST_HAVE = [
  'Ceremoniální matcha', 'čerstvě našleháno.', 'První Matcha Bar v Ostravě',
  'Z Kagoshimy',
  'Matcha Fizz', 'Matcha Cloud', 'Iced / Hot Matcha Latté', 'Iced Yerba Maté',
  '( matcha, tonic, pyré dle výběru )', 'Kokos',
  '450 ml', '119,- Kč', '79,- Kč',
  'Prosíváme', 'Mícháme pastu', 'Došleháváme',
  'Na Hradbách 1481/6', '+420 605 000 456', 'tamatcha@seznam.cz',
  '8:30–18:00', '12:00–18:00', 'zavřeno',
  '© 2026 tamatcha · Ostrava',
]

const MUST_NOT = [
  'Prémiová', 'prémiová',
  'Podáváme',
  'Pistácie', 'soda',
  'Drink zdarma',
  '7:00–18:00', '9:00–18:00', '© 2026 Tamatcha',
]

test('all brand-redesign content present with JS', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('body').innerText()
  for (const s of MUST_HAVE) expect(text, `missing: ${s}`).toContain(s)
  for (const s of MUST_NOT) expect(text, `stale copy: ${s}`).not.toContain(s)
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.lineup__item')).toHaveCount(5)

  const aboutImg = page.locator('.about__media img')
  await aboutImg.scrollIntoViewIfNeeded()
  await expect
    .poll(() => aboutImg.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0)
  const metaDesc = await page.locator('meta[name="description"]').getAttribute('content')
  expect(metaDesc).toContain('Ceremoniální matcha')
  expect(metaDesc).not.toContain('Prémiová')
  const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content')
  expect(ogDesc).toContain('Ceremoniální matcha')
  expect(ogDesc).not.toContain('Prémiová')
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
