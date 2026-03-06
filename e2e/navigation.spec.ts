import { test, expect } from '@playwright/test'

/**
 * Integration tests for navigation flow
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5, 8.4
 */

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display navigation menu on all pages', async ({ page }) => {
    // Verify navigation is visible on home page
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Navigate to different pages and verify nav is still visible
    const pages = ['/about', '/education', '/experience', '/skills', '/contact']
    
    for (const path of pages) {
      await page.goto(path)
      await expect(nav).toBeVisible()
    }
  })

  test('should navigate between pages using menu', async ({ page }) => {
    // Click on About link
    await page.click('text=关于我')
    await expect(page).toHaveURL(/.*about/)
    
    // Click on Education link
    await page.click('text=教育经历')
    await expect(page).toHaveURL(/.*education/)
    
    // Click on Experience link
    await page.click('text=工作经历')
    await expect(page).toHaveURL(/.*experience/)
    
    // Click on Skills link
    await page.click('text=技能展示')
    await expect(page).toHaveURL(/.*skills/)
    
    // Click on Contact link
    await page.click('text=联系方式')
    await expect(page).toHaveURL(/.*contact/)
  })

  test('should highlight active menu item', async ({ page }) => {
    // Navigate to About page
    await page.goto('/about')
    
    // Check if About menu item has active class
    const aboutLink = page.locator('nav a[href="/about"]')
    await expect(aboutLink).toHaveClass(/active|router-link-active/)
  })

  test('should handle browser back and forward buttons', async ({ page }) => {
    // Navigate through pages
    await page.goto('/')
    await page.goto('/about')
    await page.goto('/education')
    
    // Go back
    await page.goBack()
    await expect(page).toHaveURL(/.*about/)
    
    // Go back again
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    
    // Go forward
    await page.goForward()
    await expect(page).toHaveURL(/.*about/)
  })

  test('should show 404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route')
    await expect(page.locator('text=404')).toBeVisible()
  })
})
