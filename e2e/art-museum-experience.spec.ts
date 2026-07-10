import { test, expect } from '@playwright/test'

test.describe('Personal digital art museum experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders the museum entrance and Lingxi link', async ({ page }) => {
    await expect(page.getByText('PERSONAL DIGITAL ART MUSEUM')).toBeVisible()
    await expect(page.getByText('ENTER GALLERY')).toBeVisible()
    await expect(page.getByRole('link', { name: 'ENTER LINGXI' })).toHaveAttribute(
      'href',
      'https://lingxi.hi-veblen.com/',
    )
    await expect(page.getByTestId('shader-background')).toBeAttached()
    await expect(page.getByTestId('route-distortion-canvas')).toBeAttached()
  })

  test('navigates through gallery and legacy OS as art experiences', async ({ page }) => {
    await page.getByText('ENTER GALLERY').click()
    await expect(page).toHaveURL(/.*gallery/)
    await expect(page.getByText('视觉记忆舱')).toBeVisible()

    await page.goto('/os')
    await expect(page.getByText('LEGACY_OS 9.7')).toBeVisible()
    await expect(page.getByText('Game.exe')).toBeVisible()
  })

  test('opens Game.exe protocol from Legacy OS', async ({ page }) => {
    await page.goto('/os')
    await page.getByText('Game.exe').dblclick()
    await expect(page.getByText('LAUNCH GAME PROTOCOL')).toBeVisible()
    await page.getByText('LAUNCH GAME PROTOCOL').click()
    await expect(page.getByText('游戏规则说明')).toBeVisible({ timeout: 5000 })
  })
})
