import { defineConfig, devices } from '@playwright/test'

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
    baseURL: 'http://localhost:5173',
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
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
