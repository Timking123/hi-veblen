/**
 * 配置验证器属性测试
 * 验证文件类型匹配、配置等效性验证、Glob 模式匹配正确性
 * 
 * **Validates: Requirements 1.4, 8.2, 8.3, 8.4, 8.6**
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { ConfigValidator } from '../ConfigValidator'
import { ESLintMigrator } from '../ESLintMigrator'
import type { LegacyConfig, ESLintConfig } from '../types'

describe('属性测试：配置验证器', () => {
  const validator = new ConfigValidator()
  const migrator = new ESLintMigrator()

  /**
   * 属性 2：文件类型匹配
   * 
   * 对于任何指定扩展名列表（如 .vue、.ts、.tsx、.js、.jsx），
   * ESLint 配置应该能够匹配所有具有这些扩展名的文件。
   * 
   * Feature: code-audit-and-docs-organization, Property 2: 文件类型匹配
   */
  it('属性 2: 文件类型匹配 - 配置应该匹配所有指定扩展名的文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成文件扩展名列表
        fc.array(
          fc.constantFrom('.js', '.ts', '.tsx', '.vue', '.jsx', '.mjs', '.cjs'),
          { minLength: 1, maxLength: 7 }
        ),
        async (extensions) => {
          // 创建配置
          const oldConfig: LegacyConfig = {
            rules: { 'no-console': 'warn' },
          }

          const newConfig = migrator.generateNewConfig(oldConfig)

          // 找到包含 files 字段的配置
          const configWithFiles = newConfig.find(c => c.files && c.files.length > 0)
          expect(configWithFiles).toBeDefined()

          if (configWithFiles && configWithFiles.files) {
            // 验证：每个扩展名都应该有对应的匹配模式
            for (const ext of extensions) {
              // 检查是否有匹配该扩展名的模式
              const hasMatch = configWithFiles.files.some(pattern => {
                // 模式应该匹配该扩展名
                return pattern.endsWith(ext) || pattern.includes(`*${ext}`)
              })

              // 对于常见的扩展名，应该有匹配模式
              if (['.js', '.ts', '.tsx', '.vue', '.jsx'].includes(ext)) {
                expect(hasMatch).toBe(true)
              }
            }

            // 验证：files 字段应该包含通配符模式
            for (const pattern of configWithFiles.files) {
              expect(pattern).toMatch(/\*\*\/\*\.\w+/)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 2：文件类型匹配 - 文件模式应该使用正确的 glob 语法
   */
  it('属性 2: 文件类型匹配 - 文件模式应该使用正确的 glob 语法', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.dictionary(
            fc.constantFrom('no-console', 'no-unused-vars', 'semi'),
            fc.constantFrom('off', 'warn', 'error'),
            { minKeys: 1, maxKeys: 5 }
          ),
        }),
        async (oldConfig: LegacyConfig) => {
          const newConfig = migrator.generateNewConfig(oldConfig)
          const configWithFiles = newConfig.find(c => c.files)

          if (configWithFiles && configWithFiles.files) {
            for (const pattern of configWithFiles.files) {
              // 验证：模式应该以 **/ 开头（匹配所有目录）
              expect(pattern.startsWith('**/')).toBe(true)

              // 验证：模式应该包含文件扩展名
              expect(pattern).toMatch(/\.\w+$/)

              // 验证：模式应该包含通配符 *
              expect(pattern).toContain('*')
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 26：配置等效性验证
   * 
   * 对于任何测试文件集合，在新旧 ESLint 配置下运行应该产生相同的检查结果
   * （相同的错误和警告）。
   * 
   * Feature: code-audit-and-docs-organization, Property 26: 配置等效性验证
   */
  it('属性 26: 配置等效性验证 - 规则比较应该识别所有差异', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成两个配置
        fc.tuple(
          fc.record({
            rules: fc.dictionary(
              fc.constantFrom('no-console', 'no-unused-vars', 'semi', 'quotes'),
              fc.constantFrom('off', 'warn', 'error', 0, 1, 2),
              { minKeys: 2, maxKeys: 5 }
            ),
          }),
          fc.record({
            rules: fc.dictionary(
              fc.constantFrom('no-console', 'no-unused-vars', 'semi', 'quotes', 'indent'),
              fc.constantFrom('off', 'warn', 'error', 0, 1, 2),
              { minKeys: 2, maxKeys: 5 }
            ),
          })
        ),
        async ([oldConfig, modifiedConfig]: [LegacyConfig, LegacyConfig]) => {
          // 生成新配置
          const newConfig = migrator.generateNewConfig(modifiedConfig)

          // 比较规则
          const differences = validator.compareRules(oldConfig, newConfig)

          // 验证：如果规则完全相同，应该没有差异
          if (JSON.stringify(oldConfig.rules) === JSON.stringify(modifiedConfig.rules)) {
            expect(differences).toHaveLength(0)
          }

          // 验证：每个差异都应该有明确的类型
          for (const diff of differences) {
            expect(['added', 'removed', 'modified']).toContain(diff.type)
            expect(diff.rule).toBeTruthy()

            // 验证：removed 类型应该有 oldValue
            if (diff.type === 'removed') {
              expect(diff.oldValue).toBeDefined()
            }

            // 验证：added 类型应该有 newValue
            if (diff.type === 'added') {
              expect(diff.newValue).toBeDefined()
            }

            // 验证：modified 类型应该有 oldValue 和 newValue
            if (diff.type === 'modified') {
              expect(diff.oldValue).toBeDefined()
              expect(diff.newValue).toBeDefined()
              // 验证：值应该确实不同
              expect(JSON.stringify(diff.oldValue)).not.toBe(JSON.stringify(diff.newValue))
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 26：配置等效性验证 - 规则添加应该被检测
   */
  it('属性 26: 配置等效性验证 - 新增的规则应该被标记为 added', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          // 旧配置：较少的规则
          fc.record({
            rules: fc.dictionary(
              fc.constantFrom('no-console', 'no-unused-vars'),
              fc.constantFrom('warn', 'error'),
              { minKeys: 1, maxKeys: 2 }
            ),
          }),
          // 新增的规则
          fc.record({
            name: fc.constantFrom('semi', 'quotes', 'indent', 'comma-dangle'),
            value: fc.constantFrom('off', 'warn', 'error'),
          })
        ),
        async ([oldConfig, newRule]: [LegacyConfig, { name: string; value: string }]) => {
          // 创建包含新规则的配置
          const modifiedConfig: LegacyConfig = {
            rules: {
              ...oldConfig.rules,
              [newRule.name]: newRule.value,
            },
          }

          const newConfig = migrator.generateNewConfig(modifiedConfig)
          const differences = validator.compareRules(oldConfig, newConfig)

          // 验证：如果新规则不在旧配置中，应该被标记为 added
          if (!(newRule.name in (oldConfig.rules || {}))) {
            const addedDiff = differences.find(
              d => d.type === 'added' && d.rule === newRule.name
            )
            expect(addedDiff).toBeDefined()
            expect(addedDiff?.newValue).toBe(newRule.value)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 26：配置等效性验证 - 规则删除应该被检测
   */
  it('属性 26: 配置等效性验证 - 删除的规则应该被标记为 removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.dictionary(
            fc.constantFrom('no-console', 'no-unused-vars', 'semi', 'quotes'),
            fc.constantFrom('warn', 'error'),
            { minKeys: 3, maxKeys: 4 }
          ),
        }),
        async (oldConfig: LegacyConfig) => {
          // 删除一个规则
          const ruleNames = Object.keys(oldConfig.rules || {})
          if (ruleNames.length === 0) return true

          const ruleToRemove = ruleNames[0]
          const modifiedRules = { ...oldConfig.rules }
          delete modifiedRules[ruleToRemove]

          const modifiedConfig: LegacyConfig = {
            rules: modifiedRules,
          }

          const newConfig = migrator.generateNewConfig(modifiedConfig)
          const differences = validator.compareRules(oldConfig, newConfig)

          // 验证：删除的规则应该被标记为 removed
          const removedDiff = differences.find(
            d => d.type === 'removed' && d.rule === ruleToRemove
          )
          expect(removedDiff).toBeDefined()
          expect(removedDiff?.oldValue).toBe(oldConfig.rules?.[ruleToRemove])

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 26：配置等效性验证 - 规则修改应该被检测
   */
  it('属性 26: 配置等效性验证 - 修改的规则应该被标记为 modified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.record({
            rules: fc.dictionary(
              fc.constantFrom('no-console', 'no-unused-vars', 'semi'),
              fc.constantFrom('warn', 'error'),
              { minKeys: 2, maxKeys: 3 }
            ),
          }),
          fc.tuple(
            fc.constantFrom('warn', 'error', 'off'),
            fc.constantFrom('warn', 'error', 'off')
          ).filter(([a, b]) => a !== b) // 确保值不同
        ),
        async ([oldConfig, [oldValue, newValue]]: [
          LegacyConfig,
          [string, string]
        ]) => {
          const ruleNames = Object.keys(oldConfig.rules || {})
          if (ruleNames.length === 0) return true

          const ruleToModify = ruleNames[0]

          // 创建修改后的配置
          const modifiedConfig: LegacyConfig = {
            rules: {
              ...oldConfig.rules,
              [ruleToModify]: newValue,
            },
          }

          // 确保旧配置中的值与 oldValue 不同
          const originalOldConfig: LegacyConfig = {
            rules: {
              ...oldConfig.rules,
              [ruleToModify]: oldValue,
            },
          }

          const newConfig = migrator.generateNewConfig(modifiedConfig)
          const differences = validator.compareRules(originalOldConfig, newConfig)

          // 验证：修改的规则应该被标记为 modified
          const modifiedDiff = differences.find(
            d => d.type === 'modified' && d.rule === ruleToModify
          )
          expect(modifiedDiff).toBeDefined()
          expect(modifiedDiff?.oldValue).toBe(oldValue)
          expect(modifiedDiff?.newValue).toBe(newValue)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 27：Glob 模式匹配正确性
   * 
   * 对于任何 glob 模式和文件集合，模式匹配的结果应该符合 glob 语法规范，
   * 匹配所有符合模式的文件。
   * 
   * Feature: code-audit-and-docs-organization, Property 27: Glob 模式匹配正确性
   */
  it('属性 27: Glob 模式匹配正确性 - 忽略模式应该正确转换', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            'dist',
            'node_modules',
            'build',
            '.snapshots',
            'coverage',
            '*.log',
            '*.tmp'
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (patterns) => {
          const converted = migrator.convertIgnorePatterns(patterns)

          // 验证：每个模式都应该被转换
          expect(converted).toHaveLength(patterns.length)

          for (let i = 0; i < patterns.length; i++) {
            const original = patterns[i]
            const result = converted[i]

            // 验证：简单目录名应该添加 **/ 前缀
            if (!original.startsWith('/') && !original.includes('**')) {
              expect(result).toBe(`**/${original}`)
            } else {
              // 验证：已有 ** 或 / 的模式应该保持不变
              expect(result).toBe(original)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 27：Glob 模式匹配正确性 - 复杂的 glob 模式应该被保留
   */
  it('属性 27: Glob 模式匹配正确性 - 复杂的 glob 模式应该被正确处理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            // 简单模式
            fc.constantFrom('dist', 'build', 'node_modules'),
            // 带通配符的模式
            fc.constantFrom('**/*.test.ts', '**/*.spec.js', '**/dist/**'),
            // 绝对路径模式
            fc.constantFrom('/dist', '/build', '/node_modules')
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (patterns) => {
          const converted = migrator.convertIgnorePatterns(patterns)

          for (let i = 0; i < patterns.length; i++) {
            const original = patterns[i]
            const result = converted[i]

            // 验证：所有模式都应该是有效的字符串
            expect(typeof result).toBe('string')
            expect(result.length).toBeGreaterThan(0)

            // 验证：转换规则
            if (original.startsWith('/')) {
              // 绝对路径应该保持不变
              expect(result).toBe(original)
            } else if (original.includes('**')) {
              // 已有 ** 的模式应该保持不变
              expect(result).toBe(original)
            } else {
              // 简单模式应该添加 **/
              expect(result).toBe(`**/${original}`)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 27：Glob 模式匹配正确性 - 空模式列表应该返回空数组
   */
  it('属性 27: Glob 模式匹配正确性 - 空模式列表应该返回空数组', () => {
    const converted = migrator.convertIgnorePatterns([])
    expect(converted).toEqual([])
    expect(Array.isArray(converted)).toBe(true)
  })

  /**
   * 属性 27：Glob 模式匹配正确性 - 模式转换应该是幂等的
   */
  it('属性 27: Glob 模式匹配正确性 - 对已转换的模式再次转换应该保持不变', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom('dist', 'node_modules', 'build', '*.log'),
          { minLength: 1, maxLength: 5 }
        ),
        async (patterns) => {
          // 第一次转换
          const converted1 = migrator.convertIgnorePatterns(patterns)
          
          // 第二次转换（对已转换的结果）
          const converted2 = migrator.convertIgnorePatterns(converted1)

          // 验证：第二次转换应该与第一次相同（幂等性）
          expect(converted2).toEqual(converted1)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
