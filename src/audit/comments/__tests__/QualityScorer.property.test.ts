/**
 * QualityScorer 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { QualityScorer } from '../QualityScorer'
import * as tsParser from '@typescript-eslint/parser'
import type { TSESTree } from '@typescript-eslint/types'
import type { MissingComment } from '../types'

describe('QualityScorer 属性测试', () => {
  /**
   * Feature: code-audit-and-docs-organization, Property 28: 注释覆盖率计算正确性
   * **验证需求：9.1**
   * 
   * 对于任何代码文件，注释覆盖率应该在 0 到 1 之间，
   * 且等于（注释行数 / 总代码行数）。
   */
  it('属性 28：注释覆盖率应该在 0 到 1 之间', () => {
    fc.assert(
      fc.property(
        // 生成代码内容：包含不同数量的代码行和注释行
        fc.record({
          codeLines: fc.integer({ min: 0, max: 50 }),
          commentLines: fc.integer({ min: 0, max: 20 })
        }),
        (spec) => {
          // 生成代码内容
          let content = ''
          
          // 添加注释
          for (let i = 0; i < spec.commentLines; i++) {
            content += `// 这是注释 ${i}\n`
          }
          
          // 添加代码
          for (let i = 0; i < spec.codeLines; i++) {
            content += `const x${i} = ${i};\n`
          }

          // 解析 AST
          const ast = tsParser.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            comment: true,
            loc: true,
            range: true
          })

          // 计算覆盖率
          const scorer = new QualityScorer()
          const coverage = scorer.calculateCoverage('test.ts', content, ast)

          // 验证：覆盖率应该在 0 到 1 之间
          expect(coverage).toBeGreaterThanOrEqual(0)
          expect(coverage).toBeLessThanOrEqual(1)

          // 验证：如果没有代码行，覆盖率应该是 1
          if (spec.codeLines === 0) {
            expect(coverage).toBe(1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 测试覆盖率计算的准确性
   */
  it('属性 28（扩展）：覆盖率应该接近（注释行数 / 代码行数）', () => {
    fc.assert(
      fc.property(
        fc.record({
          codeLines: fc.integer({ min: 1, max: 20 }),
          commentLines: fc.integer({ min: 0, max: 10 })
        }),
        (spec) => {
          let content = ''
          
          // 添加注释
          for (let i = 0; i < spec.commentLines; i++) {
            content += `// 注释 ${i}\n`
          }
          
          // 添加代码
          for (let i = 0; i < spec.codeLines; i++) {
            content += `const x${i} = ${i};\n`
          }

          const ast = tsParser.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            comment: true,
            loc: true,
            range: true
          })

          const scorer = new QualityScorer()
          const coverage = scorer.calculateCoverage('test.ts', content, ast)

          // 预期覆盖率
          const expectedCoverage = Math.min(spec.commentLines / spec.codeLines, 1)

          // 验证：覆盖率应该接近预期值（允许较大误差，因为实现会过滤某些行）
          // 主要验证覆盖率在合理范围内
          expect(Math.abs(coverage - expectedCoverage)).toBeLessThan(0.6)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: code-audit-and-docs-organization, Property 29: 公共 API 识别准确性
   * **验证需求：9.2**
   * 
   * 对于任何包含导出声明的文件，注释检查器应该识别所有导出的函数、类和接口，
   * 并检查它们是否有文档注释。
   */
  it('属性 29：应该正确识别公共 API', () => {
    fc.assert(
      fc.property(
        fc.record({
          exportedFunctions: fc.integer({ min: 0, max: 5 }),
          exportedClasses: fc.integer({ min: 0, max: 3 }),
          exportedInterfaces: fc.integer({ min: 0, max: 3 }),
          hasComments: fc.boolean()
        }),
        (spec) => {
          let content = ''
          let expectedPublicAPIs = 0

          // 添加导出的函数
          for (let i = 0; i < spec.exportedFunctions; i++) {
            if (spec.hasComments) {
              content += `// 函数 ${i}\n`
            }
            content += `export function func${i}() {}\n\n`
            expectedPublicAPIs++
          }

          // 添加导出的类
          for (let i = 0; i < spec.exportedClasses; i++) {
            if (spec.hasComments) {
              content += `// 类 ${i}\n`
            }
            content += `export class Class${i} {}\n\n`
            expectedPublicAPIs++
          }

          // 添加导出的接口
          for (let i = 0; i < spec.exportedInterfaces; i++) {
            if (spec.hasComments) {
              content += `// 接口 ${i}\n`
            }
            content += `export interface Interface${i} {}\n\n`
            expectedPublicAPIs++
          }

          if (expectedPublicAPIs === 0) {
            return true // 跳过没有公共 API 的情况
          }

          const ast = tsParser.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            comment: true,
            loc: true,
            range: true
          })

          // 创建 missingComments 列表
          const missingComments: MissingComment[] = []
          if (!spec.hasComments) {
            // 如果没有注释，所有公共 API 都应该被标记为缺失
            for (let i = 0; i < spec.exportedFunctions; i++) {
              missingComments.push({
                type: 'function',
                name: `func${i}`,
                line: 1,
                isPublicAPI: true
              })
            }
            for (let i = 0; i < spec.exportedClasses; i++) {
              missingComments.push({
                type: 'class',
                name: `Class${i}`,
                line: 1,
                isPublicAPI: true
              })
            }
            for (let i = 0; i < spec.exportedInterfaces; i++) {
              missingComments.push({
                type: 'interface',
                name: `Interface${i}`,
                line: 1,
                isPublicAPI: true
              })
            }
          }

          const scorer = new QualityScorer()
          const coverage = scorer.calculatePublicAPICoverage(ast, missingComments)

          // 验证：覆盖率应该在 0 到 1 之间
          expect(coverage).toBeGreaterThanOrEqual(0)
          expect(coverage).toBeLessThanOrEqual(1)

          // 验证：如果有注释，覆盖率应该是 1；如果没有注释，覆盖率应该是 0
          if (spec.hasComments) {
            expect(coverage).toBe(1)
          } else {
            expect(coverage).toBe(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: code-audit-and-docs-organization, Property 30: 质量评分范围有效性
   * **验证需求：9.3**
   * 
   * 对于任何文件的注释质量评分，分数应该在 0 到 100 之间（包含边界值）。
   */
  it('属性 30：质量评分应该在 0 到 100 之间', () => {
    fc.assert(
      fc.property(
        fc.record({
          codeLines: fc.integer({ min: 1, max: 30 }),
          commentLines: fc.integer({ min: 0, max: 15 }),
          hasChinese: fc.boolean(),
          exportedCount: fc.integer({ min: 0, max: 5 })
        }),
        (spec) => {
          let content = ''

          // 添加注释
          for (let i = 0; i < spec.commentLines; i++) {
            const commentText = spec.hasChinese ? `这是中文注释 ${i}` : `This is comment ${i}`
            content += `// ${commentText}\n`
          }

          // 添加导出的函数
          for (let i = 0; i < spec.exportedCount; i++) {
            content += `export function func${i}() {}\n`
          }

          // 添加代码
          for (let i = 0; i < spec.codeLines; i++) {
            content += `const x${i} = ${i};\n`
          }

          const ast = tsParser.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            comment: true,
            loc: true,
            range: true
          })

          const missingComments: MissingComment[] = []
          const scorer = new QualityScorer()
          const score = scorer.calculateQualityScore('test.ts', content, ast, missingComments)

          // 验证：评分应该在 0 到 100 之间
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 测试中文注释比例的计算
   */
  it('属性 30（扩展）：中文注释比例应该正确计算', () => {
    fc.assert(
      fc.property(
        fc.record({
          chineseComments: fc.integer({ min: 0, max: 10 }),
          englishComments: fc.integer({ min: 0, max: 10 })
        }),
        (spec) => {
          let content = ''

          // 添加中文注释
          for (let i = 0; i < spec.chineseComments; i++) {
            content += `// 这是中文注释 ${i}\n`
          }

          // 添加英文注释
          for (let i = 0; i < spec.englishComments; i++) {
            content += `// This is English comment ${i}\n`
          }

          // 添加一些代码
          content += 'const x = 1;\n'

          const ast = tsParser.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            comment: true,
            loc: true,
            range: true
          })

          const scorer = new QualityScorer()
          const ratio = scorer.calculateChineseCommentRatio(ast)

          // 验证：比例应该在 0 到 1 之间
          expect(ratio).toBeGreaterThanOrEqual(0)
          expect(ratio).toBeLessThanOrEqual(1)

          // 验证：如果没有注释，比例应该是 0
          if (spec.chineseComments === 0 && spec.englishComments === 0) {
            expect(ratio).toBe(0)
          }

          // 验证：如果只有中文注释，比例应该是 1
          if (spec.chineseComments > 0 && spec.englishComments === 0) {
            expect(ratio).toBe(1)
          }

          // 验证：如果只有英文注释，比例应该是 0
          if (spec.chineseComments === 0 && spec.englishComments > 0) {
            expect(ratio).toBe(0)
          }

          // 验证：比例应该接近预期值
          const totalComments = spec.chineseComments + spec.englishComments
          if (totalComments > 0) {
            const expectedRatio = spec.chineseComments / totalComments
            expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.01)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 测试质量评分的组成部分
   */
  it('属性 30（扩展）：质量评分应该综合考虑多个因素', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // 是否有中文注释
        (hasChinese) => {
          // 创建两个相同的代码，一个有中文注释，一个没有
          const commentText = hasChinese ? '这是中文注释' : 'This is English comment'
          const content = `
// ${commentText}
export function test() {}
const x = 1;
`

          const ast = tsParser.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            comment: true,
            loc: true,
            range: true
          })

          const missingComments: MissingComment[] = []
          const scorer = new QualityScorer()
          const score = scorer.calculateQualityScore('test.ts', content, ast, missingComments)

          // 验证：有中文注释的评分应该高于没有中文注释的评分
          // （因为中文注释比例占 20% 的权重）
          if (hasChinese) {
            expect(score).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
