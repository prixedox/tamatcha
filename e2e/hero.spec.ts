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
  // `pointerSplats` is a dedicated counter incremented ONLY inside the hero's
  // pointer-move handler (never by the idle whisk, never by sim.splat itself),
  // so it isolates real pointer input from the always-running whisk with zero
  // wall-clock/timing dependence: idle time can't inflate it, and it only moves
  // when the handler actually calls sim.splat.
  //
  // test.slow(): the tier-A fluid sim runs a continuous rAF loop under software
  // (swiftshader) WebGL, which saturates the main thread — so CDP-dispatched
  // mouse input is processed slowly, especially under parallel workers. Keep the
  // actual movement small (a couple of stepped moves already emit plenty of
  // pointermove events) and give the test extra headroom rather than depend on
  // wall-clock throughput.
  test.slow()
  await page.goto('./?tier=a')
  await page.waitForFunction(() => window.__tamatcha.frames > 10)

  // no pointer input yet, even after an idle window: pointer counter stays 0
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.__tamatcha.pointerSplats)).toBe(0)

  // a small amount of real movement over the hero: a stepped move emits one
  // pointermove per step, so this drives the handler many times over
  await page.mouse.move(300, 250)
  await page.mouse.move(760, 470, { steps: 6 })
  await page.mouse.move(360, 300, { steps: 6 })

  await page.waitForFunction(() => window.__tamatcha.pointerSplats > 0)
  expect(await page.evaluate(() => window.__tamatcha.pointerSplats)).toBeGreaterThan(0)
})
