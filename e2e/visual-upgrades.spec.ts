import { test, expect } from '@playwright/test'

test.describe('Visual upgrade layer', () => {
  test('shows museum map, telemetry and settings theme controls', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('MUSEUM MAP')).toBeVisible()
    await expect(page.getByText(/ROOM HOME/i)).toBeVisible()
    await page.getByText('SETTINGS').click()
    await expect(page.getByText('展厅主题')).toBeVisible()
  })

  test('opens cinematic gallery lightbox', async ({ page }) => {
    await page.goto('/gallery')
    await page.getByText('全画幅摄影').dblclick()
    await expect(page.getByText('CINEMATIC LIGHTBOX')).toBeVisible()
    await page.getByText('×').click()
    await expect(page.getByText('CINEMATIC LIGHTBOX')).not.toBeVisible()
  })
})
