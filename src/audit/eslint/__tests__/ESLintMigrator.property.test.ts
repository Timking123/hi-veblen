/**
 * ESLint 迁移器属性测试
 * 验证配置规则保留
 * 
 * **Validates: Requirements 1.3**
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { ESLintMigrator } from '../ESLintMigrator'
import type { LegacyConfig } from '../types'

describe('属性测试：ESLint 配置迁移', () => {
  const migrator = new ESLintMigrator()

  /**
   * 属性 1：配置规则保留
   * 
   * 对于任何 ESLint 配置迁移操作，新配置文件中的规则集应该与旧配置文件中的规则集等效
   * （相同的规则名称和规则值）。
   * 
   * Feature: code-audit-and-docs-organization, Property 1: 配置规则保留
   */
  it('属性 1: 配置规则保留 - 所有规则应该被保留且值相同', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机的 ESLint 配置对象
        fc.record({
          rules: fc.dictionary(
            // 规则名称：使用常见的 ESLint 规则名
            fc.constantFrom(
              'no-console',
              'no-unused-vars',
              'no-undef',
              'semi',
              'quotes',
              'indent',
              'comma-dangle',
              'no-trailing-spaces',
              'eqeqeq',
              'curly',
              '@typescript-eslint/no-explicit-any',
              '@typescript-eslint/no-unused-vars',
              'vue/multi-word-component-names',
              'vue/no-unused-vars',
              'prettier/prettier'
            ),
            // 规则值：可以是字符串、数字或数组
            fc.oneof(
              fc.constantFrom('off', 'warn', 'error', 0, 1, 2),
              fc.tuple(
                fc.constantFrom('off', 'warn', 'error', 0, 1, 2),
                fc.record({
                  argsIgnorePattern: fc.string(),
                  varsIgnorePattern: fc.string(),
                  ignoreRestSiblings: fc.boolean(),
                })
              )
            ),
            { minKeys: 1, maxKeys: 10 }
          ),
          plugins: fc.array(
            fc.constantFrom('vue', '@typescript-eslint', 'prettier', 'import', 'react'),
            { minLength: 0, maxLength: 5 }
          ),
          env: fc.record({
            browser: fc.boolean(),
            node: fc.boolean(),
            es2021: fc.boolean(),
            es6: fc.boolean(),
          }),
          parserOptions: fc.record({
            ecmaVersion: fc.constantFrom('latest', 2021, 2020, 2019),
            sourceType: fc.constantFrom('module', 'script'),
          }),
          ignorePatterns: fc.array(
            fc.constantFrom('dist', 'node_modules', 'build', '*.test.ts', '**/*.spec.js'),
            { minLength: 0, maxLength: 5 }
          ),
        }),
        async (oldConfig: LegacyConfig) => {
          // 执行配置迁移
          const newConfigArray = migrator.generateNewConfig(oldConfig)

          // 找到包含规则的配置对象
          const newConfigWithRules = newConfigArray.find(config => config.rules)

          // 验证：新配置应该包含规则
          expect(newConfigWithRules).toBeDefined()

          if (newConfigWithRules && oldConfig.rules) {
            // 验证：所有旧规则都应该在新配置中
            const oldRuleNames = Object.keys(oldConfig.rules)
            const newRuleNames = Object.keys(newConfigWithRules.rules || {})

            for (const ruleName of oldRuleNames) {
              // 1. 验证规则名称存在
              expect(newRuleNames).toContain(ruleName)

              // 2. 验证规则值相同
              expect(newConfigWithRules.rules?.[ruleName]).toEqual(oldConfig.rules[ruleName])
            }

            // 验证：规则数量应该相同
            expect(newRuleNames.length).toBe(oldRuleNames.length)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1：配置规则保留 - 复杂规则配置应该被保留
   */
  it('属性 1: 配置规则保留 - 复杂规则配置（数组形式）应该被保留', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.dictionary(
            fc.constantFrom(
              'no-unused-vars',
              '@typescript-eslint/no-unused-vars',
              'indent',
              'quotes'
            ),
            // 生成数组形式的规则配置
            fc.tuple(
              fc.constantFrom('error', 'warn', 2, 1),
              fc.oneof(
                fc.record({
                  argsIgnorePattern: fc.string({ minLength: 1, maxLength: 10 }),
                  varsIgnorePattern: fc.string({ minLength: 1, maxLength: 10 }),
                }),
                fc.record({
                  ignoreRestSiblings: fc.boolean(),
                  caughtErrors: fc.constantFrom('all', 'none'),
                }),
                fc.constantFrom('single', 'double', 'backtick'),
                fc.nat(8)
              )
            ),
            { minKeys: 1, maxKeys: 5 }
          ),
        }),
        async (oldConfig: LegacyConfig) => {
          const newConfigArray = migrator.generateNewConfig(oldConfig)
          const newConfigWithRules = newConfigArray.find(config => config.rules)

          if (newConfigWithRules && oldConfig.rules) {
            for (const [ruleName, ruleValue] of Object.entries(oldConfig.rules)) {
              // 验证：复杂规则配置应该完全相同
              expect(newConfigWithRules.rules?.[ruleName]).toEqual(ruleValue)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1：配置规则保留 - 空规则配置应该正确处理
   */
  it('属性 1: 配置规则保留 - 空规则配置应该正确处理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.constant({}),
          plugins: fc.array(fc.string(), { maxLength: 3 }),
          env: fc.record({
            browser: fc.boolean(),
            node: fc.boolean(),
          }),
        }),
        async (oldConfig: LegacyConfig) => {
          const newConfigArray = migrator.generateNewConfig(oldConfig)
          const newConfigWithRules = newConfigArray.find(config => config.rules)

          // 验证：即使没有规则，配置对象也应该存在
          expect(newConfigWithRules).toBeDefined()

          // 验证：规则对象应该为空
          expect(newConfigWithRules?.rules).toEqual({})

          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 属性 1：配置规则保留 - 规则值的各种类型应该被保留
   */
  it('属性 1: 配置规则保留 - 规则值的各种类型（字符串、数字、数组）应该被保留', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.record({
            // 字符串类型的规则值
            'rule-string': fc.constantFrom('off', 'warn', 'error'),
            // 数字类型的规则值
            'rule-number': fc.constantFrom(0, 1, 2),
            // 数组类型的规则值（简单）
            'rule-array-simple': fc.tuple(
              fc.constantFrom('error', 'warn'),
              fc.string()
            ),
            // 数组类型的规则值（复杂对象）
            'rule-array-complex': fc.tuple(
              fc.constantFrom('error', 'warn'),
              fc.record({
                option1: fc.boolean(),
                option2: fc.nat(100),
                option3: fc.array(fc.string(), { maxLength: 3 }),
              })
            ),
          }),
        }),
        async (oldConfig: LegacyConfig) => {
          const newConfigArray = migrator.generateNewConfig(oldConfig)
          const newConfigWithRules = newConfigArray.find(config => config.rules)

          if (newConfigWithRules && oldConfig.rules) {
            // 验证：每种类型的规则值都应该被正确保留
            for (const [ruleName, ruleValue] of Object.entries(oldConfig.rules)) {
              expect(newConfigWithRules.rules?.[ruleName]).toEqual(ruleValue)

              // 验证：类型应该保持一致
              expect(typeof newConfigWithRules.rules?.[ruleName]).toBe(typeof ruleValue)

              // 如果是数组，验证数组长度
              if (Array.isArray(ruleValue)) {
                expect(Array.isArray(newConfigWithRules.rules?.[ruleName])).toBe(true)
                expect((newConfigWithRules.rules?.[ruleName] as any[]).length).toBe(ruleValue.length)
              }
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1：配置规则保留 - 特殊字符的规则名应该被保留
   */
  it('属性 1: 配置规则保留 - 包含特殊字符的规则名（如 @、/）应该被保留', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.record({
            '@typescript-eslint/no-explicit-any': fc.constantFrom('off', 'warn', 'error'),
            '@typescript-eslint/no-unused-vars': fc.tuple(
              fc.constantFrom('error', 'warn'),
              fc.record({ argsIgnorePattern: fc.string() })
            ),
            'vue/multi-word-component-names': fc.constantFrom('off', 'warn', 'error'),
            'vue/no-v-html': fc.constantFrom(0, 1, 2),
            'import/no-unresolved': fc.constantFrom('error', 'warn'),
            'prettier/prettier': fc.constantFrom('error', 'warn'),
          }),
        }),
        async (oldConfig: LegacyConfig) => {
          const newConfigArray = migrator.generateNewConfig(oldConfig)
          const newConfigWithRules = newConfigArray.find(config => config.rules)

          if (newConfigWithRules && oldConfig.rules) {
            // 验证：所有包含特殊字符的规则名都应该被保留
            for (const ruleName of Object.keys(oldConfig.rules)) {
              expect(newConfigWithRules.rules).toHaveProperty(ruleName)
              expect(newConfigWithRules.rules?.[ruleName]).toEqual(oldConfig.rules[ruleName])
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 属性 1：配置规则保留 - 大量规则应该被保留
   */
  it('属性 1: 配置规则保留 - 大量规则（50+）应该全部被保留', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          rules: fc.dictionary(
            // 生成随机规则名
            fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0),
            fc.constantFrom('off', 'warn', 'error', 0, 1, 2),
            { minKeys: 50, maxKeys: 100 }
          ),
        }),
        async (oldConfig: LegacyConfig) => {
          const newConfigArray = migrator.generateNewConfig(oldConfig)
          const newConfigWithRules = newConfigArray.find(config => config.rules)

          if (newConfigWithRules && oldConfig.rules) {
            const oldRuleCount = Object.keys(oldConfig.rules).length
            const newRuleCount = Object.keys(newConfigWithRules.rules || {}).length

            // 验证：规则数量应该相同
            expect(newRuleCount).toBe(oldRuleCount)

            // 验证：所有规则都应该被保留
            for (const [ruleName, ruleValue] of Object.entries(oldConfig.rules)) {
              expect(newConfigWithRules.rules?.[ruleName]).toEqual(ruleValue)
            }
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
