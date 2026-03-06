/**
 * MemoryManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryManager, MemoryWarningLevel } from '../MemoryManager'

describe('MemoryManager', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance()
  })

  afterEach(() => {
    memoryManager.stopMonitoring()
    memoryManager.destroy()
  })

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = MemoryManager.getInstance()
      const instance2 = MemoryManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('内存监控', () => {
    it('应该能够启动和停止监控', () => {
      memoryManager.startMonitoring()
      const stats = memoryManager.getStats()
      expect(stats.isMonitoring).toBe(true)

      memoryManager.stopMonitoring()
      const stats2 = memoryManager.getStats()
      expect(stats2.isMonitoring).toBe(false)
    })

    it('应该记录检查次数', () => {
      const initialStats = memoryManager.getStats()
      expect(initialStats.checkCount).toBe(0)

      memoryManager.startMonitoring()
      
      // 等待至少一次检查
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stats = memoryManager.getStats()
          expect(stats.checkCount).toBeGreaterThan(0)
          resolve()
        }, 100)
      })
    })
  })

  describe('内存信息', () => {
    it('应该返回内存使用信息', () => {
      const memoryInfo = memoryManager.getMemoryInfo()
      
      expect(memoryInfo).toHaveProperty('used')
      expect(memoryInfo).toHaveProperty('total')
      expect(memoryInfo).toHaveProperty('percentage')
      expect(memoryInfo.total).toBe(100) // 100MB 限制
      expect(memoryInfo.used).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.percentage).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.percentage).toBeLessThanOrEqual(100)
    })

    it('应该正确计算内存百分比', () => {
      const percentage = memoryManager.getMemoryPercentage()
      expect(percentage).toBeGreaterThanOrEqual(0)
      expect(percentage).toBeLessThanOrEqual(100)
    })

    it('应该返回可用内存', () => {
      const available = memoryManager.getAvailableMemory()
      expect(available).toBeGreaterThanOrEqual(0)
      expect(available).toBeLessThanOrEqual(100)
    })
  })

  describe('清理功能', () => {
    it('应该能够执行清理', () => {
      // 不应该抛出错误
      expect(() => memoryManager.cleanup(false)).not.toThrow()
      expect(() => memoryManager.cleanup(true)).not.toThrow()
    })

    it('应该能够注册和取消注册清理回调', () => {
      const callback = vi.fn()
      
      memoryManager.registerCleanupCallback(callback)
      let stats = memoryManager.getStats()
      expect(stats.cleanupCallbackCount).toBe(1)

      memoryManager.cleanup()
      expect(callback).toHaveBeenCalled()

      memoryManager.unregisterCleanupCallback(callback)
      stats = memoryManager.getStats()
      expect(stats.cleanupCallbackCount).toBe(0)
    })
  })

  describe('统计信息', () => {
    it('应该返回完整的统计信息', () => {
      const stats = memoryManager.getStats()
      
      expect(stats).toHaveProperty('memoryInfo')
      expect(stats).toHaveProperty('warningLevel')
      expect(stats).toHaveProperty('checkCount')
      expect(stats).toHaveProperty('isMonitoring')
      expect(stats).toHaveProperty('memoryHistory')
      expect(stats).toHaveProperty('cleanupCallbackCount')
      
      expect(stats.warningLevel).toBeOneOf([
        MemoryWarningLevel.NORMAL,
        MemoryWarningLevel.WARNING,
        MemoryWarningLevel.CRITICAL
      ])
    })

    it('应该能够重置统计信息', () => {
      memoryManager.startMonitoring()
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          memoryManager.resetStats()
          const stats = memoryManager.getStats()
          expect(stats.checkCount).toBe(0)
          expect(stats.memoryHistory).toHaveLength(0)
          resolve()
        }, 100)
      })
    })
  })

  describe('内存限制检查', () => {
    it('应该能够检查内存是否超过限制', () => {
      const exceeded = memoryManager.isMemoryExceeded()
      expect(typeof exceeded).toBe('boolean')
    })
  })

  describe('销毁', () => {
    it('应该能够销毁实例', () => {
      memoryManager.destroy()
      
      // 销毁后应该能够创建新实例
      const newInstance = MemoryManager.getInstance()
      expect(newInstance).toBeDefined()
      expect(newInstance).not.toBe(memoryManager)
    })
  })
})
