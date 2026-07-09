import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/tamatcha/',
    viewport: { width: 1280, height: 800 },
    // software WebGL so tier A/B run in headless CI
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/tamatcha/',
    reuseExistingServer: !process.env.CI,
  },
})
