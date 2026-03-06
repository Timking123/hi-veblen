import { test, expect } from '@playwright/test'

/**
 * Integration tests for complete user browsing flow
 * Validates: Requirements 1.1, 1.2, 1.5, 2.1, 3.1, 4.1, 5.1
 */

test.describe('Complete User Browsing Flow', () => {
  test('should complete full browsing journey', async ({ page }) => {
    // Step 1: Land on home page
    await page.goto('/')
    await expect(page).toHaveTitle(/黄彦杰/)
    
    // Verify home page content
    await expect(page.locator('text=黄彦杰')).toBeVisible()
    await expect(page.locator('text=前端开发工程师')).toBeVisible()
    
    // Step 2: Navigate to About page
    await page.click('text=关于我')
    await expect(page).toHaveURL(/.*about/)
    await expect(page.locator('text=个人简介')).toBeVisible()
    
    // Step 3: View Education
    await page.click('text=教育经历')
    await expect(page).toHaveURL(/.*education/)
    await expect(page.locator('text=湖南大学')).toBeVisible()
    
    // Step 4: Check Work Experience
    await page.click('text=工作经历')
    await expect(page).toHaveURL(/.*experience/)
    
    // Step 5: View Skills
    await page.click('text=技能展示')
    await expect(page).toHaveURL(/.*skills/)
    await expect(page.locator('text=Vue')).toBeVisible()
    
    // Step 6: Go to Contact page
    await page.click('text=联系方式')
    await expect(page).toHaveURL(/.*contact/)
    await expect(page.locator('text=14775378984')).toBeVisible()
  })

  test('should display all required content on home page', async ({ page }) => {
    await page.goto('/')
    
    // Check for name
    await expect(page.locator('text=黄彦杰')).toBeVisible()
    
    // Check for job title
    await expect(page.locator('text=前端开发工程师')).toBeVisible()
    
    // Check for CTA buttons
    const buttons = page.locator('button, a[role="button"]')
    await expect(buttons).toHaveCount(await buttons.count())
  })

  test('should display education information', async ({ page }) => {
    await page.goto('/education')
    
    // Check for school name
    await expect(page.locator('text=湖南大学')).toBeVisible()
    
    // Check for major
    await expect(page.locator('text=软件工程')).toBeVisible()
  })

  test('should display work experience', async ({ page }) => {
    await page.goto('/experience')
    
    // Verify experience content is loaded
    const experienceCards = page.locator('[data-testid="experience-card"], .experience-card, article')
    const count = await experienceCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display skills by category', async ({ page }) => {
    await page.goto('/skills')
    
    // Check for skill categories
    await expect(page.locator('text=Vue')).toBeVisible()
    
    // Verify skills are displayed
    const skillTags = page.locator('[data-testid="skill-tag"], .skill-tag')
    const count = await skillTags.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should display contact information', async ({ page }) => {
    await page.goto('/contact')
    
    // Check for phone number
    await expect(page.locator('text=14775378984')).toBeVisible()
    
    // Check for email
    await expect(page.locator('text=1243222867@QQ.com')).toBeVisible()
  })
})
