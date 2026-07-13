import { test, expect } from '@playwright/test'

test.describe('drink showcase (JS, desktop)', () => {
  test('enhances the lineup and starts on Matcha Fizz', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__title')).toHaveText('Matcha Fizz')
    await expect(page.locator('.showcase__formula')).toHaveText('( matcha, soda, pyré dle výběru )')
    await expect(page.locator('.lineup__item.is-active figcaption')).toHaveText('Matcha Fizz')
  })

  test('scrubbing through the pin changes the active drink', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    const sectionTop = await page
      .locator('.lineup')
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    // pin lasts 3 viewport heights (end: '+=300%'); 2.9vh ≈ segment 5
    await page.evaluate((t) => window.scrollTo(0, t + 0.97 * 3 * window.innerHeight), sectionTop)
    await expect(page.locator('.showcase__title')).toHaveText('Iced Yerba Maté')
    await expect(page.locator('.lineup__item.is-active figcaption')).toHaveText('Iced Yerba Maté')
    // middle of the pin ≈ third drink
    await page.evaluate((t) => window.scrollTo(0, t + 0.5 * 3 * window.innerHeight), sectionTop)
    await expect(page.locator('.showcase__title')).toHaveText('Hot Matcha Latté')
  })

  test('turntable manifest upgrades the active drink to canvas scrub', async ({ page }) => {
    await page.route('**/brand/turntable/fizz/manifest.json', (route) =>
      route.fulfill({ json: { frames: 4, width: 480, height: 720 } }),
    )
    await page.route('**/brand/turntable/fizz/frame-*.webp', (route) =>
      route.fulfill({ path: 'public/brand/drinks/fizz-480.webp', contentType: 'image/webp' }),
    )
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    // fizz is the first (active) drink — once its manifest loads, canvas replaces the img
    await expect(page.locator('.showcase__canvas')).toBeVisible()
    await expect(page.locator('.showcase__img')).toBeHidden()
    // drinks without a manifest keep the static image
    const sectionTop = await page
      .locator('.lineup')
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY)
    await page.evaluate((y) => window.scrollTo(0, y), sectionTop + 0.5 * 3 * 800)
    await expect(page.locator('.showcase__title')).toHaveText('Hot Matcha Latté')
    await expect(page.locator('.showcase__canvas')).toBeHidden()
    await expect(page.locator('.showcase__img')).toBeVisible()
  })

  test('thumbnails are keyboard-activatable buttons that jump to the drink', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup')).toHaveClass(/showcase-on/)
    const third = page.locator('.lineup__item').nth(2)
    await expect(third).toHaveAttribute('role', 'button')
    await third.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.showcase__title')).toHaveText('Hot Matcha Latté')
  })

  test('reduced motion: no pin, no stage, static strip', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('./')
    await expect(page.locator('.lineup')).not.toHaveClass(/showcase-on/)
    await expect(page.locator('.showcase__stage')).toHaveCount(0)
    await expect(page.locator('.lineup__item')).toHaveCount(5)
  })
})

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('static five-figure strip, no stage', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.lineup__item')).toHaveCount(5)
    await expect(page.locator('.showcase__stage')).toHaveCount(0)
    await expect(page.locator('.lineup__item').first()).toBeVisible()
  })
})
