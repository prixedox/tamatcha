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

test('hero watermark and trio get scroll-linked transforms', async ({ page }) => {
  await page.goto('./')
  const before = await page
    .locator('.hero__wm')
    .evaluate((el) => getComputedStyle(el).transform)
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect
    .poll(() => page.locator('.hero__wm').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before)
  await expect
    .poll(() => page.locator('.hero__trio').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe('none')
})

test('reduced motion: no scroll-linked hero transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.evaluate(() => window.scrollTo(0, 500))
  // give any (wrongly registered) trigger a beat to fire, then assert clean
  await page.waitForTimeout(300)
  expect(await page.locator('.hero__wm').evaluate((el) => el.style.transform)).toBe('')
  expect(await page.locator('.hero__trio').evaluate((el) => el.style.transform)).toBe('')
})
