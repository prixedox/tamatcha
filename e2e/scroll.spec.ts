import { test, expect } from '@playwright/test'

test('reveals appear on scroll', async ({ page }) => {
  await page.goto('./')
  const card = page.locator('.mcard').first()
  await expect(card).not.toHaveClass(/\bin\b/)
  await card.scrollIntoViewIfNeeded()
  await expect(card).toHaveClass(/\bin\b/)
})

test('reduced motion: everything visible immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  const notIn = await page.locator('.reveal:not(.in)').count()
  expect(notIn).toBe(0)
})

test('nav gains scrolled state', async ({ page }) => {
  await page.goto('./')
  await page.evaluate(() => window.scrollTo(0, 600))
  await expect(page.locator('#nav')).toHaveClass(/nav--scrolled/)
})
