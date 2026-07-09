import { test, expect } from '@playwright/test'

test('menu fx layers present, decorative, and text stays readable', async ({ page }) => {
  await page.goto('./?tier=c')
  await expect(page.locator('.mcard__fx')).toHaveCount(4)
  for (const fx of await page.locator('.mcard__fx').all()) {
    await expect(fx).toHaveAttribute('aria-hidden', 'true')
  }
  // text container sits above fx layer (.mcard > :not(.mcard__fx) { z-index: 1 })
  const z = await page.locator('.mcard__top').first().evaluate(
    (el) => getComputedStyle(el).zIndex)
  expect(z).toBe('1')
  await expect(page.locator('.mcard h3').first()).toBeVisible()
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('menu fx are paused (static first frame) without JS', async ({ page }) => {
    await page.goto('./')
    const state = await page.locator('.mcard__fx').first().evaluate(
      (el) => getComputedStyle(el).animationPlayState)
    expect(state).toBe('paused')
  })
})
