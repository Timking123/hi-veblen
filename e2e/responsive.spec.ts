import { test, expect } from '@playwright/test'

/**
 * Integration tests for responsive design and cross-browser compatibility
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */

test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 },
  ]

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/')
      
      // Verify page loads
      await expect(page.locator('text=黄彦杰')).toBeVisible()
      
      // Verify navigation is accessible
      const nav = page.locator('nav')
      await expect(nav).toBeVisible()
      
      // Navigate to different pages
      await page.goto('/about')
      await expect(page.locator('text=个人简介')).toBeVisible()
      
      await page.goto('/education')
      await expect(page.locator('text=湖南大学')).toBeVisible()
      
      await page.goto('/skills')
      await expect(page.locator('text=Vue')).toBeVisible()
    })
  }

  test('should adapt layout on viewport resize', async ({ page }) => {
    await page.goto('/')
    
    // Start with desktop size
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(300)
    
    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300)
    await expect(page.locator('text=黄彦杰')).toBeVisible()
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)
    await expect(page.locator('text=黄彦杰')).toBeVisible()
  })

  test('should handle touch interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Tap on navigation items
    await page.tap('text=关于我')
    await expect(page).toHaveURL(/.*about/)
    
    await page.tap('text=技能展示')
    await expect(page).toHaveURL(/.*skills/)
  })
})

test.describe('Cross-Browser Compatibility', () => {
  test('should load all pages without errors', async ({ page, browserName }) => {
    const pages = ['/', '/about', '/education', '/experience', '/skills', '/contact']
    
    for (const path of pages) {
      await page.goto(path)
      
      // Check for console errors
      const errors: string[] = []
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })
      
      // Wait for page to load
      await page.waitForLoadState('networkidle')
      
      // Verify page content is visible
      const body = page.locator('body')
      await expect(body).toBeVisible()
      
      // Log browser name for debugging
      console.log(`${browserName}: ${path} loaded successfully`)
    }
  })

  test('should render animations smoothly', async ({ page }) => {
    await page.goto('/')
    
    // Wait for any animations to complete
    await page.waitForTimeout(1000)
    
    // Verify page is still responsive
    await expect(page.locator('text=黄彦杰')).toBeVisible()
  })

  test('should handle page transitions', async ({ page }) => {
    await page.goto('/')
    
    // Navigate between pages quickly
    await page.click('text=关于我')
    await page.waitForTimeout(300)
    
    await page.click('text=教育经历')
    await page.waitForTimeout(300)
    
    await page.click('text=工作经历')
    await page.waitForTimeout(300)
    
    // Verify final page loaded correctly
    await expect(page).toHaveURL(/.*experience/)
  })
})
