import { test, expect } from '@playwright/test'

test('journey line draws on reveal', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.locator('#o-nas').scrollIntoViewIfNeeded()
  await expect(page.locator('.about__journey')).toHaveClass(/\bin\b/)
})

test('map route draws on reveal', async ({ page }) => {
  await page.goto('./?tier=c')
  await page.locator('.mapcard').scrollIntoViewIfNeeded()
  await expect(page.locator('.mapcard')).toHaveClass(/\bin\b/)
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('map route is drawn without JS', async ({ page }) => {
    await page.goto('./?tier=c')
    const offset = await page.locator('.grid-lines .route').evaluate(
      (el) => parseFloat(getComputedStyle(el).strokeDashoffset),
    )
    expect(offset).toBe(0)
  })
})
