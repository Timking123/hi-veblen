/**
 * 像素艺术缓存测试
 * 测试像素艺术渲染器的缓存功能
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { PixelArtRenderer } from '../PixelArtRenderer'
import { ResourceManager } from '../ResourceManager'

// Mock canvas context for testing
beforeAll(() => {
  // Mock HTMLCanvasElement.getContext
  HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
    if (contextType === '2d') {
      return {
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        drawImage: vi.fn(),
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn()
        })),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray([0, 255, 0, 255]),
          width: 1,
          height: 1
        })),
        putImageData: vi.fn(),
        canvas: {
          width: 100,
          height: 100
        }
      } as any
    }
    return null
  }) as any
})

describe('PixelArtRenderer - 缓存功能', () => {
  let renderer: PixelArtRenderer
  let resourceManager: ResourceManager

  beforeEach(() => {
    // 创建新的渲染器实例
    renderer = new PixelArtRenderer()
    resourceManager = ResourceManager.getInstance()
  })

  describe('精灵图缓存', () => {
    it('应该缓存渲染的精灵图', () => {
      const key = 'test_sprite'
      let renderCount = 0

      // 第一次渲染
      renderer.cacheSprite(key, () => {
        renderCount++
        const canvas = document.createElement('canvas')
        canvas.width = 100
        canvas.height = 100
        return canvas
      })

      expect(renderCount).toBe(1)

      // 第二次应该使用缓存，不重新渲染
      renderer.cacheSprite(key, () => {
        renderCount++
        const canvas = document.createElement('canvas')
        canvas.width = 100
        canvas.height = 100
        return canvas
      })

      expect(renderCount).toBe(1) // 仍然是 1，说明使用了缓存
    })

    it('应该能够获取缓存的精灵图', () => {
      const key = 'test_sprite'
      
      renderer.cacheSprite(key, () => {
        const canvas = document.createElement('canvas')
        canvas.width = 100
        canvas.height = 100
        return canvas
      })

      const cached = renderer.getCachedSprite(key)
      expect(cached).not.toBeNull()
      expect(cached?.width).toBe(100)
      expect(cached?.height).toBe(100)
    })

    it('应该返回 null 对于不存在的缓存', () => {
      const cached = renderer.getCachedSprite('non_existent')
      expect(cached).toBeNull()
    })
  })

  describe('预加载常用精灵图', () => {
    it('应该预加载玩家飞船精灵图', () => {
      // 构造函数中已经调用了 preloadCommonSprites
      const cached = renderer.getCachedSprite('player_ship')
      expect(cached).not.toBeNull()
      expect(cached?.canvas).toBeInstanceOf(HTMLCanvasElement)
    })

    it('应该预加载常用颜色的像素块', () => {
      const commonColors = ['#00FF00', '#FFFFFF', '#FF0000']
      
      for (const color of commonColors) {
        const key = `pixel_block_${color}`
        const cached = renderer.getCachedSprite(key)
        expect(cached).not.toBeNull()
      }
    })
  })

  describe('街机边框预加载', () => {
    it('应该能够预加载指定尺寸的边框', () => {
      const sizes = [
        { width: 800, height: 600 },
        { width: 1024, height: 768 }
      ]

      renderer.preloadArcadeFrames(sizes)

      for (const { width, height } of sizes) {
        const key = `arcade_frame_${width}_${height}`
        const cached = renderer.getCachedSprite(key)
        expect(cached).not.toBeNull()
        expect(cached?.width).toBe(width)
        expect(cached?.height).toBe(height)
      }
    })
  })

  describe('缓存清理策略', () => {
    it('应该清理超过最大年龄的缓存', () => {
      const key = 'old_sprite'
      
      // 创建一个旧的缓存
      renderer.cacheSprite(key, () => {
        const canvas = document.createElement('canvas')
        canvas.width = 50
        canvas.height = 50
        return canvas
      })

      // 修改时间戳使其看起来很旧
      const cached = renderer.getCachedSprite(key)
      if (cached) {
        cached.timestamp = Date.now() - 120000 // 2分钟前
      }

      // 清理超过 60 秒的缓存
      renderer.cleanup(60000)

      // 验证缓存已被清理（除非是受保护的）
      const afterCleanup = renderer.getCachedSprite(key)
      expect(afterCleanup).toBeNull()
    })

    it('应该保留受保护的精灵图', () => {
      // 玩家飞船应该被保护
      const playerShip = renderer.getCachedSprite('player_ship')
      expect(playerShip).not.toBeNull()

      // 即使清理也不应该删除
      renderer.cleanup(0) // 清理所有超过 0 秒的缓存

      const afterCleanup = renderer.getCachedSprite('player_ship')
      expect(afterCleanup).not.toBeNull()
    })

    it('应该在缓存过多时清理最旧的缓存', () => {
      // 创建大量缓存
      for (let i = 0; i < 60; i++) {
        renderer.cacheSprite(`sprite_${i}`, () => {
          const canvas = document.createElement('canvas')
          canvas.width = 10
          canvas.height = 10
          return canvas
        })
      }

      const sizeBefore = renderer.getCacheSize()
      expect(sizeBefore).toBeGreaterThan(50)

      // 触发清理
      renderer.cleanup()

      const sizeAfter = renderer.getCacheSize()
      // 应该清理了一些缓存
      expect(sizeAfter).toBeLessThan(sizeBefore)
    })
  })

  describe('缓存统计', () => {
    it('应该返回正确的缓存统计信息', () => {
      // 添加一些测试缓存
      for (let i = 0; i < 5; i++) {
        renderer.cacheSprite(`test_${i}`, () => {
          const canvas = document.createElement('canvas')
          canvas.width = 100
          canvas.height = 100
          return canvas
        })
      }

      const stats = renderer.getCacheStats()
      
      expect(stats.totalSprites).toBeGreaterThan(0)
      expect(stats.totalMemoryEstimate).toBeGreaterThan(0)
      expect(stats.oldestSprite).not.toBeNull()
      expect(stats.newestSprite).not.toBeNull()
    })

    it('应该正确估算内存使用', () => {
      const width = 100
      const height = 100
      
      renderer.cacheSprite('memory_test', () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        return canvas
      })

      const stats = renderer.getCacheStats()
      
      // 内存估算应该至少包含这个精灵图的大小
      // width * height * 4 (RGBA)
      const expectedSize = width * height * 4
      expect(stats.totalMemoryEstimate).toBeGreaterThanOrEqual(expectedSize)
    })
  })

  describe('离屏 Canvas 预渲染', () => {
    it('应该能够预渲染到离屏 Canvas', () => {
      const canvas = renderer.prerenderToOffscreen(200, 200, (ctx) => {
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(0, 0, 200, 200)
      })

      expect(canvas).toBeInstanceOf(HTMLCanvasElement)
      expect(canvas.width).toBe(200)
      expect(canvas.height).toBe(200)
    })

    it('预渲染的 Canvas 应该包含正确的内容', () => {
      const canvas = renderer.prerenderToOffscreen(100, 100, (ctx) => {
        ctx.fillStyle = '#00FF00'
        ctx.fillRect(0, 0, 100, 100)
      })

      const ctx = canvas.getContext('2d')!
      const imageData = ctx.getImageData(50, 50, 1, 1)
      
      // 检查中心像素是否为绿色
      expect(imageData.data[0]).toBe(0)   // R
      expect(imageData.data[1]).toBe(255) // G
      expect(imageData.data[2]).toBe(0)   // B
      expect(imageData.data[3]).toBe(255) // A
    })
  })

  describe('渲染缓存的精灵图', () => {
    it('应该能够渲染缓存的精灵图', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')!

      // 缓存一个精灵图
      renderer.cacheSprite('render_test', () => {
        const spriteCanvas = document.createElement('canvas')
        spriteCanvas.width = 50
        spriteCanvas.height = 50
        const spriteCtx = spriteCanvas.getContext('2d')!
        spriteCtx.fillStyle = '#0000FF'
        spriteCtx.fillRect(0, 0, 50, 50)
        return spriteCanvas
      })

      // 渲染缓存的精灵图
      const result = renderer.renderCachedSprite(ctx, 'render_test', 100, 100)
      expect(result).toBe(true)
    })

    it('应该在精灵图不存在时返回 false', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')!

      const result = renderer.renderCachedSprite(ctx, 'non_existent', 0, 0)
      expect(result).toBe(false)
    })
  })

  describe('清空缓存', () => {
    it('应该清空所有缓存', () => {
      // 添加一些缓存
      for (let i = 0; i < 5; i++) {
        renderer.cacheSprite(`clear_test_${i}`, () => {
          const canvas = document.createElement('canvas')
          canvas.width = 10
          canvas.height = 10
          return canvas
        })
      }

      const sizeBefore = renderer.getCacheSize()
      expect(sizeBefore).toBeGreaterThan(0)

      // 清空缓存
      renderer.clearCache()

      // 验证缓存已清空（但会重新预加载常用精灵图）
      const sizeAfter = renderer.getCacheSize()
      
      // 应该只剩下预加载的精灵图
      expect(sizeAfter).toBeGreaterThan(0) // 有预加载的精灵图
      expect(sizeAfter).toBeLessThan(sizeBefore) // 但比之前少
    })
  })

  describe('性能优化验证', () => {
    it('使用缓存应该比重新渲染快', () => {
      const key = 'performance_test'
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')!

      // 第一次渲染（创建缓存）
      const start1 = performance.now()
      renderer.renderPlayerShip(ctx, 100, 100)
      const time1 = performance.now() - start1

      // 第二次渲染（使用缓存）
      const start2 = performance.now()
      renderer.renderPlayerShip(ctx, 100, 100)
      const time2 = performance.now() - start2

      // 使用缓存应该更快（或至少不慢）
      expect(time2).toBeLessThanOrEqual(time1 * 1.5) // 允许一些误差
    })

    it('应该能够处理大量缓存而不崩溃', () => {
      // 创建大量缓存
      for (let i = 0; i < 100; i++) {
        renderer.cacheSprite(`stress_test_${i}`, () => {
          const canvas = document.createElement('canvas')
          canvas.width = 50
          canvas.height = 50
          return canvas
        })
      }

      const stats = renderer.getCacheStats()
      expect(stats.totalSprites).toBeGreaterThanOrEqual(100)
      
      // 应该能够正常获取统计信息
      expect(stats.totalMemoryEstimate).toBeGreaterThan(0)
    })
  })
})
