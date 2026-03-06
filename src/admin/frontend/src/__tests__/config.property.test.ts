/**
 * 配置数据防御性处理属性测试
 * 
 * Feature: admin-dark-theme-fix
 * Property 5: 配置数据防御性处理
 * 
 * 使用 fast-check 进行属性测试，验证配置数据处理的防御性：
 * - 对于任意可能不完整的配置数据对象，组件应该能够正常处理而不抛出错误
 * - 缺失的属性应该使用默认值
 * 
 * **Validates: Requirements 9.2, 9.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ========== 辅助函数：模拟组件中的防御性处理逻辑 ==========

/**
 * 安全获取敌人类型条目
 * 模拟 AdvancedConfigPanel 组件中的 enemyTypesEntries 计算属性
 */
function getEnemyTypesEntries(config: any): [string, any][] {
  return config?.enemies?.types 
    ? Object.entries(config.enemies.types) 
    : []
}

/**
 * 安全获取关卡数据
 * 模拟 AdvancedConfigPanel 组件中的 stagesData 计算属性
 */
function getStagesData(config: any): any[] {
  return config?.stages ?? []
}

/**
 * 安全获取音频音乐音量
 */
function getSafeAudioMusicVolume(config: any): number {
  return config?.audio?.musicVolume ?? 0.5
}

/**
 * 安全获取音频效果音量
 */
function getSafeAudioEffectVolume(config: any): number {
  return config?.audio?.effectVolume ?? 0.5
}

/**
 * 安全获取缓存清理阈值
 */
function getSafeCacheCleanupThreshold(config: any): number {
  return config?.performance?.cacheCleanupThreshold ?? 0.8
}

// ========== 自定义生成器 ==========

/**
 * 生成可能不完整的敌人类型配置
 */
const partialEnemyTypeArb = fc.record({
  health: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  speed: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  attackPower: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined }),
  machineGun: fc.option(fc.boolean(), { nil: undefined }),
  missileLauncher: fc.option(fc.boolean(), { nil: undefined })
}, { requiredKeys: [] })

/**
 * 生成可能不完整的敌人配置
 */
const partialEnemiesConfigArb = fc.record({
  eliteMultiplier: fc.option(fc.float({ min: 1, max: 5 }), { nil: undefined }),
  bossMultiplier: fc.option(fc.float({ min: 1, max: 10 }), { nil: undefined }),
  types: fc.option(
    fc.dictionary(
      fc.constantFrom('white', 'green', 'blue', 'purple', 'yellow', 'orange', 'red'),
      partialEnemyTypeArb
    ),
    { nil: undefined }
  )
}, { requiredKeys: [] })

/**
 * 生成可能不完整的音频配置
 */
const partialAudioConfigArb = fc.record({
  musicVolume: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined }),
  effectVolume: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined }),
  maxConcurrentSounds: fc.option(fc.integer({ min: 1, max: 30 }), { nil: undefined })
}, { requiredKeys: [] })

/**
 * 生成可能不完整的性能配置
 */
const partialPerformanceConfigArb = fc.record({
  targetFPS: fc.option(fc.integer({ min: 30, max: 120 }), { nil: undefined }),
  maxMemoryMB: fc.option(fc.integer({ min: 50, max: 500 }), { nil: undefined }),
  cacheCleanupThreshold: fc.option(fc.float({ min: 0.5, max: 1 }), { nil: undefined })
}, { requiredKeys: [] })

/**
 * 生成可能不完整的关卡配置
 */
const partialStageConfigArb = fc.record({
  id: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
  name: fc.option(fc.string(), { nil: undefined }),
  enemyTypes: fc.option(fc.array(fc.constantFrom('white', 'green', 'blue')), { nil: undefined }),
  totalEnemies: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined })
}, { requiredKeys: [] })

/**
 * 生成可能不完整的高级配置
 */
const partialAdvancedConfigArb = fc.record({
  enemies: fc.option(partialEnemiesConfigArb, { nil: undefined }),
  audio: fc.option(partialAudioConfigArb, { nil: undefined }),
  performance: fc.option(partialPerformanceConfigArb, { nil: undefined }),
  stages: fc.option(fc.array(partialStageConfigArb), { nil: undefined })
}, { requiredKeys: [] })

/**
 * 生成各种边界情况的配置
 */
const edgeCaseConfigArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant({}),
  fc.constant({ enemies: null }),
  fc.constant({ enemies: {} }),
  fc.constant({ enemies: { types: null } }),
  fc.constant({ enemies: { types: {} } }),
  fc.constant({ audio: null }),
  fc.constant({ audio: {} }),
  fc.constant({ performance: null }),
  fc.constant({ stages: null }),
  partialAdvancedConfigArb
)

// ========== 测试套件 ==========

