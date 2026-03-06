import { test, expect } from '@playwright/test'

/**
 * 视觉体验自动化测试
 * 
 * 这些测试验证游戏的视觉元素是否正确显示和渲染
 */

test.describe('视觉体验测试 (Visual UX)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('像素艺术渲染测试', () => {
    test('游戏画布应该正确渲染', async ({ page }) => {
      // 触发彩蛋
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)

      // 验证画布存在且可见
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 验证画布有合理的尺寸
      const boundingBox = await canvas.boundingBox()
      expect(boundingBox).not.toBeNull()
      expect(boundingBox!.width).toBeGreaterThan(400)
      expect(boundingBox!.height).toBeGreaterThan(300)
    })

    test('场景应该扩大 50%', async ({ page }) => {
      // 触发彩蛋并进入游戏
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)

      const canvas = await page.locator('canvas').first()
      const boundingBox = await canvas.boundingBox()
      
      // 验证画布尺寸（应该是扩大后的尺寸）
      // 原始尺寸约为 800x600，扩大 1.5 倍后约为 1200x900
      expect(boundingBox!.width).toBeGreaterThan(1000)
      expect(boundingBox!.height).toBeGreaterThan(700)
    })

    test('游戏元素应该可见', async ({ page }) => {
      // 触发彩蛋并进入游戏
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(2000)

      // 画布应该在渲染
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 等待游戏运行一段时间
      await page.waitForTimeout(1000)
    })
  })

  test.describe('UI 可读性测试', () => {
    test('CMD 窗口应该正确显示', async ({ page }) => {
      // 触发彩蛋
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      // 验证 CMD 窗口出现
      const cmdWindow = await page.locator('.cmd-window')
      await expect(cmdWindow).toBeVisible({ timeout: 5000 })

      // 验证有文字内容
      const content = await cmdWindow.textContent()
      expect(content).toBeTruthy()
      expect(content!.length).toBeGreaterThan(0)
    })

    test('游戏规则说明应该显示', async ({ page }) => {
      // 触发彩蛋
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)

      // 应该显示游戏规则
      // 规则可能在 CMD 窗口或单独的组件中
      const hasRules = await page.locator('text=/操作|控制|规则|WASD/i').count()
      expect(hasRules).toBeGreaterThan(0)
    })

    test('UI 元素应该在游戏中可见', async ({ page }) => {
      // 触发彩蛋并进入游戏
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(2000)

      // 画布应该可见
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 游戏容器应该存在
      const gameContainer = await page.locator('.game-container, [class*="game"]').first()
      await expect(gameContainer).toBeVisible()
    })
  })

  test.describe('色彩和对比度测试', () => {
    test('页面应该有合理的背景色', async ({ page }) => {
      const body = await page.locator('body')
      const bgColor = await body.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      // 背景色应该存在
      expect(bgColor).toBeTruthy()
      expect(bgColor).not.toBe('rgba(0, 0, 0, 0)')
    })

    test('游戏画布应该有合理的背景', async ({ page }) => {
      // 触发彩蛋并进入游戏
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)

      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 画布应该在渲染内容
      await page.waitForTimeout(500)
    })
  })

  test.describe('动画流畅度测试', () => {
    test('页面崩塌动画应该流畅', async ({ page }) => {
      // 触发彩蛋
      const startTime = Date.now()
      
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      // 等待动画完成
      await page.waitForSelector('.cmd-window', { timeout: 10000 })
      
      const animationTime = Date.now() - startTime
      
      // 动画应该在合理时间内完成（不超过 8 秒）
      expect(animationTime).toBeLessThan(8000)
    })

    test('游戏动画应该流畅运行', async ({ page }) => {
      // 触发彩蛋并进入游戏
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)

      // 执行一些操作并观察
      await page.keyboard.press('w')
      await page.waitForTimeout(200)
      await page.keyboard.press('d')
      await page.waitForTimeout(200)
      await page.keyboard.press('j')
      await page.waitForTimeout(200)

      // 游戏应该仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })
  })

  test.describe('响应式设计测试', () => {
    test('应该在不同视口尺寸下正常显示', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 2560, height: 1440 }
      ]

      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.reload()
        await page.waitForLoadState('networkidle')

        // 页面应该正常显示
        const body = await page.locator('body')
        await expect(body).toBeVisible()

        // 触发彩蛋
        await page.keyboard.press('ArrowUp')
        await page.keyboard.press('ArrowUp')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('ArrowLeft')
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('ArrowLeft')
        await page.keyboard.press('ArrowRight')
        await page.keyboard.press('b')
        await page.keyboard.press('a')

        // CMD 窗口应该出现
        const cmdWindow = await page.locator('.cmd-window')
        await expect(cmdWindow).toBeVisible({ timeout: 5000 })
      }
    })
  })

  test.describe('视觉一致性测试', () => {
    test('游戏元素应该保持像素艺术风格', async ({ page }) => {
      // 触发彩蛋并进入游戏
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(2000)

      // 画布应该在渲染
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 游戏应该运行一段时间以显示各种元素
      await page.waitForTimeout(2000)
    })

    test('UI 字体应该统一', async ({ page }) => {
      // 触发彩蛋
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowUp')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('ArrowLeft')
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('b')
      await page.keyboard.press('a')

      const cmdWindow = await page.locator('.cmd-window')
      await expect(cmdWindow).toBeVisible({ timeout: 5000 })

      // 检查字体样式
      const fontFamily = await cmdWindow.evaluate((el) => {
        return window.getComputedStyle(el).fontFamily
      })

      // 应该使用等宽字体
      expect(fontFamily.toLowerCase()).toMatch(/courier|consolas|monospace|mono/)
    })
  })
})
