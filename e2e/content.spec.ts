import { test, expect } from '@playwright/test'

const MUST_HAVE = [
  'Prémiová matcha', 'čerstvě našleháno.', 'První matcha bar v Ostravě',
  'Z Kagošimy',
  'Matcha Fizz', 'Matcha Cloud', 'Iced / Hot Matcha Latté', 'Iced Yerba Maté',
  'Na Hradbách 1481/6', '+420 605 000 456', 'Drink zdarma?',
  '© 2026 Tamatcha · Ostrava',
]
// live Rituál shows the default drink's (fizz) build steps; the ceremonial
// texts are the no-JS/reduced-motion fallback paired with the static photos
const RITUAL_LIVE = ['Pyré na dno', 'Tonic a led', 'Matcha koruna']
const RITUAL_FALLBACK = ['Prosíváme', 'Šleháme', 'Podáváme']

test('all v1 content present with JS', async ({ page }) => {
  await page.goto('./')
  const text = await page.locator('body').innerText()
  for (const s of [...MUST_HAVE, ...RITUAL_LIVE]) expect(text, `missing: ${s}`).toContain(s)
  await expect(page.locator('.mcard')).toHaveCount(4)
  await expect(page.locator('.ig__tile')).toHaveCount(6)
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('page fully readable without JS', async ({ page }) => {
    await page.goto('./')
    const text = await page.locator('body').innerText()
    for (const s of [...MUST_HAVE, ...RITUAL_FALLBACK]) expect(text, `missing: ${s}`).toContain(s)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('.mcard').first()).toBeVisible()
  })
})
