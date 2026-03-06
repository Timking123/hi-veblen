/**
 * 批量渲染测试
 * 验证批量渲染功能的正确性
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PixelArtRenderer } from '../PixelArtRenderer'

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

// Mock console.log to reduce test output noise
vi.spyOn(console, 'log').mockImplementation(() => {})

describe('批量渲染系统', () => {
  let renderer: PixelArtRenderer
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

    // Create canvas and context
    canvas = createMockCanvas()
    ctx = canvas.getContext('2d')!
    
    // Create renderer (this will trigger preloading with mocked canvases)
    renderer = new PixelArtRenderer()
  })

  afterEach(() => {
    // Restore original createElement
    document.createElement = originalCreateElement
  })

  describe('批次收集', () => {
    it('应该能够添加项到批次队列', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000' })
      renderer.addToBatch('pixel_block', 200, 200, { color: '#00FF00' })
      
      const stats = renderer.getBatchStats()
      expect(stats.totalBatches).toBe(1)
      expect(stats.totalItems).toBe(2)
    })

    it('应该能够收集不同类型的批次', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000' })
      renderer.addToBatch('stars', 200, 200, { color: '#FFFFFF', size: 2 })
      renderer.addToBatch('clouds', 300, 300, { color: '#CCCCCC', width: 40 })
      
      const stats = renderer.getBatchStats()
      expect(stats.totalBatches).toBe(3)
      expect(stats.totalItems).toBe(3)
      
      const types = stats.batchDetails.map(b => b.type)
      expect(types).toContain('pixel_block')
      expect(types).toContain('stars')
      expect(types).toContain('clouds')
    })

    it('应该能够将同类型的项收集到同一批次', () => {
      renderer.addToBatch('stars', 100, 100, { color: '#FFFFFF', size: 1 })
      renderer.addToBatch('stars', 200, 200, { color: '#FFFFFF', size: 2 })
      renderer.addToBatch('stars', 300, 300, { color: '#FFFFFF', size: 1 })
      
      const stats = renderer.getBatchStats()
      expect(stats.totalBatches).toBe(1)
      expect(stats.totalItems).toBe(3)
      expect(stats.batchDetails[0].type).toBe('stars')
      expect(stats.batchDetails[0].itemCount).toBe(3)
    })
  })

  describe('批次渲染', () => {
    it('应该能够渲染批次而不抛出错误', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000' })
      renderer.addToBatch('pixel_block', 200, 200, { color: '#00FF00' })
      
      expect(() => {
        renderer.renderBatches(ctx)
      }).not.toThrow()
    })

    it('渲染后应该清空批次队列', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000' })
      renderer.addToBatch('stars', 200, 200, { color: '#FFFFFF', size: 2 })
      
      const statsBefore = renderer.getBatchStats()
      expect(statsBefore.totalBatches).toBe(2)
      
      renderer.renderBatches(ctx)
      
      const statsAfter = renderer.getBatchStats()
      expect(statsAfter.totalBatches).toBe(0)
      expect(statsAfter.totalItems).toBe(0)
    })

    it('应该能够渲染多种类型的批次', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000', size: 10 })
      renderer.addToBatch('stars', 200, 200, { color: '#FFFFFF', size: 2 })
      renderer.addToBatch('clouds', 300, 300, { color: '#CCCCCC', width: 40 })
      renderer.addToBatch('buildings', 400, 400, { color: '#666666', width: 30, height: 50 })
      
      expect(() => {
        renderer.renderBatches(ctx)
      }).not.toThrow()
    })
  })

  describe('批次清空', () => {
    it('应该能够清空批次队列而不渲染', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000' })
      renderer.addToBatch('stars', 200, 200, { color: '#FFFFFF', size: 2 })
      
      const statsBefore = renderer.getBatchStats()
      expect(statsBefore.totalBatches).toBe(2)
      
      renderer.clearBatches()
      
      const statsAfter = renderer.getBatchStats()
      expect(statsAfter.totalBatches).toBe(0)
      expect(statsAfter.totalItems).toBe(0)
    })
  })

  describe('批次统计', () => {
    it('应该返回正确的批次统计信息', () => {
      renderer.addToBatch('pixel_block', 100, 100, { color: '#FF0000' })
      renderer.addToBatch('pixel_block', 200, 200, { color: '#00FF00' })
      renderer.addToBatch('stars', 300, 300, { color: '#FFFFFF', size: 2 })
      
      const stats = renderer.getBatchStats()
      
      expect(stats.totalBatches).toBe(2)
      expect(stats.totalItems).toBe(3)
      expect(stats.batchDetails).toHaveLength(2)
      
      const pixelBlockBatch = stats.batchDetails.find(b => b.type === 'pixel_block')
      expect(pixelBlockBatch).toBeDefined()
      expect(pixelBlockBatch?.itemCount).toBe(2)
      
      const starsBatch = stats.batchDetails.find(b => b.type === 'stars')
      expect(starsBatch).toBeDefined()
      expect(starsBatch?.itemCount).toBe(1)
    })

    it('空批次队列应该返回零统计', () => {
      const stats = renderer.getBatchStats()
      
      expect(stats.totalBatches).toBe(0)
      expect(stats.totalItems).toBe(0)
      expect(stats.batchDetails).toHaveLength(0)
    })
  })

  describe('背景渲染集成', () => {
    it('应该能够渲染第一关背景而不抛出错误', () => {
      expect(() => {
        renderer.renderPixelBackground(ctx, 1, 0)
      }).not.toThrow()
    })

    it('应该能够渲染第二关背景而不抛出错误', () => {
      expect(() => {
        renderer.renderPixelBackground(ctx, 2, 0)
      }).not.toThrow()
    })

    it('应该能够渲染第三关背景而不抛出错误', () => {
      expect(() => {
        renderer.renderPixelBackground(ctx, 3, 0)
      }).not.toThrow()
    })

    it('背景渲染后批次队列应该被清空', () => {
      renderer.renderPixelBackground(ctx, 1, 0)
      
      const stats = renderer.getBatchStats()
      expect(stats.totalBatches).toBe(0)
      expect(stats.totalItems).toBe(0)
    })
  })

  describe('性能优化验证', () => {
    it('批量渲染应该能够处理大量元素', () => {
      const itemCount = 100
      
      // 添加大量元素到批次
      for (let i = 0; i < itemCount; i++) {
        renderer.addToBatch('pixel_block', i * 10, i * 10, { color: '#FF0000' })
      }
      
      const stats = renderer.getBatchStats()
      expect(stats.totalItems).toBe(itemCount)
      
      // 渲染应该成功完成
      expect(() => {
        renderer.renderBatches(ctx)
      }).not.toThrow()
      
      // 渲染后队列应该被清空
      const statsAfter = renderer.getBatchStats()
      expect(statsAfter.totalItems).toBe(0)
    })
  })
})
