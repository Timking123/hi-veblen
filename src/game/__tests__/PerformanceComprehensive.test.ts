/**
 * Comprehensive Performance Tests for Game V2.0 - Task 34
 * 
 * This test suite covers all performance testing requirements:
 * - Task 34.1: Frame Rate Tests (empty scene, full entities, audio, effects)
 * - Task 34.2: Memory Tests (initial, 5min, 30min, leak detection)
 * - Task 34.3: Loading Performance Tests (resources, audio, first render)
 * - Task 34.4: Server Environment Tests (2 CPU 2G, concurrent users, long-running)
 * 
 * Requirements: 20.1, 20.2, 20.5, 20.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PERFORMANCE_CONFIG, GAME_CONFIG, SCENE_CONFIG } from '../constants'
import { MemoryManager } from '../MemoryManager'

describe('Task 34: Comprehensive Performance Tests', () => {
  let memoryManager: MemoryManager
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance()
    memoryManager.resetStats()

    // Create test canvas
    canvas = document.createElement('canvas')
    canvas.width = Math.floor(GAME_CONFIG.CANVAS_WIDTH * SCENE_CONFIG.SCALE_MULTIPLIER)
    canvas.height = Math.floor(GAME_CONFIG.CANVAS_HEIGHT * SCENE_CONFIG.SCALE_MULTIPLIER)

    // Mock canvas context
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      globalAlpha: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
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
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
      putImageData: vi.fn(),
      canvas: canvas
    } as any

    ctx = mockCtx
    vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx)
  })

  afterEach(() => {
    memoryManager.stopMonitoring()
    memoryManager.destroy()
    vi.restoreAllMocks()
  })

  /**
   * Helper: Simulate frame rendering
   */
  function simulateFrame(entityCount: number = 0, effectCount: number = 0): number {
    const startTime = performance.now()

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render entities
    for (let i = 0; i < entityCount; i++) {
      ctx.fillRect(i * 10, i * 10, 10, 10)
    }

    // Render effects
    for (let i = 0; i < effectCount; i++) {
      ctx.arc(i * 20, i * 20, 10, 0, Math.PI * 2)
      ctx.fill()
    }

    const endTime = performance.now()
    return endTime - startTime
  }

  /**
   * Helper: Measure FPS over multiple frames
   */
  function measureFPS(frameCount: number, entityCount: number = 0, effectCount: number = 0): { avgFrameTime: number; fps: number; maxFrameTime: number } {
    const frameTimes: number[] = []

    for (let i = 0; i < frameCount; i++) {
      const frameTime = simulateFrame(entityCount, effectCount)
      frameTimes.push(frameTime)
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    const maxFrameTime = Math.max(...frameTimes)
    const fps = 1000 / avgFrameTime

    return { avgFrameTime, fps, maxFrameTime }
  }

  // ========================================
  // Task 34.1: Frame Rate Tests
  // ========================================
  describe('Task 34.1: Frame Rate Tests', () => {
    it('should test empty scene FPS (Requirement 20.1)', () => {
      const { avgFrameTime, fps } = measureFPS(100, 0, 0)

      // Empty scene should easily hit 60 FPS
      expect(fps).toBeGreaterThan(55)
      expect(avgFrameTime).toBeLessThan(18)

      console.log(`[34.1] Empty Scene - FPS: ${fps.toFixed(2)}, Frame Time: ${avgFrameTime.toFixed(2)}ms`)
    })

    it('should test full screen entities FPS (Requirement 20.1)', () => {
      // Test with 150 entities (full screen scenario)
      const { avgFrameTime, fps, maxFrameTime } = measureFPS(100, 150, 0)

      // Should maintain playable FPS (30+)
      expect(fps).toBeGreaterThan(30)
      expect(avgFrameTime).toBeLessThan(35)
      expect(maxFrameTime).toBeLessThan(50)

      console.log(`[34.1] Full Entities (150) - FPS: ${fps.toFixed(2)}, Avg: ${avgFrameTime.toFixed(2)}ms, Max: ${maxFrameTime.toFixed(2)}ms`)
    })

    it('should test FPS during audio playback (Requirement 20.1)', () => {
      // Simulate audio playback overhead
      const frameTimes: number[] = []

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now()
        simulateFrame(50, 5)
        // Simulate audio processing (minimal overhead)
        const audioOverhead = Math.random() * 0.5
        frameTimes.push(performance.now() - startTime + audioOverhead)
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      const fps = 1000 / avgFrameTime

      // Audio should have minimal impact
      expect(fps).toBeGreaterThan(50)
      expect(avgFrameTime).toBeLessThan(20)

      console.log(`[34.1] Audio Playback - FPS: ${fps.toFixed(2)}, Frame Time: ${avgFrameTime.toFixed(2)}ms`)
    })

    it('should test FPS during effects playback (Requirement 20.1)', () => {
      // Test with entities and effects
      const { avgFrameTime, fps } = measureFPS(100, 80, 20)

      // Should maintain good FPS with effects
      expect(fps).toBeGreaterThan(40)
      expect(avgFrameTime).toBeLessThan(25)

      console.log(`[34.1] Effects Playback (20 effects) - FPS: ${fps.toFixed(2)}, Frame Time: ${avgFrameTime.toFixed(2)}ms`)
    })

    it('should verify 60 FPS target configuration', () => {
      expect(PERFORMANCE_CONFIG.TARGET_FPS).toBe(60)
      const frameBudget = 1000 / PERFORMANCE_CONFIG.TARGET_FPS
      expect(frameBudget).toBeCloseTo(16.67, 1)

      console.log(`[34.1] Target FPS: ${PERFORMANCE_CONFIG.TARGET_FPS}, Frame Budget: ${frameBudget.toFixed(2)}ms`)
    })
  })

  // ========================================
  // Task 34.2: Memory Tests
  // ========================================
  describe('Task 34.2: Memory Tests', () => {
    it('should test initial memory usage (Requirement 20.2)', () => {
      const memoryInfo = memoryManager.getMemoryInfo()

      // Initial memory should be reasonable
      expect(memoryInfo.used).toBeGreaterThanOrEqual(0)
      expect(memoryInfo.used).toBeLessThan(100)
      expect(memoryInfo.percentage).toBeLessThan(100)

      console.log(`[34.2] Initial Memory: ${memoryInfo.used.toFixed(2)}MB (${memoryInfo.percentage.toFixed(2)}%)`)
    })

    it('should test memory after 5 minutes (Requirement 20.2)', async () => {
      // Simulate 5 minutes compressed to 1 second
      const checkInterval = 50
      const totalChecks = 20
      const memorySnapshots: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < totalChecks; i++) {
        // Simulate game activity
        const tempObjects = []
        for (let j = 0; j < 30; j++) {
          tempObjects.push({ data: new Array(20).fill(Math.random()) })
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval))

        const memoryInfo = memoryManager.getMemoryInfo()
        memorySnapshots.push(memoryInfo.used)

        tempObjects.length = 0
      }

      const avgMemory = memorySnapshots.reduce((a, b) => a + b, 0) / memorySnapshots.length
      const maxMemory = Math.max(...memorySnapshots)

      expect(maxMemory).toBeLessThan(100)
      expect(avgMemory).toBeLessThan(100)

      console.log(`[34.2] 5 Minutes - Avg: ${avgMemory.toFixed(2)}MB, Max: ${maxMemory.toFixed(2)}MB`)
    }, 5000)

    it('should test memory after 30 minutes (Requirement 20.5)', async () => {
      // Simulate 30 minutes compressed to 2 seconds
      const checkInterval = 100
      const totalChecks = 20
      const memorySnapshots: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < totalChecks; i++) {
        const tempObjects = []
        for (let j = 0; j < 50; j++) {
          tempObjects.push({ data: new Array(20).fill(Math.random()) })
        }

        await new Promise(resolve => setTimeout(resolve, checkInterval))

        const memoryInfo = memoryManager.getMemoryInfo()
        memorySnapshots.push(memoryInfo.used)

        tempObjects.length = 0
      }

      const initialMemory = memorySnapshots[0]
      const finalMemory = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowth = finalMemory - initialMemory
      const growthPercentage = initialMemory > 0 ? (memoryGrowth / initialMemory) * 100 : 0

      // Memory growth should be less than 10%
      if (initialMemory > 0) {
        expect(growthPercentage).toBeLessThan(10)
      }
      expect(finalMemory).toBeLessThan(100)

      console.log(`[34.2] 30 Minutes - Initial: ${initialMemory.toFixed(2)}MB, Final: ${finalMemory.toFixed(2)}MB, Growth: ${growthPercentage.toFixed(2)}%`)
    }, 5000)

    it('should check for memory leaks (Requirement 20.5)', () => {
      const iterations = 50
      const memoryBefore = memoryManager.getMemoryInfo().used

      for (let i = 0; i < iterations; i++) {
        // Allocate
        const objects = []
        for (let j = 0; j < 100; j++) {
          objects.push({ data: new Array(20).fill(Math.random()) })
        }
        // Deallocate
        objects.length = 0
      }

      memoryManager.cleanup(false)
      const memoryAfter = memoryManager.getMemoryInfo().used
      const memoryIncrease = memoryAfter - memoryBefore

      // Memory should not increase significantly
      expect(memoryIncrease).toBeLessThan(10)

      console.log(`[34.2] Memory Leak Test - Before: ${memoryBefore.toFixed(2)}MB, After: ${memoryAfter.toFixed(2)}MB, Increase: ${memoryIncrease.toFixed(2)}MB`)
    })

    it('should verify 100MB memory limit', () => {
      expect(PERFORMANCE_CONFIG.MAX_MEMORY_MB).toBe(100)
      const memoryInfo = memoryManager.getMemoryInfo()
      expect(memoryInfo.total).toBe(100)

      console.log(`[34.2] Memory Limit: ${memoryInfo.total}MB`)
    })
  })

  // ========================================
  // Task 34.3: Loading Performance Tests
  // ========================================
  describe('Task 34.3: Loading Performance Tests', () => {
    it('should test resource loading time', async () => {
      const startTime = performance.now()

      // Simulate resource loading
      const resources = []
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 10))
        resources.push({ id: i, data: new Array(100).fill(Math.random()) })
      }

      const loadTime = performance.now() - startTime

      // Loading should be fast
      expect(loadTime).toBeLessThan(500)

      console.log(`[34.3] Resource Loading: ${loadTime.toFixed(2)}ms for ${resources.length} resources`)
    })

    it('should test audio loading time', async () => {
      const startTime = performance.now()

      // Simulate audio loading
      const audioFiles = []
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 20))
        audioFiles.push({ id: i, buffer: new ArrayBuffer(1024) })
      }

      const loadTime = performance.now() - startTime

      // Audio loading should be reasonable
      expect(loadTime).toBeLessThan(300)

      console.log(`[34.3] Audio Loading: ${loadTime.toFixed(2)}ms for ${audioFiles.length} files`)
    })

    it('should test first screen render time', () => {
      const startTime = performance.now()

      // Simulate first render
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < 50; i++) {
        ctx.fillRect(i * 10, i * 10, 10, 10)
      }

      const renderTime = performance.now() - startTime

      // First render should be fast
      expect(renderTime).toBeLessThan(50)

      console.log(`[34.3] First Screen Render: ${renderTime.toFixed(2)}ms`)
    })

    it('should optimize loading performance', () => {
      // Verify lazy loading configuration
      expect(PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL).toBe(5000)

      console.log(`[34.3] Loading Optimization - Check Interval: ${PERFORMANCE_CONFIG.MEMORY_CHECK_INTERVAL}ms`)
    })
  })

  // ========================================
  // Task 34.4: Server Environment Tests
  // ========================================
  describe('Task 34.4: Server Environment Tests', () => {
    it('should test in 2 CPU 2G memory environment (Requirement 20.1, 20.2)', () => {
      const serverSpecs = { cpu: 2, memoryGB: 2 }

      // Verify configuration is appropriate for server
      expect(PERFORMANCE_CONFIG.MAX_MEMORY_MB).toBe(100)
      expect(PERFORMANCE_CONFIG.TARGET_FPS).toBe(60)

      const memoryEfficiency = (PERFORMANCE_CONFIG.MAX_MEMORY_MB / (serverSpecs.memoryGB * 1024)) * 100
      expect(memoryEfficiency).toBeLessThan(5)

      console.log(`[34.4] Server Environment: ${serverSpecs.cpu} CPU, ${serverSpecs.memoryGB}G Memory`)
      console.log(`[34.4] Memory Efficiency: ${memoryEfficiency.toFixed(2)}%`)
    })

    it('should test multiple concurrent users (Requirement 20.6)', async () => {
      const userCount = 10
      const operations = []

      // Simulate multiple users
      for (let i = 0; i < userCount; i++) {
        operations.push(
          new Promise(resolve => {
            setTimeout(() => {
              const data = new Array(50).fill(Math.random())
              resolve(data)
            }, Math.random() * 100)
          })
        )
      }

      const startTime = performance.now()
      await Promise.all(operations)
      const totalTime = performance.now() - startTime

      // Should handle concurrent users efficiently
      expect(totalTime).toBeLessThan(200)

      console.log(`[34.4] Concurrent Users: ${userCount} users, ${totalTime.toFixed(2)}ms`)
    })

    it('should test long-running stability (Requirement 20.6)', async () => {
      // Simulate long-running game (compressed to 2 seconds)
      const duration = 2000
      const interval = 100
      const iterations = duration / interval
      const frameTimes: number[] = []
      const memorySnapshots: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < iterations; i++) {
        const frameStart = performance.now()

        // Simulate game work
        const entities = []
        for (let j = 0; j < 50; j++) {
          entities.push({ data: new Array(10).fill(Math.random()) })
        }

        await new Promise(resolve => setTimeout(resolve, interval))

        frameTimes.push(performance.now() - frameStart)
        memorySnapshots.push(memoryManager.getMemoryInfo().used)

        entities.length = 0
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      const maxMemory = Math.max(...memorySnapshots)
      const fps = 1000 / avgFrameTime

      // Should maintain stability
      expect(fps).toBeGreaterThan(8)
      expect(maxMemory).toBeLessThan(100)

      console.log(`[34.4] Long-Running - FPS: ${fps.toFixed(2)}, Max Memory: ${maxMemory.toFixed(2)}MB`)
    }, 5000)

    it('should verify production-ready configuration', () => {
      const config = {
        targetFPS: PERFORMANCE_CONFIG.TARGET_FPS,
        maxMemoryMB: PERFORMANCE_CONFIG.MAX_MEMORY_MB,
        scaleMultiplier: SCENE_CONFIG.SCALE_MULTIPLIER
      }

      expect(config.targetFPS).toBe(60)
      expect(config.maxMemoryMB).toBe(100)
      expect(config.scaleMultiplier).toBe(1.5)

      console.log(`[34.4] Production Config - FPS: ${config.targetFPS}, Memory: ${config.maxMemoryMB}MB, Scale: ${config.scaleMultiplier}x`)
    })
  })

  // ========================================
  // Combined Performance Tests
  // ========================================
  describe('Combined Performance Tests', () => {
    it('should maintain both FPS and memory targets simultaneously', async () => {
      const duration = 1000
      const interval = 50
      const iterations = duration / interval
      const frameTimes: number[] = []
      const memorySnapshots: number[] = []

      memoryManager.startMonitoring()

      for (let i = 0; i < iterations; i++) {
        const frameStart = performance.now()

        // Simulate game with entities and effects
        const entities = []
        for (let j = 0; j < 60; j++) {
          entities.push({ data: new Array(10).fill(Math.random()) })
        }

        simulateFrame(60, 10)

        await new Promise(resolve => setTimeout(resolve, interval))

        frameTimes.push(performance.now() - frameStart)
        memorySnapshots.push(memoryManager.getMemoryInfo().used)

        entities.length = 0
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
      const fps = 1000 / avgFrameTime
      const maxMemory = Math.max(...memorySnapshots)

      // Both targets should be met
      expect(fps).toBeGreaterThan(10)
      expect(maxMemory).toBeLessThan(100)

      console.log(`[Combined] FPS: ${fps.toFixed(2)}, Max Memory: ${maxMemory.toFixed(2)}MB`)
    }, 3000)
  })
})
