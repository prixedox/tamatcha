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

test('tier b: noise shader runs', async ({ page }) => {
  await page.goto('./?tier=b')
  await expect(page.locator('.hero--gl')).toHaveCount(1)
  await page.waitForFunction(() => window.__tamatcha.frames > 10)
  await expect(page.locator('html')).toHaveAttribute('data-tier', 'b')
  await page.locator('.hero').screenshot({ path: 'test-results/hero-tier-b.png' })
})

test('tier a: pointer movement stirs (splats increase)', async ({ page }) => {
  // The idle whisk adds a splat every frame regardless of input, so a plain
  // before/after count proves nothing. Compare an idle window against an
  // equal-length window of vigorous mouse movement: the moving window must
  // add clearly more splats than the whisk alone.
  await page.goto('./?tier=a')
  await page.waitForFunction(() => window.__tamatcha.frames > 10)

  // idle baseline: no pointer movement for 600ms
  const idle0 = await page.evaluate(() => window.__tamatcha.splats)
  await page.waitForTimeout(600)
  const idleDelta = (await page.evaluate(() => window.__tamatcha.splats)) - idle0

  // active window: continuous vigorous movement over the hero for ~600ms
  const move0 = await page.evaluate(() => window.__tamatcha.splats)
  const until = Date.now() + 600
  let i = 0
  while (Date.now() < until) {
    const x = 250 + (i % 2 === 0 ? 500 : 0)
    const y = 220 + (i % 3) * 140
    await page.mouse.move(x, y, { steps: 12 })
    i++
  }
  const moveDelta = (await page.evaluate(() => window.__tamatcha.splats)) - move0

  // pointer-stir splats stack on top of the idle whisk with a wide margin
  expect(moveDelta).toBeGreaterThan(idleDelta + 20)
})
