import { test, expect } from '@playwright/test'

for (const vp of [{ w: 1280, h: 800, name: 'desktop' }, { w: 390, h: 844, name: 'mobile' }]) {
  test(`layout sane at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.goto('./')
    // no horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.locator('.hero')).toBeVisible()
    // scroll through so reveals fire and lazy images load, then return to top
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 40))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `test-results/${vp.name}-full.png`, fullPage: true })
  })
}
