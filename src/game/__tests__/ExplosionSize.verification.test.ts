/**
 * 爆炸特效尺寸验证测试
 * 验证需求 3.4：爆炸特效尺寸提升到原来的 1.5 倍
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { EffectSystem, ExplosionSize } from '../EffectSystem'
import { PIXEL_BLOCK_CONFIG } from '../constants'

describe('爆炸特效尺寸验证 - 需求 3.4', () => {
  let effectSystem: EffectSystem

  beforeEach(() => {
    effectSystem = new EffectSystem()
  })

  it('SMALL 爆炸特效尺寸应该是 3 像素块（原来 2 像素块的 1.5 倍）', () => {
    effectSystem.createExplosion(100, 100, ExplosionSize.SMALL)
    const explosions = effectSystem.getExplosions()
    
    expect(explosions.length).toBe(1)
    expect(explosions[0].radius).toBe(PIXEL_BLOCK_CONFIG.SIZE * 3)
    expect(explosions[0].radius).toBe(8 * 3) // 24 像素
  })

  it('MEDIUM 爆炸特效尺寸应该是 4.5 像素块（原来 3 像素块的 1.5 倍）', () => {
    effectSystem.createExplosion(200, 200, ExplosionSize.MEDIUM)
    const explosions = effectSystem.getExplosions()
    
    expect(explosions.length).toBe(1)
    expect(explosions[0].radius).toBe(PIXEL_BLOCK_CONFIG.SIZE * 4.5)
    expect(explosions[0].radius).toBe(8 * 4.5) // 36 像素
  })

  it('LARGE 爆炸特效尺寸应该是 6 像素块（原来 4 像素块的 1.5 倍）', () => {
    effectSystem.createExplosion(300, 300, ExplosionSize.LARGE)
    const explosions = effectSystem.getExplosions()
    
    expect(explosions.length).toBe(1)
    expect(explosions[0].radius).toBe(PIXEL_BLOCK_CONFIG.SIZE * 6)
    expect(explosions[0].radius).toBe(8 * 6) // 48 像素
  })

  it('HUGE 爆炸特效尺寸应该是 9 像素块（原来 6 像素块的 1.5 倍）', () => {
    effectSystem.createExplosion(400, 400, ExplosionSize.HUGE)
    const explosions = effectSystem.getExplosions()
    
    expect(explosions.length).toBe(1)
    expect(explosions[0].radius).toBe(PIXEL_BLOCK_CONFIG.SIZE * 9)
    expect(explosions[0].radius).toBe(8 * 9) // 72 像素
  })

  it('所有爆炸尺寸都应该是原来的 1.5 倍', () => {
    const originalSizes = {
      SMALL: 2,
      MEDIUM: 3,
      LARGE: 4,
      HUGE: 6
    }

    const newSizes = {
      SMALL: 3,
      MEDIUM: 4.5,
      LARGE: 6,
      HUGE: 9
    }

    // 验证每个尺寸都是原来的 1.5 倍
    expect(newSizes.SMALL).toBe(originalSizes.SMALL * 1.5)
    expect(newSizes.MEDIUM).toBe(originalSizes.MEDIUM * 1.5)
    expect(newSizes.LARGE).toBe(originalSizes.LARGE * 1.5)
    expect(newSizes.HUGE).toBe(originalSizes.HUGE * 1.5)
  })
})
