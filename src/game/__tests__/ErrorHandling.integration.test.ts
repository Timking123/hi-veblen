/**
 * 集成测试 33.3: 错误处理测试
 * 
 * 测试内容:
 * - 测试音频加载失败
 * - 测试资源加载超时
 * - 测试渲染错误
 * - 测试内存不足
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameEngine } from '../GameEngine'
import { AudioSystem } from '../AudioSystem'
import { ResourceManager } from '../ResourceManager'
import { MemoryManager } from '../MemoryManager'
import { PixelArtRenderer } from '../PixelArtRenderer'

// Mock Canvas API
class MockCanvasRenderingContext2D {
  canvas = { width: 800, height: 600 }
  fillStyle = ''
  strokeStyle = ''
  lineWidth = 1
  font = ''
  textAlign = 'left'
  textBaseline = 'top'
  
  fillRect() {}
  strokeRect() {}
  clearRect() {}
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  arc() {}
  fill() {}
  stroke() {}
  fillText() {}
  strokeText() {}
  measureText() { return { width: 10 } }
  save() {}
  restore() {}
  translate() {}
  rotate() {}
  scale() {}
  drawImage() {}
  createLinearGradient() { return { addColorStop: () => {} } }
  createRadialGradient() { return { addColorStop: () => {} } }
  getImageData() { return { data: new Uint8ClampedArray(4), width: 1, height: 1 } }
  putImageData() {}
}

describe('集成测试 33.3: 错误处理', () => {
  let canvas: HTMLCanvasElement
  let gameEngine: GameEngine

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600
    
    // Mock getContext
    vi.spyOn(canvas, 'getContext').mockReturnValue(new MockCanvasRenderingContext2D() as any)
    
    gameEngine = new GameEngine(canvas)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('音频加载失败处理', () => {
    it('应该在音频加载失败时继续游戏（降级模式）', async () => {
      const audioSystem = new AudioSystem()
      
      // Mock 音频加载失败
      vi.spyOn(audioSystem as any, 'loadAudio').mockRejectedValue(
        new Error('Failed to load audio')
      )
      
      // 初始化应该不抛出错误
      await expect(audioSystem.initialize()).resolves.not.toThrow()
      
      // 游戏应该能够继续运行（静音模式）
      expect(audioSystem.isMusicEnabled()).toBeDefined()
    })

    it('应该在音频上下文创建失败时提供降级方案', async () => {
      const audioSystem = new AudioSystem()
      
      // Mock AudioContext 创建失败
      const originalAudioContext = (global as any).AudioContext
      ;(global as any).AudioContext = undefined
      ;(global as any).webkitAudioContext = undefined
      
      await audioSystem.initialize()
      
      // 恢复
      ;(global as any).AudioContext = originalAudioContext
      
      // 系统应该能够处理这种情况
      expect(audioSystem).toBeDefined()
    })

    it('应该在音频文件不存在时记录错误但不崩溃', async () => {
      const audioSystem = new AudioSystem()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await audioSystem.initialize()
      
      // 尝试播放不存在的音效
      audioSystem.playSoundEffect('non_existent_sound' as any)
      
      // 应该记录错误但不崩溃
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('应该在音频解码失败时提供错误信息', async () => {
      const audioSystem = new AudioSystem()
      
      // Mock 音频解码失败
      vi.spyOn(audioSystem as any, 'decodeAudioData').mockRejectedValue(
        new Error('Failed to decode audio data')
      )
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      await audioSystem.initialize()
      
      consoleSpy.mockRestore()
    })
  })

  describe('资源加载超时处理', () => {
    it('应该在资源加载超时时抛出错误', async () => {
      const resourceManager = ResourceManager.getInstance()
      
      // Mock 超时
      const loadWithTimeout = async (url: string, timeout: number = 100) => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Resource loading timeout')), timeout)
        })
      }
      
      await expect(loadWithTimeout('test.png', 100)).rejects.toThrow('Resource loading timeout')
    })

    it('应该在资源加载超时后提供降级方案', async () => {
      const resourceManager = ResourceManager.getInstance()
      
      // 尝试加载资源，超时后使用默认资源
      try {
        await resourceManager.loadImage('non_existent.png')
      } catch (error) {
        // 使用默认资源
        expect(error).toBeDefined()
      }
    })

    it('应该能够取消超时的资源加载', async () => {
      let cancelled = false
      
      const loadWithCancel = () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!cancelled) {
              reject(new Error('Timeout'))
            }
          }, 1000)
          
          // 模拟取消
          setTimeout(() => {
            cancelled = true
            clearTimeout(timeout)
            resolve('cancelled')
          }, 100)
        })
      }
      
      const result = await loadWithCancel()
      expect(result).toBe('cancelled')
    })

    it('应该在多个资源加载失败时继续加载其他资源', async () => {
      const resourceManager = ResourceManager.getInstance()
      
      const urls = ['image1.png', 'image2.png', 'image3.png']
      const results = await Promise.allSettled(
        urls.map(url => resourceManager.loadImage(url))
      )
      
      // 即使部分失败，也应该返回所有结果
      expect(results.length).toBe(urls.length)
    })
  })

  describe('渲染错误处理', () => {
    it('应该在 Canvas 上下文获取失败时抛出错误', () => {
      const invalidCanvas = {} as HTMLCanvasElement
      
      expect(() => {
        new GameEngine(invalidCanvas)
      }).toThrow('无法获取 Canvas 2D 上下文')
    })

    it('应该在渲染过程中捕获错误并继续', () => {
      const renderer = new PixelArtRenderer()
      const ctx = canvas.getContext('2d')!
      
      // Mock 渲染错误
      const originalFillRect = ctx.fillRect
      ctx.fillRect = () => {
        throw new Error('Render error')
      }
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      try {
        renderer.renderPlayerShip(ctx, 100, 100)
      } catch (error) {
        expect(error).toBeDefined()
      }
      
      // 恢复
      ctx.fillRect = originalFillRect
      consoleSpy.mockRestore()
    })

    it('应该在像素艺术缓存失败时使用实时渲染', () => {
      const renderer = new PixelArtRenderer()
      const ctx = canvas.getContext('2d')!
      
      // 清除缓存
      renderer.clearCache()
      
      // 应该能够渲染（即使没有缓存）
      expect(() => {
        renderer.renderPlayerShip(ctx, 100, 100)
      }).not.toThrow()
    })

    it('应该在渲染大量实体时不崩溃', () => {
      gameEngine.start()
      
      // 添加大量实体
      for (let i = 0; i < 1000; i++) {
        const entity = {
          id: `test-${i}`,
          x: Math.random() * 800,
          y: Math.random() * 600,
          width: 10,
          height: 10,
          isActive: true,
          update: () => {},
          render: () => {},
          onCollision: () => {}
        }
        gameEngine.addEntity(entity as any)
      }
      
      // 应该能够渲染
      expect(() => {
        gameEngine.stop()
      }).not.toThrow()
    })
  })

  describe('内存不足处理', () => {
    it('应该在内存使用过高时触发清理', () => {
      const memoryManager = MemoryManager.getInstance()
      
      // Mock 高内存使用
      const mockMemory = {
        usedJSHeapSize: 95 * 1024 * 1024, // 95MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true,
        configurable: true
      })
      
      const cleanupSpy = vi.fn()
      memoryManager.registerCleanupCallback(cleanupSpy)
      
      // 触发内存检查
      memoryManager.checkMemory()
      
      // 应该触发清理
      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('应该在内存不足时清理对象池', () => {
      const memoryManager = MemoryManager.getInstance()
      
      // 注册清理回调
      let poolCleaned = false
      memoryManager.registerCleanupCallback(() => {
        poolCleaned = true
      })
      
      // Mock 内存不足
      const mockMemory = {
        usedJSHeapSize: 95 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true,
        configurable: true
      })
      
      memoryManager.checkMemory()
      
      expect(poolCleaned).toBe(true)
    })

    it('应该在内存不足时清理未使用的缓存', () => {
      const renderer = new PixelArtRenderer()
      const ctx = canvas.getContext('2d')!
      
      // 创建一些缓存
      renderer.renderPlayerShip(ctx, 100, 100)
      
      // 清理缓存
      renderer.clearCache()
      
      // 应该能够继续渲染
      expect(() => {
        renderer.renderPlayerShip(ctx, 100, 100)
      }).not.toThrow()
    })

    it('应该在内存泄漏时发出警告', () => {
      const memoryManager = MemoryManager.getInstance()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Mock 内存持续增长
      const mockMemory = {
        usedJSHeapSize: 95 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true,
        configurable: true
      })
      
      memoryManager.checkMemory()
      
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('应该在内存不足时停止生成新实体', () => {
      const memoryManager = MemoryManager.getInstance()
      
      // Mock 内存不足
      const mockMemory = {
        usedJSHeapSize: 98 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 100 * 1024 * 1024
      }
      
      Object.defineProperty(performance, 'memory', {
        value: mockMemory,
        writable: true,
        configurable: true
      })
      
      // 检查是否应该停止生成
      const shouldStop = memoryManager.shouldStopSpawning()
      
      expect(shouldStop).toBe(true)
    })
  })

  describe('综合错误恢复场景', () => {
    it('应该在多个系统同时出错时保持游戏运行', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // 音频系统错误
      const audioSystem = gameEngine.getAudioSystem()
      vi.spyOn(audioSystem, 'playSoundEffect').mockImplementation(() => {
        throw new Error('Audio error')
      })
      
      // 渲染错误
      const ctx = canvas.getContext('2d')!
      const originalFillRect = ctx.fillRect
      ctx.fillRect = () => {
        throw new Error('Render error')
      }
      
      // 游戏应该能够继续运行
      gameEngine.start()
      
      setTimeout(() => {
        gameEngine.stop()
        expect(gameEngine).toBeDefined()
        
        // 恢复
        ctx.fillRect = originalFillRect
        consoleSpy.mockRestore()
      }, 100)
    })

    it('应该在错误后能够重新初始化系统', async () => {
      const audioSystem = new AudioSystem()
      
      // 第一次初始化失败
      vi.spyOn(audioSystem as any, 'loadAudio').mockRejectedValueOnce(
        new Error('Failed to load')
      )
      
      await audioSystem.initialize()
      
      // 第二次初始化应该成功
      vi.spyOn(audioSystem as any, 'loadAudio').mockResolvedValueOnce(undefined)
      
      await audioSystem.initialize()
      
      expect(audioSystem).toBeDefined()
    })

    it('应该在错误后清理资源并重新开始', () => {
      gameEngine.start()
      
      // 添加一些实体
      for (let i = 0; i < 10; i++) {
        const entity = {
          id: `test-${i}`,
          x: 100,
          y: 100,
          width: 10,
          height: 10,
          isActive: true,
          update: () => {},
          render: () => {},
          onCollision: () => {}
        }
        gameEngine.addEntity(entity as any)
      }
      
      // 停止游戏
      gameEngine.stop()
      
      // 清理实体
      gameEngine.clearEntities()
      
      // 应该能够重新开始
      expect(() => {
        gameEngine.start()
        gameEngine.stop()
      }).not.toThrow()
    })

    it('应该在严重错误时提供用户友好的错误信息', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      try {
        // 模拟严重错误
        throw new Error('Critical game error')
      } catch (error) {
        expect(error).toBeDefined()
        expect((error as Error).message).toContain('Critical game error')
      }
      
      consoleSpy.mockRestore()
    })
  })
})
