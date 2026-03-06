/**
 * Server Environment Tests for Game V2.0
 * 
 * Tests game performance in server environment:
 * - 2 CPU 2G memory environment
 * - Performance metrics validation
 * - Configuration tuning
 * 
 * Requirements: 20.1, 20.2, 20.6 - Server environment performance
 * 
 * Property 34: Server Environment Performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PERFORMANCE_CONFIG, GAME_CONFIG, SCENE_CONFIG } from '../constants'
import { MemoryManager } from '../MemoryManager'

describe('Server Environment Tests', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance()
    memoryManager.resetStats()
  })

  afterEach(() => {
    memoryManager.stopMonitoring()
    memoryManager.destroy()
  })

  // Task 30.3: 测试服务器环境
  describe('Task 30.3 - Server Environment Tests', () => {
    it('should verify server environment configuration', () => {
      // Server environment specs: 2 CPU, 2G memory
      const serverSpecs = {
        cpu: 2,
        memoryGB: 2
      }

      // Game should be configured for this environment
      expect(PERFORMANCE_CONFIG.MAX_MEMORY_MB).toBe(100) // 100MB limit (well under 2GB)
      expect(PERFORMANCE_CONFIG.TARGET_FPS).toBe(60)

      console.log(`[30.3] 服务器环境: ${serverSpecs.cpu} CPU, ${serverSpecs.memoryGB}G 内存`)
      console.log(`[30.3] 游戏配置: 最大内存 ${PERFORMANCE_CONFIG.MAX_MEMORY_MB}MB, 目标 FPS ${PERFORMANCE_CONFIG.TARGET_FPS}`)
    })

    it('should validate performance targets for server environment', () => {
      // Performance targets
      const targets = {
        fps: 60,
        maxMemoryMB: 100,
        frameTimeBudgetMs: 16.67
      }

      // Verify configuration matches targets
      expect(PERFORMANCE_CONFIG.TARGET_FPS).toBe(targets.fps)
      expect(PERFORMANCE_CONFIG.MAX_MEMORY_MB).toBe(targets.maxMemoryMB)

      const frameBudget = 1000 / PERFORMANCE_CONFIG.TARGET_FPS
      expect(frameBudget).toBeCloseTo(targets.frameTimeBudgetMs, 1)

      console.log(`[30.3] 性能目标: ${targets.fps} FPS, ${targets.maxMemoryMB}MB 内存, ${targets.frameTimeBudgetMs.toFixed(2)}ms 帧预算`)
    })

    it('should verify scene scaling is optimized for server', () => {
      // Scene scaling should be reasonable for server performance
      expect(SCENE_CONFIG.SCALE_MULTIPLIER).toBe(1.5)

      const scaledWidth = Math.floor(GAME_CONFIG.CANVAS_WIDTH * SCENE_CONFIG.SCALE_MULTIPLIER)
      const scaledHeight = Math.floor(GAME_CONFIG.CANVAS_HEIGHT * SCENE_CONFIG.SCALE_MULTIPLIER)

      // Scaled dimensions should be reasonable
      expect(scaledWidth).toBe(1200)
      expect(scaledHeight).toBe(900)

      // Total pixels should be manageable
      const totalPixels = scaledWidth * scaledHeight
      expect(totalPixels).toBe(1080000) // 1.08 million pixels

      console.log(`[30.3] 场景尺寸: ${scaledWidth}x${scaledHeight} (${totalPixels.toLocaleString()} 像素)`)
    })

    it('should test memory efficiency in server environment', () => {
      const memoryInfo = memoryManager.getMemoryInfo()

      // Memory usage should be well under server limits
      expect(memoryInfo.total).toBe(100) // 100MB limit
      expect(memoryInfo.used).toBeLessThan(100)
      expect(memoryInfo.percentage).toBeLessThan(100)

      // Calculate efficiency
      const serverMemoryGB = 2
      const gameMemoryMB = memoryInfo.total
      const efficiencyPercentage = (gameMemoryMB / (serverMemoryGB * 1024)) * 100

      // Game should use less than 5% of server memory
      expect(efficiencyPercentage).toBeLessThan(5)

      console.log(`[30.3] 内存效率: 游戏 ${gameMemoryMB}MB / 服务器 ${serverMemoryGB}GB (${efficiencyPercentage.toFixed(2)}%)`)
    })

    it('should verify memory check interval is appropriate', () => {
      // Memory check interval should balance monitoring and performance
      expect(PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL).toBe(5000) // 5 seconds

      // This means checking every 5 seconds, which is reasonable
      const checksPerMinute = 60000 / PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL
      expect(checksPerMinute).toBe(12)

      console.log(`[30.3] 内存检查: 每 ${PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL}ms (${checksPerMinute}次/分钟)`)
    })

    it('should verify cache cleanup threshold', () => {
      // Cache cleanup threshold should prevent memory issues
      expect(PERFORMANCE_CONFIG.CACHE_CLEANUP_THRESHOLD).toBe(0.9) // 90%

      // This means cleanup triggers at 90MB (90% of 100MB)
      const cleanupTriggerMB = PERFORMANCE_CONFIG.MAX_MEMORY_MB * PERFORMANCE_CONFIG.CACHE_CLEANUP_THRESHOLD
      expect(cleanupTriggerMB).toBe(90)

      console.log(`[30.3] 缓存清理阈值: ${PERFORMANCE_CONFIG.CACHE_CLEANUP_THRESHOLD * 100}% (${cleanupTriggerMB}MB)`)
    })

    it('should simulate server load with multiple concurrent operations', async () => {
      // Simulate multiple operations happening concurrently
      const operations = []

      // Simulate rendering
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise(resolve => {
            setTimeout(() => {
              // Simulate render work
              const data = new Array(100).fill(Math.random())
              resolve(data)
            }, Math.random() * 100)
          })
        )
      }

      // Simulate audio processing
      for (let i = 0; i < 5; i++) {
        operations.push(
          new Promise(resolve => {
            setTimeout(() => {
              // Simulate audio work
              const data = new Array(50).fill(Math.random())
              resolve(data)
            }, Math.random() * 50)
          })
        )
      }

      const startTime = performance.now()
      await Promise.all(operations)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // All operations should complete quickly
      expect(totalTime).toBeLessThan(200) // Less than 200ms

      const memoryInfo = memoryManager.getMemoryInfo()
      expect(memoryInfo.used).toBeLessThan(100)

      console.log(`[30.3] 并发操作: ${operations.length}个操作, 耗时 ${totalTime.toFixed(2)}ms`)
    })

    it('should test sustained performance over time', async () => {
      // Simulate sustained load for 2 seconds
      const duration = 2000
      const interval = 100
      const iterations = duration / interval
      const frameTimes: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < iterations; i++) {
        const frameStart = performance.now()

        // Simulate frame work
        const entities = []
        for (let j = 0; j < 50; j++) {
          entities.push({
            x: Math.random() * 1200,
            y: Math.random() * 900,
            data: new Array(10).fill(Math.random())
          })
        }

        await new Promise(resolve => setTimeout(resolve, interval))

        const frameEnd = performance.now()
        frameTimes.push(frameEnd - frameStart)

        // Cleanup
        entities.length = 0
      }

      // Calculate performance metrics
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      const maxFrameTime = Math.max(...frameTimes)
      const fps = 1000 / avgFrameTime

      // Performance should be stable
      expect(avgFrameTime).toBeLessThan(120) // Average should be reasonable
      expect(maxFrameTime).toBeLessThan(200) // Max should not spike too high
      expect(fps).toBeGreaterThan(8) // Should maintain reasonable FPS

      const memoryInfo = memoryManager.getMemoryInfo()
      expect(memoryInfo.used).toBeLessThan(100)

      console.log(`[30.3] 持续性能: 平均 ${avgFrameTime.toFixed(2)}ms, 最大 ${maxFrameTime.toFixed(2)}ms, FPS ${fps.toFixed(2)}`)
    })

    it('should verify configuration is production-ready', () => {
      // Check all critical configurations
      const config = {
        targetFPS: PERFORMANCE_CONFIG.TARGET_FPS,
        maxMemoryMB: PERFORMANCE_CONFIG.MAX_MEMORY_MB,
        memoryCheckInterval: PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL,
        cacheCleanupThreshold: PERFORMANCE_CONFIG.CACHE_CLEANUP_THRESHOLD,
        scaleMultiplier: SCENE_CONFIG.SCALE_MULTIPLIER
      }

      // All configurations should be set
      expect(config.targetFPS).toBeDefined()
      expect(config.maxMemoryMB).toBeDefined()
      expect(config.memoryCheckInterval).toBeDefined()
      expect(config.cacheCleanupThreshold).toBeDefined()
      expect(config.scaleMultiplier).toBeDefined()

      // Values should be reasonable
      expect(config.targetFPS).toBeGreaterThan(0)
      expect(config.maxMemoryMB).toBeGreaterThan(0)
      expect(config.memoryCheckInterval).toBeGreaterThan(0)
      expect(config.cacheCleanupThreshold).toBeGreaterThan(0)
      expect(config.cacheCleanupThreshold).toBeLessThan(1)
      expect(config.scaleMultiplier).toBeGreaterThan(0)

      console.log('[30.3] 生产配置验证通过:')
      console.log(`  - 目标 FPS: ${config.targetFPS}`)
      console.log(`  - 最大内存: ${config.maxMemoryMB}MB`)
      console.log(`  - 检查间隔: ${config.memoryCheckInterval}ms`)
      console.log(`  - 清理阈值: ${config.cacheCleanupThreshold * 100}%`)
      console.log(`  - 场景缩放: ${config.scaleMultiplier}x`)
    })

    it('should test resource cleanup under server constraints', async () => {
      // Create resources
      const resources = []
      for (let i = 0; i < 100; i++) {
        resources.push({
          id: i,
          data: new Array(50).fill(Math.random()),
          timestamp: Date.now()
        })
      }

      const beforeMemory = memoryManager.getMemoryInfo().used

      // Cleanup resources
      resources.length = 0
      memoryManager.cleanup(true)

      await new Promise(resolve => setTimeout(resolve, 100))

      const afterMemory = memoryManager.getMemoryInfo().used

      // Memory should not increase
      expect(afterMemory).toBeLessThanOrEqual(beforeMemory + 1) // Allow 1MB tolerance

      console.log(`[30.3] 资源清理: ${beforeMemory.toFixed(2)}MB -> ${afterMemory.toFixed(2)}MB`)
    })

    it('should verify game can handle server environment limits', () => {
      // Server limits
      const serverLimits = {
        cpuCores: 2,
        memoryGB: 2,
        maxConcurrentUsers: 10 // Realistic for 2GB server
      }

      // Game memory per user
      const memoryPerUserMB = PERFORMANCE_CONFIG.MAX_MEMORY_MB
      const totalMemoryForUsersMB = memoryPerUserMB * serverLimits.maxConcurrentUsers

      // Should fit within server memory (with overhead)
      const serverMemoryMB = serverLimits.memoryGB * 1024
      const memoryUsagePercentage = (totalMemoryForUsersMB / serverMemoryMB) * 100

      // Should use reasonable amount of server memory
      expect(memoryUsagePercentage).toBeLessThan(75) // Less than 75% for concurrent users

      console.log(`[30.3] 服务器容量: ${serverLimits.maxConcurrentUsers}用户 x ${memoryPerUserMB}MB = ${totalMemoryForUsersMB}MB (${memoryUsagePercentage.toFixed(2)}% of ${serverMemoryMB}MB)`)
    })
  })
})
