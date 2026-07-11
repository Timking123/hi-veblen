import { defineConfig, devices } from '@playwright/test'

process.env.NO_PROXY = ['127.0.0.1', 'localhost', process.env.NO_PROXY].filter(Boolean).join(',')

/**
 * Playwright configuration for end-to-end testing
 * Tests cross-browser compatibility and user flows
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Uncomment to use system Chrome if Playwright browsers fail to install
        // channel: 'chrome',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Uncomment to use system Firefox if Playwright browsers fail to install
        // channel: 'firefox',
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Note: WebKit is not available as system browser on Windows
      },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        // Uncomment to use system Chrome if Playwright browsers fail to install
        // channel: 'chrome',
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        // Note: Mobile Safari requires WebKit which is not available on Windows
      },
    },
  ],

  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    env: {
      VITE_LINGXI_URL: 'https://lingxi.hi-veblen.com/',
    },
    reuseExistingServer: false,
    timeout: 120000,
  },
})
