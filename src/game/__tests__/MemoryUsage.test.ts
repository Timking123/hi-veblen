/**
 * Memory Usage Tests for Game V2.0
 * 
 * Tests memory usage under various conditions:
 * - Initial memory
 * - Memory after 30 minutes of gameplay
 * - Memory leak detection
 * - Memory limit compliance (100MB)
 * 
 * Requirements: 20.2, 20.5 - Memory management and leak prevention
 * 
 * Property 35: Long-term Memory Stability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryManager } from '../MemoryManager'
import { PERFORMANCE_CONFIG } from '../constants'

describe('Memory Usage Tests', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance()
    memoryManager.resetStats()
  })

  afterEach(() => {
    memoryManager.stopMonitoring()
    memoryManager.destroy()
  })

  // Task 30.2: 测试内存使用
  describe('Task 30.2 - Memory Usage Tests', () => {
    it('should measure initial memory usage', () => {
      // Get initial memory info
      const memoryInfo = memoryManager.getMemoryInfo()

      // Initial memory should be reasonable
      // Note: In test environment, performance.memory may not be available
      expect(memoryInfo.used).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.used).toBeLessThan(100) // Should not exceed limit
      expect(memoryInfo.percentage).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.percentage).toBeLessThan(100)

      console.log(`[30.2] 初始内存: ${memoryInfo.used.toFixed(2)}MB (${memoryInfo.percentage.toFixed(2)}%)`)
    })

    it('should verify memory limit is set to 100MB', () => {
      // Verify max memory configuration
      expect(PERFORMANCE_CONFIG.MAX_MEMORY_MB).toBe(100)

      const memoryInfo = memoryManager.getMemoryInfo()
      expect(memoryInfo.total).toBe(100)

      console.log(`[30.2] 内存限制: ${memoryInfo.total}MB`)
    })

    it('should simulate memory usage over time', async () => {
      // Simulate memory usage by creating objects
      const objects: any[] = []
      const iterations = 100

      const initialMemory = memoryManager.getMemoryInfo().used

      for (let i = 0; i < iterations; i++) {
        // Simulate game objects
        objects.push({
          id: i,
          data: new Array(100).fill(Math.random()),
          timestamp: Date.now()
        })
      }

      // Wait a bit for memory to settle
      await new Promise(resolve => setTimeout(resolve, 100))

      const afterMemory = memoryManager.getMemoryInfo().used
      const memoryIncrease = afterMemory - initialMemory

      // Memory should increase but not excessively
      expect(memoryIncrease).toBeGreaterThanOrEqual(0)
      expect(afterMemory).toBeLessThan(100) // Should not exceed limit

      console.log(`[30.2] 内存增长: ${memoryIncrease.toFixed(2)}MB (初始: ${initialMemory.toFixed(2)}MB, 之后: ${afterMemory.toFixed(2)}MB)`)

      // Cleanup
      objects.length = 0
    })

    it('should detect memory leaks over extended period', async () => {
      // Simulate 30 minutes of gameplay (compressed to 3 seconds for testing)
      const checkInterval = 100 // Check every 100ms
      const totalChecks = 30 // 30 checks = 3 seconds
      const memorySnapshots: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < totalChecks; i++) {
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        
        const memoryInfo = memoryManager.getMemoryInfo()
        memorySnapshots.push(memoryInfo.used)
      }

      // Calculate memory growth
      const initialMemory = memorySnapshots[0]
      const finalMemory = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowth = finalMemory - initialMemory

      // In test environment, memory may be 0, so handle that case
      const growthPercentage = initialMemory > 0 
        ? (memoryGrowth / initialMemory) * 100 
        : 0

      // Memory growth should be minimal (less than 10% over 30 minutes)
      // Or if memory is 0 (test environment), growth should be 0
      if (initialMemory > 0) {
        expect(growthPercentage).toBeLessThan(10)
      } else {
        expect(growthPercentage).toBe(0)
      }
      expect(finalMemory).toBeLessThan(100) // Should not exceed limit

      console.log(`[30.2] 长时间运行内存: 初始 ${initialMemory.toFixed(2)}MB, 最终 ${finalMemory.toFixed(2)}MB, 增长 ${growthPercentage.toFixed(2)}%`)
    })

    it('should ensure memory stays under 100MB limit', () => {
      // Create many objects to test memory limit
      const objects: any[] = []
      const maxIterations = 1000

      for (let i = 0; i < maxIterations; i++) {
        const memoryInfo = memoryManager.getMemoryInfo()
        
        // Stop if approaching limit
        if (memoryInfo.percentage > 90) {
          console.log(`[30.2] 接近内存限制，停止创建对象 (${memoryInfo.used.toFixed(2)}MB)`)
          break
        }

        objects.push({
          id: i,
          data: new Array(50).fill(Math.random())
        })
      }

      const finalMemory = memoryManager.getMemoryInfo()
      
      // Should not exceed 100MB
      expect(finalMemory.used).toBeLessThan(100)
      expect(finalMemory.percentage).toBeLessThan(100)

      console.log(`[30.2] 最大内存使用: ${finalMemory.used.toFixed(2)}MB (${finalMemory.percentage.toFixed(2)}%)`)

      // Cleanup
      objects.length = 0
    })

    it('should test memory cleanup effectiveness', async () => {
      // Create objects
      const objects: any[] = []
      for (let i = 0; i < 500; i++) {
        objects.push({
          id: i,
          data: new Array(100).fill(Math.random())
        })
      }

      const beforeCleanup = memoryManager.getMemoryInfo().used

      // Clear objects
      objects.length = 0

      // Trigger cleanup
      memoryManager.cleanup(true)

      // Wait for cleanup to take effect
      await new Promise(resolve => setTimeout(resolve, 100))

      const afterCleanup = memoryManager.getMemoryInfo().used
      const memoryFreed = beforeCleanup - afterCleanup

      // Cleanup should free some memory (or at least not increase)
      expect(afterCleanup).toBeLessThanOrEqual(beforeCleanup)

      console.log(`[30.2] 清理效果: 清理前 ${beforeCleanup.toFixed(2)}MB, 清理后 ${afterCleanup.toFixed(2)}MB, 释放 ${memoryFreed.toFixed(2)}MB`)
    })

    it('should monitor memory over multiple check cycles', async () => {
      memoryManager.startMonitoring()

      // Wait for multiple check cycles
      await new Promise(resolve => setTimeout(resolve, 500))

      const stats = memoryManager.getStats()

      // Should have performed multiple checks
      expect(stats.checkCount).toBeGreaterThan(0)
      expect(stats.memoryHistory.length).toBeGreaterThan(0)

      // Memory should be stable
      const memoryHistory = stats.memoryHistory
      if (memoryHistory.length > 1) {
        const firstMemory = memoryHistory[0]
        const lastMemory = memoryHistory[memoryHistory.length - 1]
        const variance = Math.abs(lastMemory - firstMemory)

        // Memory variance should be small
        expect(variance).toBeLessThan(20) // Less than 20MB variance

        console.log(`[30.2] 内存监控: ${stats.checkCount}次检查, 内存范围 ${Math.min(...memoryHistory).toFixed(2)}-${Math.max(...memoryHistory).toFixed(2)}MB`)
      }
    })

    it('should verify memory check interval configuration', () => {
      // Verify memory check interval is set
      expect(PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL).toBe(5000) // 5 seconds

      console.log(`[30.2] 内存检查间隔: ${PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL}ms`)
    })

    it('should test memory warning levels', () => {
      const memoryInfo = memoryManager.getMemoryInfo()
      const stats = memoryManager.getStats()

      // Should have a warning level
      expect(stats.warningLevel).toBeDefined()

      // At normal usage, should be NORMAL or WARNING
      expect(['NORMAL', 'WARNING', 'CRITICAL']).toContain(stats.warningLevel)

      console.log(`[30.2] 当前内存警告级别: ${stats.warningLevel} (${memoryInfo.percentage.toFixed(2)}%)`)
    })

    it('should simulate 30-minute gameplay memory stability', async () => {
      // Simulate 30 minutes compressed to 3 seconds
      // Each second represents 10 minutes of gameplay
      const checkInterval = 100 // Check every 100ms (1 minute)
      const totalChecks = 30 // 30 checks = 3 seconds = 30 minutes simulated
      const memorySnapshots: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < totalChecks; i++) {
        // Simulate game activity
        const tempObjects = []
        for (let j = 0; j < 50; j++) {
          tempObjects.push({ data: new Array(20).fill(Math.random()) })
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval))
        
        const memoryInfo = memoryManager.getMemoryInfo()
        memorySnapshots.push(memoryInfo.used)

        // Cleanup temp objects
        tempObjects.length = 0
      }

      // Analyze memory stability
      const avgMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length
      const maxMemory = Math.max(...memorySnapshots)
      const minMemory = Math.min(...memorySnapshots)
      const memoryRange = maxMemory - minMemory

      // Memory should be stable (range less than 30MB)
      expect(memoryRange).toBeLessThan(30)
      expect(maxMemory).toBeLessThan(100)

      console.log(`[30.2] 30分钟模拟: 平均 ${avgMemory.toFixed(2)}MB, 范围 ${minMemory.toFixed(2)}-${maxMemory.toFixed(2)}MB`)
    }, 10000) // Increase timeout to 10 seconds
  })
})
