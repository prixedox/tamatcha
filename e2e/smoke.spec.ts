import { test, expect } from '@playwright/test'

test('site builds and boots', async ({ page }) => {
  await page.goto('./')
  await expect(page.locator('html.js')).toHaveCount(1)
  await expect(page.locator('h1')).toBeVisible()
})
