import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173/tamatcha/',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/tamatcha/',
    reuseExistingServer: !process.env.CI,
  },
})
