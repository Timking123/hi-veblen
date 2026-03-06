/**
 * Pickup 属性测试
 * 
 * 验证掉落物渲染系统的正确性属性
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Pickup } from '../Pickup'
import { PickupType } from '../../types'
import { PIXEL_BLOCK_CONFIG } from '../../constants'

// Mock Canvas 2D Context for testing
function createMockContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    canvas: { width: 800, height: 600 }
  } as unknown as CanvasRenderingContext2D
}

function createMockCanvas(): HTMLCanvasElement {
  const canvas = {
    width: 800,
    height: 600,
    getContext: vi.fn(() => createMockContext())
  } as unknown as HTMLCanvasElement

  return canvas
}

describe('Pickup Rendering Property Tests', () => {
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    // Mock document.createElement to return mock canvases
    originalCreateElement = document.createElement
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return createMockCanvas()
      }
      return originalCreateElement.call(document, tagName)
    }) as any

    canvas = createMockCanvas()
    ctx = canvas.getContext('2d')!
  })

  afterEach(() => {
    // Restore original createElement
    document.createElement = originalCreateElement
  })

  describe('属性 4: 掉落物尺寸一致性', () => {
    /**
     * Feature: game-v2-upgrade, Property 4: 掉落物尺寸一致性
     * 
     * *对于任何*掉落物类型，渲染尺寸应该为 4x4 像素块。
     * 
     * **验证需求: 3.1**
     */
    it('should have consistent 4x4 pixel block size for all pickup types', () => {
      const pickupTypes = [
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.REPAIR,
        PickupType.ENGINE
      ]

      const expectedSize = PIXEL_BLOCK_CONFIG.PICKUP * PIXEL_BLOCK_CONFIG.SIZE

      pickupTypes.forEach(type => {
        const pickup = new Pickup(type, 100, 100)
        
        // 验证宽度和高度都是 4x4 像素块
        expect(pickup.width).toBe(expectedSize)
        expect(pickup.height).toBe(expectedSize)
        
        // 验证宽度等于高度（正方形）
        expect(pickup.width).toBe(pickup.height)
      })
    })

    it('should use PIXEL_BLOCK_CONFIG.PICKUP constant for size', () => {
      // 验证常量值为 4（4x4 像素块）
      expect(PIXEL_BLOCK_CONFIG.PICKUP).toBe(4)
      
      // 验证像素块大小为 8
      expect(PIXEL_BLOCK_CONFIG.SIZE).toBe(8)
      
      // 验证实际尺寸为 32 像素（4 * 8）
      const expectedSize = 4 * 8
      const pickup = new Pickup(PickupType.REPAIR, 0, 0)
      expect(pickup.width).toBe(expectedSize)
      expect(pickup.height).toBe(expectedSize)
    })

    it('should maintain size consistency across multiple instances', () => {
      const pickups = [
        new Pickup(PickupType.MACHINEGUN_BULLETS, 0, 0),
        new Pickup(PickupType.MISSILE_COUNT, 50, 50),
        new Pickup(PickupType.REPAIR, 100, 100),
        new Pickup(PickupType.ENGINE, 150, 150)
      ]

      const firstSize = pickups[0].width

      pickups.forEach(pickup => {
        expect(pickup.width).toBe(firstSize)
        expect(pickup.height).toBe(firstSize)
      })
    })

    it('should not change size after creation', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      const initialWidth = pickup.width
      const initialHeight = pickup.height

      // 更新掉落物（模拟游戏循环）
      pickup.update(16)
      pickup.update(16)
      pickup.update(16)

      // 尺寸应该保持不变
      expect(pickup.width).toBe(initialWidth)
      expect(pickup.height).toBe(initialHeight)
    })
  })

  describe('属性 5: 掉落物类型可区分性', () => {
    /**
     * Feature: game-v2-upgrade, Property 5: 掉落物类型可区分性
     * 
     * *对于任何*两种不同类型的掉落物，它们的颜色或图标应该不同，以便玩家区分。
     * 
     * **验证需求: 3.2**
     */
    it('should have different colors for different pickup categories', () => {
      // 创建不同类别的掉落物
      const machineGunPickup = new Pickup(PickupType.MACHINEGUN_BULLETS, 0, 0)
      const missilePickup = new Pickup(PickupType.MISSILE_COUNT, 0, 0)
      const repairPickup = new Pickup(PickupType.REPAIR, 0, 0)
      const enginePickup = new Pickup(PickupType.ENGINE, 0, 0)

      // 监视 fillStyle 的设置
      const fillStyles = new Set<string>()
      
      // 创建新的 mock context 来捕获 fillStyle
      const captureCtx = createMockContext()
      Object.defineProperty(captureCtx, 'fillStyle', {
        set(value: string) {
          fillStyles.add(value)
        },
        get() {
          return '#000000'
        }
      })

      // 渲染所有掉落物
      machineGunPickup.render(captureCtx)
      const machineGunColors = new Set(fillStyles)
      fillStyles.clear()

      missilePickup.render(captureCtx)
      const missileColors = new Set(fillStyles)
      fillStyles.clear()

      repairPickup.render(captureCtx)
      const repairColors = new Set(fillStyles)
      fillStyles.clear()

      enginePickup.render(captureCtx)
      const engineColors = new Set(fillStyles)

      // 验证每个类别至少使用了一些颜色
      expect(machineGunColors.size).toBeGreaterThan(0)
      expect(missileColors.size).toBeGreaterThan(0)
      expect(repairColors.size).toBeGreaterThan(0)
      expect(engineColors.size).toBeGreaterThan(0)

      // 验证不同类别使用了不同的颜色
      // 至少有一个颜色是不同的
      const allColors = [
        ...Array.from(machineGunColors),
        ...Array.from(missileColors),
        ...Array.from(repairColors),
        ...Array.from(engineColors)
      ]
      const uniqueColors = new Set(allColors)
      
      // 应该有多种不同的颜色
      expect(uniqueColors.size).toBeGreaterThan(4)
    })

    it('should use distinct icon types for different categories', () => {
      // 通过检查渲染调用来验证不同的图标类型
      const fillRectCalls: Array<{ x: number; y: number; width: number; height: number }> = []
      
      // 创建 mock context 并监视 fillRect 调用
      const mockCtx = createMockContext()
      mockCtx.fillRect = vi.fn((x: number, y: number, width: number, height: number) => {
        fillRectCalls.push({ x, y, width, height })
      })

      // 渲染机炮掉落物（子弹图标）
      const machineGunPickup = new Pickup(PickupType.MACHINEGUN_BULLETS, 0, 0)
      machineGunPickup.render(mockCtx)
      const machineGunPattern = fillRectCalls.map(c => `${c.x},${c.y}`).join('|')
      fillRectCalls.length = 0

      // 渲染导弹掉落物（导弹图标）
      const missilePickup = new Pickup(PickupType.MISSILE_COUNT, 0, 0)
      missilePickup.render(mockCtx)
      const missilePattern = fillRectCalls.map(c => `${c.x},${c.y}`).join('|')
      fillRectCalls.length = 0

      // 渲染维修掉落物（心形图标）
      const repairPickup = new Pickup(PickupType.REPAIR, 0, 0)
      repairPickup.render(mockCtx)
      const repairPattern = fillRectCalls.map(c => `${c.x},${c.y}`).join('|')
      fillRectCalls.length = 0

      // 渲染引擎掉落物（齿轮图标）
      const enginePickup = new Pickup(PickupType.ENGINE, 0, 0)
      enginePickup.render(mockCtx)
      const enginePattern = fillRectCalls.map(c => `${c.x},${c.y}`).join('|')

      // 验证不同类型有不同的渲染模式
      expect(machineGunPattern).not.toBe(missilePattern)
      expect(machineGunPattern).not.toBe(repairPattern)
      expect(machineGunPattern).not.toBe(enginePattern)
      expect(missilePattern).not.toBe(repairPattern)
      expect(missilePattern).not.toBe(enginePattern)
      expect(repairPattern).not.toBe(enginePattern)
    })

    it('should render within 4x4 pixel block bounds', () => {
      const pickupTypes = [
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MISSILE_COUNT,
        PickupType.REPAIR,
        PickupType.ENGINE
      ]

      pickupTypes.forEach(type => {
        const pickup = new Pickup(type, 100, 100)
        const fillRectCalls: Array<{ x: number; y: number; width: number; height: number }> = []
        
        // 创建 mock context 并监视 fillRect 调用
        const mockCtx = createMockContext()
        mockCtx.fillRect = vi.fn((x: number, y: number, width: number, height: number) => {
          fillRectCalls.push({ x, y, width, height })
        })

        pickup.render(mockCtx)

        // 验证所有像素块都在 4x4 范围内
        const maxX = 100 + PIXEL_BLOCK_CONFIG.PICKUP * PIXEL_BLOCK_CONFIG.SIZE
        const maxY = 100 + PIXEL_BLOCK_CONFIG.PICKUP * PIXEL_BLOCK_CONFIG.SIZE

        fillRectCalls.forEach(call => {
          expect(call.x).toBeGreaterThanOrEqual(100)
          expect(call.x).toBeLessThan(maxX)
          expect(call.y).toBeGreaterThanOrEqual(100)
          expect(call.y).toBeLessThan(maxY)
        })
      })
    })

    it('should use pixel block size for all rendered blocks', () => {
      const pickup = new Pickup(PickupType.REPAIR, 0, 0)
      const fillRectCalls: Array<{ x: number; y: number; width: number; height: number }> = []
      
      // 创建 mock context 并监视 fillRect 调用
      const mockCtx = createMockContext()
      mockCtx.fillRect = vi.fn((x: number, y: number, width: number, height: number) => {
        fillRectCalls.push({ x, y, width, height })
      })

      pickup.render(mockCtx)

      // 验证所有渲染的块都使用相同的像素块大小
      const blockSize = PIXEL_BLOCK_CONFIG.SIZE
      fillRectCalls.forEach(call => {
        expect(call.width).toBe(blockSize)
        expect(call.height).toBe(blockSize)
      })
    })
  })

  describe('掉落物渲染集成', () => {
    it('should render all pickup types without errors', () => {
      const pickupTypes = [
        PickupType.MACHINEGUN_BULLETS,
        PickupType.MACHINEGUN_TRAJECTORY,
        PickupType.MACHINEGUN_FIRERATE,
        PickupType.MACHINEGUN_DAMAGE,
        PickupType.MACHINEGUN_SPEED,
        PickupType.MISSILE_COUNT,
        PickupType.MISSILE_DAMAGE,
        PickupType.MISSILE_SPEED,
        PickupType.REPAIR,
        PickupType.ENGINE
      ]

      pickupTypes.forEach(type => {
        const pickup = new Pickup(type, 100, 100)
        const mockCtx = createMockContext()
        
        // 应该能够渲染而不抛出错误
        expect(() => pickup.render(mockCtx)).not.toThrow()
      })
    })

    it('should maintain visual consistency across multiple renders', () => {
      const pickup = new Pickup(PickupType.REPAIR, 100, 100)
      
      // 第一次渲染
      const fillRectCalls1: Array<{ x: number; y: number; width: number; height: number }> = []
      const mockCtx1 = createMockContext()
      mockCtx1.fillRect = vi.fn((x: number, y: number, width: number, height: number) => {
        fillRectCalls1.push({ x, y, width, height })
      })
      pickup.render(mockCtx1)

      // 第二次渲染
      const fillRectCalls2: Array<{ x: number; y: number; width: number; height: number }> = []
      const mockCtx2 = createMockContext()
      mockCtx2.fillRect = vi.fn((x: number, y: number, width: number, height: number) => {
        fillRectCalls2.push({ x, y, width, height })
      })
      pickup.render(mockCtx2)

      // 两次渲染应该产生相同的结果
      expect(fillRectCalls1.length).toBe(fillRectCalls2.length)
      fillRectCalls1.forEach((call1, index) => {
        const call2 = fillRectCalls2[index]
        expect(call1.x).toBe(call2.x)
        expect(call1.y).toBe(call2.y)
        expect(call1.width).toBe(call2.width)
        expect(call1.height).toBe(call2.height)
      })
    })

    it('should render at correct position', () => {
      const testPositions = [
        { x: 0, y: 0 },
        { x: 100, y: 200 },
        { x: 500, y: 300 }
      ]

      testPositions.forEach(pos => {
        const pickup = new Pickup(PickupType.REPAIR, pos.x, pos.y)
        const fillRectCalls: Array<{ x: number; y: number }> = []
        
        const mockCtx = createMockContext()
        mockCtx.fillRect = vi.fn((x: number, y: number, width: number, height: number) => {
          fillRectCalls.push({ x, y })
        })

        pickup.render(mockCtx)

        // 所有渲染的块应该在掉落物位置附近
        const maxX = pos.x + PIXEL_BLOCK_CONFIG.PICKUP * PIXEL_BLOCK_CONFIG.SIZE
        const maxY = pos.y + PIXEL_BLOCK_CONFIG.PICKUP * PIXEL_BLOCK_CONFIG.SIZE

        fillRectCalls.forEach(call => {
          expect(call.x).toBeGreaterThanOrEqual(pos.x)
          expect(call.x).toBeLessThan(maxX)
          expect(call.y).toBeGreaterThanOrEqual(pos.y)
          expect(call.y).toBeLessThan(maxY)
        })
      })
    })
  })

  describe('边界情况', () => {
    it('should handle rendering at canvas edges', () => {
      const edgePositions = [
        { x: 0, y: 0 },
        { x: canvas.width - 32, y: 0 },
        { x: 0, y: canvas.height - 32 },
        { x: canvas.width - 32, y: canvas.height - 32 }
      ]

      edgePositions.forEach(pos => {
        const pickup = new Pickup(PickupType.REPAIR, pos.x, pos.y)
        const mockCtx = createMockContext()
        expect(() => pickup.render(mockCtx)).not.toThrow()
      })
    })

    it('should handle same type pickups with different positions', () => {
      const pickup1 = new Pickup(PickupType.REPAIR, 100, 100)
      const pickup2 = new Pickup(PickupType.REPAIR, 200, 200)

      // 应该有相同的尺寸
      expect(pickup1.width).toBe(pickup2.width)
      expect(pickup1.height).toBe(pickup2.height)

      // 但位置不同
      expect(pickup1.x).not.toBe(pickup2.x)
      expect(pickup1.y).not.toBe(pickup2.y)
    })
  })
})
