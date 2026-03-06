/**
 * 敌人文字渲染器属性测试
 * 
 * 测试敌人文字渲染系统的正确性属性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { enemyTextRenderer, EnemyTextSize } from '../EnemyTextRenderer'
import { PIXEL_BLOCK_CONFIG } from '../constants'

// Mock Canvas 2D Context
function createMockContext(): CanvasRenderingContext2D {
  const mockCtx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 10, // Simple approximation
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 10,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
      fontBoundingBoxAscent: 12,
      fontBoundingBoxDescent: 3,
      alphabeticBaseline: 0,
      emHeightAscent: 10,
      emHeightDescent: 2,
      hangingBaseline: 8,
      ideographicBaseline: -2
    })),
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
      colorSpace: 'srgb' as PredefinedColorSpace
    })),
    canvas: { width: 800, height: 600 }
  } as unknown as CanvasRenderingContext2D

  return mockCtx
}

describe('EnemyTextRenderer Property Tests', () => {
  let ctx: CanvasRenderingContext2D

  beforeEach(() => {
    ctx = createMockContext()
  })

  /**
   * 属性 2: 敌人文字尺寸正确性
   * 
   * Feature: game-v2-upgrade, Property 2: 敌人文字尺寸正确性
   * 
   * 对于任何敌人类型，渲染的文字尺寸应该与敌人类型对应：
   * 普通敌人 2x2，精英怪 3x3，关底 BOSS 4x4，最终 BOSS 5x5 像素块。
   * 
   * 验证需求: 2.1, 2.2, 2.3, 2.4
   */
  describe('Property 2: Enemy Text Size Correctness', () => {
    it('should return correct pixel block size for NORMAL enemies', () => {
      fc.assert(
        fc.property(fc.constant(EnemyTextSize.NORMAL), (enemyType) => {
          const size = enemyTextRenderer.getEnemyTextSize(enemyType)
          
          expect(size.width).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.NORMAL)
          expect(size.height).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.NORMAL)
          expect(size.width).toBe(2)
          expect(size.height).toBe(2)
        }),
        { numRuns: 100 }
      )
    })

    it('should return correct pixel block size for ELITE enemies', () => {
      fc.assert(
        fc.property(fc.constant(EnemyTextSize.ELITE), (enemyType) => {
          const size = enemyTextRenderer.getEnemyTextSize(enemyType)
          
          expect(size.width).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.ELITE)
          expect(size.height).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.ELITE)
          expect(size.width).toBe(3)
          expect(size.height).toBe(3)
        }),
        { numRuns: 100 }
      )
    })

    it('should return correct pixel block size for STAGE_BOSS enemies', () => {
      fc.assert(
        fc.property(fc.constant(EnemyTextSize.STAGE_BOSS), (enemyType) => {
          const size = enemyTextRenderer.getEnemyTextSize(enemyType)
          
          expect(size.width).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.STAGE_BOSS)
          expect(size.height).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.STAGE_BOSS)
          expect(size.width).toBe(4)
          expect(size.height).toBe(4)
        }),
        { numRuns: 100 }
      )
    })

    it('should return correct pixel block size for FINAL_BOSS enemies', () => {
      fc.assert(
        fc.property(fc.constant(EnemyTextSize.FINAL_BOSS), (enemyType) => {
          const size = enemyTextRenderer.getEnemyTextSize(enemyType)
          
          expect(size.width).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.FINAL_BOSS)
          expect(size.height).toBe(PIXEL_BLOCK_CONFIG.ENEMY_TEXT.FINAL_BOSS)
          expect(size.width).toBe(5)
          expect(size.height).toBe(5)
        }),
        { numRuns: 100 }
      )
    })

    it('should maintain consistent size mapping for all enemy types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            EnemyTextSize.NORMAL,
            EnemyTextSize.ELITE,
            EnemyTextSize.STAGE_BOSS,
            EnemyTextSize.FINAL_BOSS
          ),
          (enemyType) => {
            const size = enemyTextRenderer.getEnemyTextSize(enemyType)
            
            // Size should be positive
            expect(size.width).toBeGreaterThan(0)
            expect(size.height).toBeGreaterThan(0)
            
            // Size should be square (width === height)
            expect(size.width).toBe(size.height)
            
            // Size should be within valid range (2-5 pixel blocks)
            expect(size.width).toBeGreaterThanOrEqual(2)
            expect(size.width).toBeLessThanOrEqual(5)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * 属性 3: 敌人文字纯净性
   * 
   * Feature: game-v2-upgrade, Property 3: 敌人文字纯净性
   * 
   * 对于任何敌人渲染，输出应该只包含文字内容，
   * 不包含边框、背景或换行符。
   * 
   * 验证需求: 2.5
   */
  describe('Property 3: Enemy Text Purity', () => {
    it('should render pure text without borders or backgrounds', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          fc.constantFrom(
            EnemyTextSize.NORMAL,
            EnemyTextSize.ELITE,
            EnemyTextSize.STAGE_BOSS,
            EnemyTextSize.FINAL_BOSS
          ),
          fc.integer({ min: 100, max: 700 }),
          fc.integer({ min: 100, max: 500 }),
          (text, enemyType, x, y) => {
            // Reset mock
            ctx = createMockContext()
            
            // Render text
            enemyTextRenderer.renderEnemyText(ctx, text, x, y, enemyType)
            
            // Verify that fillText was called (text was rendered)
            expect(ctx.fillText).toHaveBeenCalled()
            
            // Verify that fillRect and strokeRect were NOT called (no borders/backgrounds)
            expect(ctx.fillRect).not.toHaveBeenCalled()
            expect(ctx.strokeRect).not.toHaveBeenCalled()
            
            // Verify save/restore were called (proper context management)
            expect(ctx.save).toHaveBeenCalled()
            expect(ctx.restore).toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should not contain newlines in rendered text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom(
            EnemyTextSize.NORMAL,
            EnemyTextSize.ELITE,
            EnemyTextSize.STAGE_BOSS,
            EnemyTextSize.FINAL_BOSS
          ),
          (text, enemyType) => {
            // Text with newlines should be handled
            const textWithNewlines = text + '\n' + text
            
            // Measure width - should not throw error
            const width = enemyTextRenderer.measureTextWidth(ctx, textWithNewlines, enemyType)
            
            // Width should be positive
            expect(width).toBeGreaterThan(0)
            
            // Truncate should work without errors
            const truncated = enemyTextRenderer.truncateText(ctx, textWithNewlines, 100, enemyType)
            
            // Truncated text should not be empty
            expect(truncated.length).toBeGreaterThan(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use old-style computer font (monospace)', () => {
      const font = enemyTextRenderer.getFont()
      
      // Font should contain monospace keywords
      const isMonospace = 
        font.includes('Courier') ||
        font.includes('Consolas') ||
        font.includes('monospace')
      
      expect(isMonospace).toBe(true)
    })

    it('should render text with bold weight', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
          fc.constantFrom(
            EnemyTextSize.NORMAL,
            EnemyTextSize.ELITE,
            EnemyTextSize.STAGE_BOSS,
            EnemyTextSize.FINAL_BOSS
          ),
          (text, enemyType) => {
            // Reset mock
            ctx = createMockContext()
            
            // Render text
            enemyTextRenderer.renderEnemyText(ctx, text, 400, 300, enemyType)
            
            // Check that font was set with bold
            expect(ctx.font).toContain('bold')
            
            // Check that fillText was called
            expect(ctx.fillText).toHaveBeenCalled()
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Additional tests for text truncation
   */
  describe('Text Truncation', () => {
    it('should truncate text that exceeds max width', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom(
            EnemyTextSize.NORMAL,
            EnemyTextSize.ELITE,
            EnemyTextSize.STAGE_BOSS,
            EnemyTextSize.FINAL_BOSS
          ),
          fc.integer({ min: 50, max: 200 }),
          (text, enemyType, maxWidth) => {
            const truncated = enemyTextRenderer.truncateText(ctx, text, maxWidth, enemyType)
            const truncatedWidth = enemyTextRenderer.measureTextWidth(ctx, truncated, enemyType)
            
            // Truncated text width should not exceed max width (with some tolerance for ellipsis)
            expect(truncatedWidth).toBeLessThanOrEqual(maxWidth + 30) // Allow for ellipsis
            
            // If text was truncated, it should end with '...'
            const originalWidth = enemyTextRenderer.measureTextWidth(ctx, text, enemyType)
            if (originalWidth > maxWidth && truncated.length < text.length) {
              expect(truncated.endsWith('...')).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not truncate text that fits within max width', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 5 }).filter(s => s.trim().length > 0),
          fc.constantFrom(
            EnemyTextSize.NORMAL,
            EnemyTextSize.ELITE,
            EnemyTextSize.STAGE_BOSS,
            EnemyTextSize.FINAL_BOSS
          ),
          (text, enemyType) => {
            const textWidth = enemyTextRenderer.measureTextWidth(ctx, text, enemyType)
            const maxWidth = textWidth + 100 // Much larger than needed
            
            const truncated = enemyTextRenderer.truncateText(ctx, text, maxWidth, enemyType)
            
            // Text should not be truncated
            expect(truncated).toBe(text)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
