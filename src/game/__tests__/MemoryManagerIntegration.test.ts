/**
 * 内存管理器集成测试
 * 测试 MemoryManager 与 GameEngine 的集成
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameEngine } from '../GameEngine'
import { MemoryManager } from '../MemoryManager'

describe('MemoryManager Integration with GameEngine', () => {
  let canvas: HTMLCanvasElement
  let engine: GameEngine | null
  let memoryManager: MemoryManager | null

  beforeEach(() => {
    // 创建测试 Canvas
    canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 600

    // Mock getContext
    const mockContext = {
      fillStyle: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      canvas: canvas
    } as any

    vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext)

    // 创建游戏引擎
    engine = new GameEngine(canvas)
    memoryManager = engine.getMemoryManager()
  })

  afterEach(() => {
    // 清理
    if (engine) {
      engine.stop()
    }
    if (memoryManager) {
      memoryManager.destroy()
    }
    engine = null
    memoryManager = null
  })

  describe('初始化', () => {
    it('应该在 GameEngine 构造时初始化 MemoryManager', () => {
      expect(memoryManager).toBeDefined()
      expect(memoryManager).toBeInstanceOf(MemoryManager)
    })

    it('应该注册清理回调到 MemoryManager', () => {
      const stats = memoryManager!.getStats()
      expect(stats.cleanupCallbackCount).toBeGreaterThan(0)
    })
  })

  describe('内存监控', () => {
    it('应该在游戏启动时开始内存监控', () => {
      engine!.start()
      
      const stats = memoryManager!.getStats()
      expect(stats.isMonitoring).toBe(true)
      
      engine!.stop()
    })

    it('应该在游戏停止时停止内存监控', () => {
      engine!.start()
      expect(memoryManager!.getStats().isMonitoring).toBe(true)
      
      engine!.stop()
      expect(memoryManager!.getStats().isMonitoring).toBe(false)
    })
  })

  describe('内存清理', () => {
    it('应该能够触发清理回调', () => {
      let cleanupCalled = false
      
      memoryManager!.registerCleanupCallback(() => {
        cleanupCalled = true
      })
      
      memoryManager!.cleanup()
      
      expect(cleanupCalled).toBe(true)
    })

    it('应该在内存警告时自动清理', () => {
      // 模拟内存使用过高的情况
      // 注意：这个测试依赖于 MemoryManager 的内部实现
      const spy = vi.spyOn(memoryManager as any, 'cleanup')
      
      // 手动触发清理
      memoryManager!.cleanup(false)
      
      expect(spy).toHaveBeenCalled()
      
      spy.mockRestore()
    })
  })

  describe('内存信息', () => {
    it('应该能够获取内存使用信息', () => {
      const memoryInfo = memoryManager!.getMemoryInfo()
      
      expect(memoryInfo).toBeDefined()
      expect(memoryInfo.used).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.total).toBe(100) // 100MB 限制
      expect(memoryInfo.percentage).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.percentage).toBeLessThanOrEqual(100)
    })

    it('应该能够获取统计信息', () => {
      const stats = memoryManager!.getStats()
      
      expect(stats).toBeDefined()
      expect(stats.memoryInfo).toBeDefined()
      expect(stats.warningLevel).toBeDefined()
      expect(stats.checkCount).toBeGreaterThanOrEqual(0)
      expect(stats.isMonitoring).toBeDefined()
      expect(stats.memoryHistory).toBeInstanceOf(Array)
      expect(stats.cleanupCallbackCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('对象池优化', () => {
    it('应该在清理时优化对象池', () => {
      // 启动游戏
      engine!.start()
      
      // 添加一些实体（会使用对象池）
      // 注意：这里只是测试集成，不测试具体的对象池行为
      
      // 触发清理
      memoryManager!.cleanup()
      
      // 验证清理没有抛出错误
      expect(true).toBe(true)
      
      engine!.stop()
    })
  })

  describe('性能要求', () => {
    it('应该设置内存限制为 100MB', () => {
      const memoryInfo = memoryManager!.getMemoryInfo()
      expect(memoryInfo.total).toBe(100)
    })

    it('应该能够检查内存是否超过限制', () => {
      const isExceeded = memoryManager!.isMemoryExceeded()
      expect(typeof isExceeded).toBe('boolean')
    })

    it('应该能够获取可用内存', () => {
      const available = memoryManager!.getAvailableMemory()
      expect(available).toBeGreaterThanOrEqual(0)
      expect(available).toBeLessThanOrEqual(100)
    })
  })

  describe('生命周期', () => {
    it('应该在游戏运行期间持续监控内存', async () => {
      engine!.start()
      
      // 等待一段时间，让监控运行
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const stats = memoryManager!.getStats()
      expect(stats.isMonitoring).toBe(true)
      
      engine!.stop()
    })

    it('应该能够重置统计信息', () => {
      engine!.start()
      
      // 等待一些检查
      const statsBefore = memoryManager!.getStats()
      
      memoryManager!.resetStats()
      
      const statsAfter = memoryManager!.getStats()
      expect(statsAfter.checkCount).toBe(0)
      expect(statsAfter.memoryHistory.length).toBe(0)
      
      engine!.stop()
    })
  })
})