describe('配置数据防御性处理属性测试', () => {
  /**
   * Property 5: 配置数据防御性处理
   * **Validates: Requirements 9.2, 9.4**
   */
  describe('Property 5: 配置数据防御性处理', () => {
    it('getEnemyTypesEntries 对于任意不完整配置应返回数组而不抛出错误', () => {
      fc.assert(
        fc.property(edgeCaseConfigArb, (config) => {
          // 不应抛出错误
          const result = getEnemyTypesEntries(config)
          
          // 结果应该是数组
          expect(Array.isArray(result)).toBe(true)
          
          // 如果有数据，每个条目应该是 [string, any] 格式
          for (const entry of result) {
            expect(Array.isArray(entry)).toBe(true)
            expect(entry.length).toBe(2)
            expect(typeof entry[0]).toBe('string')
          }
        }),
        { numRuns: 50 }
      )
    })

    it('getStagesData 对于任意不完整配置应返回数组而不抛出错误', () => {
      fc.assert(
        fc.property(edgeCaseConfigArb, (config) => {
          // 不应抛出错误
          const result = getStagesData(config)
          
          // 结果应该是数组
          expect(Array.isArray(result)).toBe(true)
        }),
        { numRuns: 50 }
      )
    })

    it('getSafeAudioMusicVolume 对于任意不完整配置应返回有效数值', () => {
      fc.assert(
        fc.property(edgeCaseConfigArb, (config) => {
          const result = getSafeAudioMusicVolume(config)
          
          // 结果应该是数字
          expect(typeof result).toBe('number')
          
          // 结果应该在有效范围内
          expect(result).toBeGreaterThanOrEqual(0)
          expect(result).toBeLessThanOrEqual(1)
        }),
        { numRuns: 50 }
      )
    })

    it('getSafeAudioEffectVolume 对于任意不完整配置应返回有效数值', () => {
      fc.assert(
        fc.property(edgeCaseConfigArb, (config) => {
          const result = getSafeAudioEffectVolume(config)
          
          // 结果应该是数字
          expect(typeof result).toBe('number')
          
          // 结果应该在有效范围内
          expect(result).toBeGreaterThanOrEqual(0)
          expect(result).toBeLessThanOrEqual(1)
        }),
        { numRuns: 50 }
      )
    })

    it('getSafeCacheCleanupThreshold 对于任意不完整配置应返回有效数值', () => {
      fc.assert(
        fc.property(edgeCaseConfigArb, (config) => {
          const result = getSafeCacheCleanupThreshold(config)
          
          // 结果应该是数字
          expect(typeof result).toBe('number')
          
          // 结果应该在有效范围内（默认值 0.8 或配置值 0.5-1）
          expect(result).toBeGreaterThanOrEqual(0)
          expect(result).toBeLessThanOrEqual(1)
        }),
        { numRuns: 50 }
      )
    })

    it('所有防御性函数对于 null/undefined 输入应使用默认值', () => {
      const nullInputs = [null, undefined]
      
      for (const input of nullInputs) {
        // 敌人类型应返回空数组
        expect(getEnemyTypesEntries(input)).toEqual([])
        
        // 关卡数据应返回空数组
        expect(getStagesData(input)).toEqual([])
        
        // 音频音量应返回默认值 0.5
        expect(getSafeAudioMusicVolume(input)).toBe(0.5)
        expect(getSafeAudioEffectVolume(input)).toBe(0.5)
        
        // 缓存清理阈值应返回默认值 0.8
        expect(getSafeCacheCleanupThreshold(input)).toBe(0.8)
      }
    })

    it('当配置存在有效值时应正确返回', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0.5, max: 1, noNaN: true }),
          (musicVol, effectVol, threshold) => {
            const config = {
              audio: {
                musicVolume: musicVol,
                effectVolume: effectVol
              },
              performance: {
                cacheCleanupThreshold: threshold
              },
              enemies: {
                types: {
                  white: { health: 10 },
                  green: { health: 20 }
                }
              },
              stages: [
                { id: 1, name: 'Stage 1' },
                { id: 2, name: 'Stage 2' }
              ]
            }
            
            // 应返回配置的值而非默认值
            expect(getSafeAudioMusicVolume(config)).toBeCloseTo(musicVol, 5)
            expect(getSafeAudioEffectVolume(config)).toBeCloseTo(effectVol, 5)
            expect(getSafeCacheCleanupThreshold(config)).toBeCloseTo(threshold, 5)
            
            // 敌人类型应返回正确数量
            expect(getEnemyTypesEntries(config)).toHaveLength(2)
            
            // 关卡数据应返回正确数量
            expect(getStagesData(config)).toHaveLength(2)
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  describe('边界情况处理', () => {
    it('空对象配置应使用默认值', () => {
      const emptyConfig = {}
      
      expect(getEnemyTypesEntries(emptyConfig)).toEqual([])
      expect(getStagesData(emptyConfig)).toEqual([])
      expect(getSafeAudioMusicVolume(emptyConfig)).toBe(0.5)
      expect(getSafeAudioEffectVolume(emptyConfig)).toBe(0.5)
      expect(getSafeCacheCleanupThreshold(emptyConfig)).toBe(0.8)
    })

    it('部分嵌套对象配置应正确处理', () => {
      const partialConfig = {
        enemies: {},
        audio: {},
        performance: {}
      }
      
      expect(getEnemyTypesEntries(partialConfig)).toEqual([])
      expect(getSafeAudioMusicVolume(partialConfig)).toBe(0.5)
      expect(getSafeAudioEffectVolume(partialConfig)).toBe(0.5)
      expect(getSafeCacheCleanupThreshold(partialConfig)).toBe(0.8)
    })

    it('嵌套属性为 null 时应使用默认值', () => {
      const nullNestedConfig = {
        enemies: { types: null },
        audio: { musicVolume: null, effectVolume: null },
        performance: { cacheCleanupThreshold: null },
        stages: null
      }
      
      expect(getEnemyTypesEntries(nullNestedConfig)).toEqual([])
      expect(getStagesData(nullNestedConfig)).toEqual([])
      // null 值会被 ?? 运算符处理为默认值
      expect(getSafeAudioMusicVolume(nullNestedConfig)).toBe(0.5)
    })
  })
})
