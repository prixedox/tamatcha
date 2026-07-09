import { test, expect } from '@playwright/test'

test('reveals appear on scroll', async ({ page }) => {
  await page.goto('./?tier=c')
  // Not `.step` — Task 9's live ritual scene pre-marks all `.step` elements `.in`
  // immediately (captions are highlighted via `.active`, not the reveal-on-scroll
  // mechanism). Use a `.mcard` (menu card) instead: it's a plain `.reveal` element
  // below the fold, untouched by the ritual pin, so it still proves generic
  // scroll-reveal works.
  const card = page.locator('.mcard').first()
  await expect(card).not.toHaveClass(/\bin\b/)
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveClass(/\bin\b/)
})

test('reduced motion: everything visible immediately, native scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'c')
  const notIn = await page.locator('.reveal:not(.in)').count()
  expect(notIn).toBe(0)
})

test('nav gains scrolled state', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.evaluate(() => window.scrollTo(0, 600))
  await expect(page.locator('#nav')).toHaveClass(/nav--scrolled/)
})
