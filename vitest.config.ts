import { defineConfig } from 'vitest/config'

// Unit tests live in src/ only. Without this, Vitest's default glob also
// matches the Playwright specs in e2e/ (which import @playwright/test and
// fail under Vitest). passWithNoTests keeps `npm test` green before the
// first unit test lands (Task 5).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
