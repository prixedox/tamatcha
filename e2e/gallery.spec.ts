import { test, expect } from '@playwright/test'

test('gallery drags horizontally and suppresses click after drag', async ({ page }) => {
  await page.goto('./?tier=c')
  const strip = page.locator('.ig__strip')
  await strip.scrollIntoViewIfNeeded()
  const before = await strip.evaluate((el) => el.scrollLeft)
  const box = (await strip.boundingBox())!
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 15 })
  await page.mouse.up()
  const after = await strip.evaluate((el) => el.scrollLeft)
  expect(after).toBeGreaterThan(before)
  expect(page.url()).not.toContain('instagram.com') // click suppressed, no navigation
})

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false })
  test('gallery falls back to grid', async ({ page }) => {
    await page.goto('./')
    const display = await page.locator('.ig__strip').evaluate((el) => getComputedStyle(el).display)
    expect(display).toBe('grid')
  })
})
