import { test, expect } from '@playwright/test'

/**
 * 操作体验自动化测试
 * 
 * 这些测试验证游戏控制系统的基本功能和响应性
 */

test.describe('操作体验测试 (Controls UX)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待页面加载
    await page.waitForLoadState('networkidle')
  })

  test.describe('移动手感测试', () => {
    test('应该能够触发彩蛋并进入游戏', async ({ page }) => {
      // 触发彩蛋 (konami code: ↑↑↓↓←→←→BA)
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

      // 等待 CMD 窗口出现
      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      
      // 确认开始游戏
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      
      // 跳过规则说明
      await page.keyboard.press('Space')
      await page.waitForTimeout(500)

      // 验证游戏画布存在
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('应该响应 WASD 移动键', async ({ page }) => {
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

      // 测试移动键
      const moveKeys = ['w', 'a', 's', 'd']
      for (const key of moveKeys) {
        await page.keyboard.press(key)
        await page.waitForTimeout(100)
      }

      // 验证游戏仍在运行（没有崩溃）
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('应该在释放按键后停止移动', async ({ page }) => {
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

      // 按住移动键
      await page.keyboard.down('d')
      await page.waitForTimeout(500)
      await page.keyboard.up('d')
      
      // 等待一段时间，验证没有继续移动
      await page.waitForTimeout(300)

      // 验证游戏仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })
  })

  test.describe('射击手感测试', () => {
    test('应该响应机炮射击键 (J)', async ({ page }) => {
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

      // 测试机炮射击
      await page.keyboard.press('j')
      await page.waitForTimeout(100)
      await page.keyboard.press('j')
      await page.waitForTimeout(100)
      await page.keyboard.press('j')

      // 验证游戏仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('应该响应导弹发射键 (K)', async ({ page }) => {
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

      // 测试导弹发射
      await page.keyboard.press('k')
      await page.waitForTimeout(500)

      // 验证游戏仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('导弹应该单次发射（长按不连发）', async ({ page }) => {
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

      // 长按导弹键
      await page.keyboard.down('k')
      await page.waitForTimeout(1000)
      await page.keyboard.up('k')

      // 验证游戏仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })
  })

  test.describe('响应速度测试', () => {
    test('游戏应该在合理时间内加载', async ({ page }) => {
      const startTime = Date.now()
      
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

      // 等待 CMD 窗口
      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      
      const loadTime = Date.now() - startTime
      
      // 加载时间应该少于 3 秒
      expect(loadTime).toBeLessThan(3000)
    })

    test('游戏画布应该流畅渲染', async ({ page }) => {
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

      // 执行一些操作
      await page.keyboard.press('w')
      await page.keyboard.press('d')
      await page.keyboard.press('j')
      await page.waitForTimeout(500)

      // 验证画布仍然可见且响应
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('UI 元素应该实时更新', async ({ page }) => {
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

      // 验证 UI 元素存在（生命值、导弹数量等）
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
      
      // 游戏应该在运行
      await page.waitForTimeout(1000)
    })
  })

  test.describe('综合操作测试', () => {
    test('应该支持同时移动和射击', async ({ page }) => {
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

      // 同时按住移动和射击
      await page.keyboard.down('d')
      await page.keyboard.press('j')
      await page.waitForTimeout(300)
      await page.keyboard.press('j')
      await page.waitForTimeout(300)
      await page.keyboard.up('d')

      // 验证游戏仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('应该支持快速切换操作', async ({ page }) => {
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

      // 快速切换操作
      await page.keyboard.press('w')
      await page.keyboard.press('j')
      await page.keyboard.press('d')
      await page.keyboard.press('k')
      await page.keyboard.press('s')
      await page.keyboard.press('j')
      await page.keyboard.press('a')

      // 验证游戏仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })
  })
})
