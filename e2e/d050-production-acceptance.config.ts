import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'd050-production-acceptance.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 8 * 60 * 1000,
  reporter: [['line']],
  use: {
    browserName: 'chromium',
    headless: true,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    ignoreHTTPSErrors: false,
  },
})
