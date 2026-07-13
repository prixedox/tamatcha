import { test, expect } from '@playwright/test'

test.describe('mobile nav toggle', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('burger opens and closes the menu', async ({ page }) => {
    await page.goto('./')
    const burger = page.locator('#burger')
    const links = page.locator('.nav__links')

    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await expect(links).not.toBeVisible()

    await burger.click()
    await expect(burger).toHaveAttribute('aria-expanded', 'true')
    await expect(links).toBeVisible()

    await links.locator('a').first().click()
    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await expect(links).not.toBeVisible()
  })
})

test('nav is legible at top of page — has a backing over the hero (not fully transparent)', async ({ page }) => {
  // The fixed nav overlays page content at scrollY 0, so it needs an opaque
  // backing on the paper background — otherwise links float over content.
  await page.goto('./')
  const { image, color } = await page.locator('#nav').evaluate((el) => {
    const cs = getComputedStyle(el)
    return { image: cs.backgroundImage, color: cs.backgroundColor }
  })
  expect(image !== 'none' || color !== 'rgba(0, 0, 0, 0)').toBe(true)
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('nav has a non-transparent background without JS', async ({ page }) => {
    await page.goto('./')
    const bg = await page.locator('.nav').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('anchor navigation lands below the fixed nav without JS', async ({ page }) => {
    await page.goto('./#menu')
    // no-JS pages keep html{scroll-behavior:smooth} — poll until the scroll settles
    await expect
      .poll(() => page.evaluate(() => document.getElementById('menu')!.getBoundingClientRect().top))
      .toBeLessThanOrEqual(120)
    const top = await page.evaluate(() => document.getElementById('menu')!.getBoundingClientRect().top)
    expect(top).toBeGreaterThanOrEqual(72)
  })
})
