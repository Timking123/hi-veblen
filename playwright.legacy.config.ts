import { defineConfig, devices } from '@playwright/test'

// 此配置只运行本地应用与组件验收，不连接后端或真实服务。
process.env.NO_PROXY = ['127.0.0.1', 'localhost', process.env.NO_PROXY].filter(Boolean).join(',')
const channel = process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || undefined

export default defineConfig({
  testDir: './e2e',
  testMatch: ['legacy-quality.spec.ts', 'art-museum-experience.spec.ts'],
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    {
      name: 'mobile',
      testMatch: 'legacy-quality.spec.ts',
      use: { ...devices['Pixel 5'], channel },
    },
  ],
  webServer: [
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4178 --strictPort',
      url: 'http://127.0.0.1:4178',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4187 --strictPort',
      url: 'http://127.0.0.1:4187',
      reuseExistingServer: false,
    },
  ],
})
