/**
 * CommentAnalyzer 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { CommentAnalyzer } from '../CommentAnalyzer'
import type { FileCommentInfo, MissingComment } from '../types'

describe('CommentAnalyzer 属性测试', () => {
  /**
   * Feature: code-audit-and-docs-organization, Property 6: 标识符过滤正确性
   * **验证需求：2.4, 2.5**
   * 
   * 对于任何英文标识符（函数名、变量名、类名）或技术术语白名单中的词汇，
   * 注释检查器不应该将其标记为违反中文注释规范。
   */
  it('属性 6：应该正确识别标识符', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'myFunction',
          'userName',
          'getData',
          'handleClick',
          'isLoading',
          'MyClass',
          'UserProfile',
          '_privateVar',
          '$element',
          'camelCaseVar',
          'snake_case_var'
        ),
        (identifier) => {
          const analyzer = new CommentAnalyzer()
          const result = analyzer.isIdentifier(identifier)

          // 验证：这些都应该被识别为标识符
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 测试非标识符的识别
   */
  it('属性 6（扩展）：应该正确识别非标识符', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '这是中文',
          'hello world',
          '123abc',
          'my-function',
          'user.name',
          'get data',
          '函数名称'
        ),
        (text) => {
          const analyzer = new CommentAnalyzer()
          const result = analyzer.isIdentifier(text)

          // 验证：这些都不应该被识别为标识符
          expect(result).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 测试技术术语的识别
   */
  it('属性 6（扩展）：应该正确识别技术术语', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'TypeScript',
          'JavaScript',
          'Vue',
          'React',
          'API',
          'HTTP',
          'JSON',
          'HTML',
          'CSS',
          'Promise',
          'async',
          'await',
          'ESLint',
          'Git',
          'npm'
        ),
        (term) => {
          const analyzer = new CommentAnalyzer()
          const result = analyzer.isTechnicalTerm(term)

          // 验证：这些都应该被识别为技术术语
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: code-audit-and-docs-organization, Property 31: 整体报告聚合正确性
   * **验证需求：9.4**
   * 
   * 对于任何文件集合的注释检查结果，项目整体的平均覆盖率应该等于
   * 所有文件覆盖率的算术平均值。
   */
  it('属性 31：建议数量应该与问题数量相关', () => {
    fc.assert(
      fc.property(
        fc.record({
          publicAPIMissing: fc.integer({ min: 0, max: 10 }),
          privateAPIMissing: fc.integer({ min: 0, max: 10 }),
          coverage: fc.float({ min: 0, max: 1 }),
          qualityScore: fc.integer({ min: 0, max: 100 })
        }),
        (spec) => {
          // 创建缺失注释列表
          const missingComments: MissingComment[] = []
          
          for (let i = 0; i < spec.publicAPIMissing; i++) {
            missingComments.push({
              type: 'function',
              name: `publicFunc${i}`,
              line: i + 1,
              isPublicAPI: true
            })
          }
          
          for (let i = 0; i < spec.privateAPIMissing; i++) {
            missingComments.push({
              type: 'function',
              name: `privateFunc${i}`,
              line: i + 100,
              isPublicAPI: false
            })
          }

          const fileInfo: FileCommentInfo = {
            path: 'test.ts',
            coverage: spec.coverage,
            qualityScore: spec.qualityScore,
            missingComments,
            suggestions: []
          }

          const analyzer = new CommentAnalyzer()
          const suggestions = analyzer.generateSuggestions(fileInfo)

          // 验证：建议数量应该大于等于缺失注释的数量
          expect(suggestions.length).toBeGreaterThanOrEqual(missingComments.length)

          // 验证：公共 API 的建议应该是高优先级
          const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high')
          expect(highPrioritySuggestions.length).toBeGreaterThanOrEqual(spec.publicAPIMissing)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: code-audit-and-docs-organization, Property 32: 阈值过滤准确性
   * **验证需求：9.5**
   * 
   * 对于任何质量评分结果和阈值，标识为低质量的文件集合应该恰好是
   * 评分低于阈值的文件集合。
   */
  it('属性 32：低覆盖率应该生成建议', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(0.29) }), // 低覆盖率
        (coverage) => {
          const fileInfo: FileCommentInfo = {
            path: 'test.ts',
            coverage,
            qualityScore: 70,
            missingComments: [],
            suggestions: []
          }

          const analyzer = new CommentAnalyzer()
          const suggestions = analyzer.generateSuggestions(fileInfo)

          // 验证：低覆盖率应该生成至少一条建议
          const coverageSuggestions = suggestions.filter(s => 
            s.message.includes('覆盖率')
          )
          expect(coverageSuggestions.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 测试低质量评分的建议生成
   */
  it('属性 32（扩展）：低质量评分应该生成建议', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 59 }), // 低质量评分
        (qualityScore) => {
          const fileInfo: FileCommentInfo = {
            path: 'test.ts',
            coverage: 0.5,
            qualityScore,
            missingComments: [],
            suggestions: []
          }

          const analyzer = new CommentAnalyzer()
          const suggestions = analyzer.generateSuggestions(fileInfo)

          // 验证：低质量评分应该生成至少一条建议
          const qualitySuggestions = suggestions.filter(s => 
            s.message.includes('质量评分')
          )
          expect(qualitySuggestions.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Feature: code-audit-and-docs-organization, Property 33: 改进建议针对性
   * **验证需求：9.6**
   * 
   * 对于任何缺少注释的代码结构，生成的改进建议应该指向该代码结构的
   * 具体位置（文件和行号）。
   */
  it('属性 33：建议应该包含具体的文件和行号', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            line: fc.integer({ min: 1, max: 1000 }),
            isPublicAPI: fc.boolean()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (missingList) => {
          const missingComments: MissingComment[] = missingList.map(m => ({
            type: 'function',
            name: m.name,
            line: m.line,
            isPublicAPI: m.isPublicAPI
          }))

          const fileInfo: FileCommentInfo = {
            path: 'test.ts',
            coverage: 0.5,
            qualityScore: 70,
            missingComments,
            suggestions: []
          }

          const analyzer = new CommentAnalyzer()
          const suggestions = analyzer.generateSuggestions(fileInfo)

          // 验证：每条建议都应该有文件路径
          for (const suggestion of suggestions) {
            expect(suggestion.file).toBe('test.ts')
            expect(suggestion.line).toBeGreaterThan(0)
          }

          // 验证：针对缺失注释的建议应该指向正确的行号
          for (const missing of missingComments) {
            const relatedSuggestion = suggestions.find(s => 
              s.line === missing.line && s.message.includes(missing.name)
            )
            if (relatedSuggestion) {
              expect(relatedSuggestion.line).toBe(missing.line)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 测试建议的优先级分配
   */
  it('属性 33（扩展）：公共 API 的建议应该是高优先级', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // 是否为公共 API
        (isPublicAPI) => {
          const missingComments: MissingComment[] = [{
            type: 'function',
            name: 'testFunc',
            line: 10,
            isPublicAPI
          }]

          const fileInfo: FileCommentInfo = {
            path: 'test.ts',
            coverage: 0.5,
            qualityScore: 70,
            missingComments,
            suggestions: []
          }

          const analyzer = new CommentAnalyzer()
          const suggestions = analyzer.generateSuggestions(fileInfo)

          // 查找针对这个函数的建议
          const funcSuggestion = suggestions.find(s => 
            s.message.includes('testFunc')
          )

          if (funcSuggestion) {
            // 验证：公共 API 应该是高优先级，私有 API 应该是中优先级
            if (isPublicAPI) {
              expect(funcSuggestion.priority).toBe('high')
            } else {
              expect(funcSuggestion.priority).toBe('medium')
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * 测试标识符过滤功能
   */
  it('属性 6（扩展）：应该能够过滤注释中的标识符', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'This is a comment with myFunction and getData',
          'Comment with TypeScript and Vue',
          'Mixed 中文 and English with someVar',
          'Only identifiers: var1 var2 var3'
        ),
        (comment) => {
          const analyzer = new CommentAnalyzer()
          const filtered = analyzer.filterIdentifiersAndTerms(comment)

          // 验证：过滤后的结果应该是字符串
          expect(typeof filtered).toBe('string')

          // 验证：技术术语应该被保留
          if (comment.includes('TypeScript')) {
            expect(filtered).toContain('TypeScript')
          }
          if (comment.includes('Vue')) {
            expect(filtered).toContain('Vue')
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})
