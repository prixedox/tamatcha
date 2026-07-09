import { test, expect } from '@playwright/test'

test('reveals appear on scroll', async ({ page }) => {
  await page.goto('./?tier=c')
  const step = page.locator('.step[data-step="2"]')
  await expect(step).not.toHaveClass(/\bin\b/)
  await step.scrollIntoViewIfNeeded()
  await expect(step).toHaveClass(/\bin\b/)
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
