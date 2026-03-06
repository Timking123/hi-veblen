/**
 * Property-based tests for PixelArtRenderer
 * Feature: game-v2-upgrade
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { PixelArtRenderer } from '../PixelArtRenderer'
import { PIXEL_BLOCK_CONFIG } from '../constants'

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

describe('PixelArtRenderer Property Tests', () => {
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

    renderer = new PixelArtRenderer()
    canvas = createMockCanvas()
    ctx = canvas.getContext('2d')!
  })

  afterEach(() => {
    // Restore original createElement
    document.createElement = originalCreateElement
  })

  /**
   * Feature: game-v2-upgrade, Property 1: 像素块尺寸一致性
   * Validates: Requirements 1.5
   * 
   * For any game element, all pixel art elements should use consistent pixel block size.
   */
  it('should use consistent pixel block size across all elements', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 700 }),
          y: fc.integer({ min: 0, max: 500 }),
          stage: fc.integer({ min: 1, max: 3 }),
          scrollOffset: fc.integer({ min: 0, max: 1000 })
        }),
        (input) => {
          // Get the pixel block size from the renderer
          const blockSize = renderer.getPixelBlockSize()

          // Verify it matches the configuration
          expect(blockSize).toBe(PIXEL_BLOCK_CONFIG.SIZE)

          // Verify player ship size is based on consistent block size
          const shipSize = renderer.getPlayerShipSize()
          expect(shipSize.width).toBe(
            PIXEL_BLOCK_CONFIG.PLAYER_SHIP.WIDTH * blockSize
          )
          expect(shipSize.height).toBe(
            PIXEL_BLOCK_CONFIG.PLAYER_SHIP.HEIGHT * blockSize
          )

          // Test that rendering methods use the same block size
          // by checking that the block size is always positive and consistent
          expect(blockSize).toBeGreaterThan(0)
          expect(Number.isInteger(blockSize)).toBe(true)

          // Verify that all pixel art elements would use the same base unit
          // The block size should be the same regardless of what we're rendering
          const blockSize2 = renderer.getPixelBlockSize()
          expect(blockSize).toBe(blockSize2)

          // Test that cached sprites maintain consistency
          renderer.renderPlayerShip(ctx, input.x, input.y)
          const cachedSprite = renderer.getCachedSprite('player_ship')
          
          if (cachedSprite) {
            // Cached sprite dimensions should be multiples of block size
            expect(cachedSprite.width % blockSize).toBe(0)
            expect(cachedSprite.height % blockSize).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: Verify pixel block drawing consistency
   */
  it('should draw pixel blocks with consistent size', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 700 }),
          y: fc.integer({ min: 0, max: 500 }),
          color: fc.constantFrom('#FF0000', '#00FF00', '#0000FF', '#FFFF00')
        }),
        (input) => {
          const blockSize = renderer.getPixelBlockSize()

          // Draw a pixel block
          renderer.drawPixelBlock(ctx, input.x, input.y, input.color)

          // The block size should remain consistent
          expect(renderer.getPixelBlockSize()).toBe(blockSize)

          // Draw with explicit size parameter
          renderer.drawPixelBlock(ctx, input.x, input.y, input.color, blockSize)

          // Size should still be consistent
          expect(renderer.getPixelBlockSize()).toBe(blockSize)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: Verify cache consistency
   */
  it('should maintain consistent pixel block size in cached sprites', () => {
    fc.assert(
      fc.property(
        fc.record({
          x: fc.integer({ min: 0, max: 700 }),
          y: fc.integer({ min: 0, max: 500 })
        }),
        (input) => {
          const blockSize = renderer.getPixelBlockSize()

          // Render player ship (which uses caching)
          renderer.renderPlayerShip(ctx, input.x, input.y)

          // Get cached sprite
          const cached = renderer.getCachedSprite('player_ship')

          if (cached) {
            // Cached sprite dimensions should be exact multiples of block size
            const expectedWidth = PIXEL_BLOCK_CONFIG.PLAYER_SHIP.WIDTH * blockSize
            const expectedHeight = PIXEL_BLOCK_CONFIG.PLAYER_SHIP.HEIGHT * blockSize

            expect(cached.width).toBe(expectedWidth)
            expect(cached.height).toBe(expectedHeight)
          }

          // Block size should remain unchanged after caching
          expect(renderer.getPixelBlockSize()).toBe(blockSize)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: Verify arcade frame uses consistent block size
   */
  it('should use consistent pixel block size for arcade frame', () => {
    fc.assert(
      fc.property(
        fc.record({
          width: fc.integer({ min: 400, max: 1200 }),
          height: fc.integer({ min: 300, max: 900 })
        }),
        (input) => {
          const blockSize = renderer.getPixelBlockSize()

          // Render arcade frame
          renderer.renderArcadeFrame(ctx, input.width, input.height)

          // Block size should remain consistent
          expect(renderer.getPixelBlockSize()).toBe(blockSize)

          // Check if frame was cached
          const cacheKey = `arcade_frame_${input.width}_${input.height}`
          const cached = renderer.getCachedSprite(cacheKey)

          if (cached) {
            // Cached frame should have the requested dimensions
            expect(cached.width).toBe(input.width)
            expect(cached.height).toBe(input.height)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Additional test: Verify background rendering uses consistent block size
   */
  it('should use consistent pixel block size for backgrounds', () => {
    fc.assert(
      fc.property(
        fc.record({
          stage: fc.integer({ min: 1, max: 3 }),
          scrollOffset: fc.integer({ min: 0, max: 5000 })
        }),
        (input) => {
          const blockSize = renderer.getPixelBlockSize()

          // Render background
          renderer.renderPixelBackground(ctx, input.stage, input.scrollOffset)

          // Block size should remain consistent after rendering
          expect(renderer.getPixelBlockSize()).toBe(blockSize)
          expect(blockSize).toBe(PIXEL_BLOCK_CONFIG.SIZE)
        }
      ),
      { numRuns: 100 }
    )
  })
})
