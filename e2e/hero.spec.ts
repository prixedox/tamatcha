import { test, expect } from '@playwright/test'

test('tier a: fluid sim runs and advances frames', async ({ page }) => {
  await page.goto('./?tier=a')
  await expect(page.locator('.hero--gl')).toHaveCount(1)
  await page.waitForFunction(() => window.__tamatcha.frames > 10)
  const f1 = await page.evaluate(() => window.__tamatcha.frames)
  await page.waitForTimeout(400)
  const f2 = await page.evaluate(() => window.__tamatcha.frames)
  expect(f2).toBeGreaterThan(f1)
  await page.locator('.hero').screenshot({ path: 'test-results/hero-tier-a.png' })
})

test('tier c: no GL canvas activated', async ({ page }) => {
  await page.goto('./?tier=c')
  await expect(page.locator('.hero--gl')).toHaveCount(0)
})
