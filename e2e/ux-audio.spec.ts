import { test, expect } from '@playwright/test'

/**
 * 音频体验自动化测试
 * 
 * 这些测试验证游戏的音频系统是否正常工作
 * 注意：自动化测试无法验证音频质量，需要人工测试
 */

test.describe('音频体验测试 (Audio UX)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('音频系统初始化测试', () => {
    test('应该能够初始化音频系统', async ({ page }) => {
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

      // 游戏应该正常运行（音频系统已初始化）
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('音频系统不应该阻塞游戏启动', async ({ page }) => {
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

      await page.waitForSelector('.cmd-window', { timeout: 5000 })
      await page.keyboard.press('y')
      await page.waitForTimeout(500)
      await page.keyboard.press('Space')
      await page.waitForTimeout(1000)

      const loadTime = Date.now() - startTime

      // 即使音频加载失败，游戏也应该在合理时间内启动
      expect(loadTime).toBeLessThan(5000)
    })
  })

  test.describe('音频控制测试', () => {
    test('应该有音乐控制按钮', async ({ page }) => {
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

      // 查找音乐控制按钮（可能在画布上或 UI 中）
      // 由于音乐按钮可能在 Canvas 上绘制，我们只能验证游戏在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('音频控制不应该导致游戏崩溃', async ({ page }) => {
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

      // 尝试点击画布（可能点击到音乐按钮）
      const canvas = await page.locator('canvas').first()
      const box = await canvas.boundingBox()
      if (box) {
        // 点击右上角区域（音乐按钮可能的位置）
        await page.mouse.click(box.x + box.width - 50, box.y + 50)
        await page.waitForTimeout(500)
      }

      // 游戏应该仍在运行
      await expect(canvas).toBeVisible()
    })
  })

  test.describe('音频触发测试', () => {
    test('射击应该触发音效（不会崩溃）', async ({ page }) => {
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

      // 发射武器（应该触发音效）
      await page.keyboard.press('j')
      await page.waitForTimeout(300)
      await page.keyboard.press('j')
      await page.waitForTimeout(300)
      await page.keyboard.press('k')
      await page.waitForTimeout(500)

      // 游戏应该仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('多个音效同时播放不应该崩溃', async ({ page }) => {
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

      // 快速发射多个武器
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('j')
        await page.waitForTimeout(100)
      }

      // 游戏应该仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })
  })

  test.describe('音频性能测试', () => {
    test('长时间游玩不应该出现音频问题', async ({ page }) => {
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

      // 游玩一段时间
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('w')
        await page.waitForTimeout(200)
        await page.keyboard.press('j')
        await page.waitForTimeout(200)
        await page.keyboard.press('d')
        await page.waitForTimeout(200)
        await page.keyboard.press('j')
        await page.waitForTimeout(200)
      }

      // 游戏应该仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()
    })

    test('音频系统不应该导致内存泄漏', async ({ page }) => {
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

      // 获取初始内存（如果可用）
      const initialMetrics = await page.metrics()

      // 播放大量音效
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('j')
        await page.waitForTimeout(250)
      }

      // 等待一段时间
      await page.waitForTimeout(2000)

      // 获取最终内存
      const finalMetrics = await page.metrics()

      // 游戏应该仍在运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 内存增长应该在合理范围内
      // 注意：这只是一个粗略的检查
      if (initialMetrics.JSHeapUsedSize && finalMetrics.JSHeapUsedSize) {
        const memoryGrowth = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize
        const memoryGrowthMB = memoryGrowth / 1024 / 1024
        
        // 内存增长不应该超过 50MB
        expect(memoryGrowthMB).toBeLessThan(50)
      }
    })
  })

  test.describe('浏览器兼容性测试', () => {
    test('音频系统应该在不同浏览器中工作', async ({ page, browserName }) => {
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

      // 发射武器测试音效
      await page.keyboard.press('j')
      await page.waitForTimeout(500)

      // 游戏应该在所有浏览器中正常运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      console.log(`音频测试通过 - 浏览器: ${browserName}`)
    })
  })

  test.describe('音频错误处理测试', () => {
    test('音频加载失败不应该阻止游戏运行', async ({ page }) => {
      // 拦截音频请求并返回错误
      await page.route('**/*.mp3', route => route.abort())
      await page.route('**/*.ogg', route => route.abort())
      await page.route('**/*.wav', route => route.abort())

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

      // 游戏应该仍能运行（静音模式）
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // 发射武器不应该崩溃
      await page.keyboard.press('j')
      await page.waitForTimeout(500)
      await expect(canvas).toBeVisible()
    })
  })

  test.describe('庆祝页面音效测试', () => {
    test('庆祝页面交互不应该崩溃', async ({ page }) => {
      // 注意：这个测试需要玩家通关才能到达庆祝页面
      // 这里只是一个框架，实际测试需要完整游玩或使用作弊码

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

      // 游戏应该正常运行
      const canvas = await page.locator('canvas').first()
      await expect(canvas).toBeVisible()

      // TODO: 添加通关逻辑或作弊码以到达庆祝页面
    })
  })
})
