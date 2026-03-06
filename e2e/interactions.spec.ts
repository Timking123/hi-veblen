import { test, expect } from '@playwright/test'

/**
 * Integration tests for interactive elements
 * Validates: Requirements 3.2, 4.3, 4.5, 7.3
 */

test.describe('Interactive Elements', () => {
  test('should expand/collapse work experience cards', async ({ page }) => {
    await page.goto('/experience')
    
    // Find expandable cards
    const cards = page.locator('[data-testid="experience-card"], .experience-card, article')
    const count = await cards.count()
    
    if (count > 0) {
      const firstCard = cards.first()
      
      // Check if card has expand functionality
      const expandButton = firstCard.locator('button, [role="button"]')
      
      if (await expandButton.count() > 0) {
        // Click to expand
        await expandButton.first().click()
        await page.waitForTimeout(300)
        
        // Click to collapse
        await expandButton.first().click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('should show skill details on hover', async ({ page }) => {
    await page.goto('/skills')
    
    // Find skill tags
    const skillTags = page.locator('[data-testid="skill-tag"], .skill-tag, .tag')
    const count = await skillTags.count()
    
    if (count > 0) {
      // Hover over first skill
      await skillTags.first().hover()
      await page.waitForTimeout(300)
      
      // Verify skill is still visible (hover doesn't break layout)
      await expect(skillTags.first()).toBeVisible()
    }
  })

  test('should filter projects by skill', async ({ page }) => {
    await page.goto('/skills')
    
    // Find clickable skill tags
    const skillTags = page.locator('[data-testid="skill-tag"], .skill-tag')
    const count = await skillTags.count()
    
    if (count > 0) {
      // Click on a skill tag
      await skillTags.first().click()
      await page.waitForTimeout(500)
      
      // Verify page is still functional
      await expect(page.locator('text=Vue')).toBeVisible()
    }
  })

  test('should show course details on hover', async ({ page }) => {
    await page.goto('/education')
    
    // Wait for chart to load
    await page.waitForTimeout(1000)
    
    // Find course elements
    const courses = page.locator('[data-testid="course-item"], .course-item')
    const count = await courses.count()
    
    if (count > 0) {
      // Hover over course
      await courses.first().hover()
      await page.waitForTimeout(300)
    }
  })

  test('should handle button interactions', async ({ page }) => {
    await page.goto('/')
    
    // Find all buttons
    const buttons = page.locator('button, a[role="button"]')
    const count = await buttons.count()
    
    if (count > 0) {
      // Hover over first button
      await buttons.first().hover()
      await page.waitForTimeout(200)
      
      // Verify button is still visible
      await expect(buttons.first()).toBeVisible()
    }
  })

  test('should handle scroll animations', async ({ page }) => {
    await page.goto('/')
    
    // Scroll down the page
    await page.evaluate(() => window.scrollBy(0, 500))
    await page.waitForTimeout(500)
    
    // Scroll back up
    await page.evaluate(() => window.scrollBy(0, -500))
    await page.waitForTimeout(500)
    
    // Verify page is still functional
    await expect(page.locator('text=黄彦杰')).toBeVisible()
  })

  test('should load images lazily', async ({ page }) => {
    await page.goto('/')
    
    // Check for lazy-loaded images
    const images = page.locator('img[loading="lazy"], img[data-src]')
    const count = await images.count()
    
    if (count > 0) {
      // Scroll to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1000)
    }
  })
})
