/**
 * 文档索引生成器属性测试
 * Feature: code-audit-and-docs-organization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { IndexGenerator } from '../IndexGenerator'
import { ClassifiedDocs, DocumentFile, DocumentCategory } from '../types'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('IndexGenerator Property Tests', () => {
  let tempDir: string
  let generator: IndexGenerator

  beforeEach(async () => {
    // 创建临时测试目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'index-generator-test-'))
    generator = new IndexGenerator(tempDir)
  })

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  // Feature: code-audit-and-docs-organization, Property 11: 索引完整性
  // **验证需求：3.5**
  it('should include all documents in the generated index', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          deployment: fc.array(
            fc.record({
              path: fc.string(),
              category: fc.constant<DocumentCategory>('deployment'),
              title: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { maxLength: 5 }
          ),
          development: fc.array(
            fc.record({
              path: fc.string(),
              category: fc.constant<DocumentCategory>('development'),
              title: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { maxLength: 5 }
          ),
          features: fc.array(
            fc.record({
              path: fc.string(),
              category: fc.constant<DocumentCategory>('features'),
              title: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { maxLength: 5 }
          ),
          planning: fc.array(
            fc.record({
              path: fc.string(),
              category: fc.constant<DocumentCategory>('planning'),
              title: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { maxLength: 5 }
          ),
          testing: fc.array(
            fc.record({
              path: fc.string(),
              category: fc.constant<DocumentCategory>('testing'),
              title: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { maxLength: 5 }
          ),
          other: fc.array(
            fc.record({
              path: fc.string(),
              category: fc.constant<DocumentCategory>('other'),
              title: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { maxLength: 5 }
          )
        }),
        async (docs: ClassifiedDocs) => {
          // 生成索引
          const indexPath = path.join(tempDir, 'docs', 'README.md')
          await fs.mkdir(path.dirname(indexPath), { recursive: true })
          await generator.generateIndex(docs, indexPath)

          // 读取生成的索引
          const indexContent = await fs.readFile(indexPath, 'utf-8')

          // 验证：所有文档标题都应该出现在索引中
          const allDocs = [
            ...docs.deployment,
            ...docs.development,
            ...docs.features,
            ...docs.planning,
            ...docs.testing,
            ...docs.other
          ]

          for (const doc of allDocs) {
            // 标题应该出现在索引中
            expect(indexContent).toContain(doc.title)
          }

          // 验证：索引文件应该包含基本结构
          expect(indexContent).toContain('# 文档索引')
          expect(indexContent).toContain('生成时间')
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 25: 文档结构图完整性
  // **验证需求：7.7**
  it('should generate complete directory structure diagram', () => {
    fc.assert(
      fc.property(
        fc.record({
          deployment: fc.array(
            fc.record({
              path: fc.constantFrom(
                'docs/deployment/DEPLOYMENT_GUIDE.md',
                'docs/deployment/SERVER_OVERVIEW.md'
              ),
              category: fc.constant<DocumentCategory>('deployment'),
              title: fc.string()
            }),
            { minLength: 1, maxLength: 3 } // 确保至少有一个文档
          ),
          development: fc.array(
            fc.record({
              path: fc.constantFrom(
                'docs/development/STANDARDS.md',
                'docs/development/MIGRATION.md'
              ),
              category: fc.constant<DocumentCategory>('development'),
              title: fc.string()
            }),
            { maxLength: 3 }
          ),
          features: fc.constant([]),
          planning: fc.constant([]),
          testing: fc.constant([]),
          other: fc.constant([])
        }),
        (docs: ClassifiedDocs) => {
          // 生成结构图
          const diagram = generator.generateStructureDiagram(docs)

          // 验证：结构图不应该为空
          expect(diagram).toBeTruthy()
          expect(diagram.length).toBeGreaterThan(0)

          // 验证：结构图应该包含根目录
          expect(diagram).toContain('docs/')

          // 验证：所有文档都应该出现在结构图中
          const allDocs = [
            ...docs.deployment,
            ...docs.development,
            ...docs.features,
            ...docs.planning,
            ...docs.testing,
            ...docs.other
          ]

          for (const doc of allDocs) {
            const fileName = path.basename(doc.path)
            expect(diagram).toContain(fileName)
          }

          // 验证：结构图应该包含树形字符（当有文档时）
          if (allDocs.length > 0) {
            const hasTreeChars = diagram.includes('├──') || diagram.includes('└──')
            expect(hasTreeChars).toBe(true)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  // 额外测试：验证索引文件格式正确
  it('should generate valid Markdown format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          deployment: fc.array(
            fc.record({
              path: fc.constantFrom('docs/deploy.md', 'docs/server.md'),
              category: fc.constant<DocumentCategory>('deployment'),
              title: fc.string({ minLength: 1, maxLength: 30 })
            }),
            { maxLength: 3 }
          ),
          development: fc.constant([]),
          features: fc.constant([]),
          planning: fc.constant([]),
          testing: fc.constant([]),
          other: fc.constant([])
        }),
        async (docs: ClassifiedDocs) => {
          const indexPath = path.join(tempDir, 'docs', 'README.md')
          await fs.mkdir(path.dirname(indexPath), { recursive: true })
          await generator.generateIndex(docs, indexPath)

          const indexContent = await fs.readFile(indexPath, 'utf-8')

          // 验证：应该包含 Markdown 标题
          expect(indexContent).toMatch(/^# /m)

          // 验证：应该包含 Markdown 列表
          if (docs.deployment.length > 0) {
            expect(indexContent).toMatch(/^- \[/m)
          }

          // 验证：应该包含代码块（结构图）
          expect(indexContent).toContain('```')

          // 验证：文件应该以换行符结尾
          expect(indexContent.endsWith('\n')).toBe(true)
        }
      ),
      { numRuns: 30 }
    )
  })

  // 额外测试：验证空文档集合的处理
  it('should handle empty document collections', async () => {
    const emptyDocs: ClassifiedDocs = {
      deployment: [],
      development: [],
      features: [],
      planning: [],
      testing: [],
      other: []
    }

    const indexPath = path.join(tempDir, 'docs', 'README.md')
    await fs.mkdir(path.dirname(indexPath), { recursive: true })
    await generator.generateIndex(emptyDocs, indexPath)

    const indexContent = await fs.readFile(indexPath, 'utf-8')

    // 验证：即使没有文档，也应该生成有效的索引文件
    expect(indexContent).toContain('# 文档索引')
    expect(indexContent).toContain('生成时间')
  })

  // 额外测试：验证统计信息的准确性
  it('should generate accurate statistics', () => {
    fc.assert(
      fc.property(
        fc.record({
          deployment: fc.array(fc.anything(), { maxLength: 10 }),
          development: fc.array(fc.anything(), { maxLength: 10 }),
          features: fc.array(fc.anything(), { maxLength: 10 }),
          planning: fc.array(fc.anything(), { maxLength: 10 }),
          testing: fc.array(fc.anything(), { maxLength: 10 }),
          other: fc.array(fc.anything(), { maxLength: 10 })
        }).map(
          (counts): ClassifiedDocs => ({
            deployment: counts.deployment.map((_, i) => ({
              path: `deploy${i}.md`,
              category: 'deployment',
              title: `Deploy ${i}`
            })),
            development: counts.development.map((_, i) => ({
              path: `dev${i}.md`,
              category: 'development',
              title: `Dev ${i}`
            })),
            features: counts.features.map((_, i) => ({
              path: `feat${i}.md`,
              category: 'features',
              title: `Feat ${i}`
            })),
            planning: counts.planning.map((_, i) => ({
              path: `plan${i}.md`,
              category: 'planning',
              title: `Plan ${i}`
            })),
            testing: counts.testing.map((_, i) => ({
              path: `test${i}.md`,
              category: 'testing',
              title: `Test ${i}`
            })),
            other: counts.other.map((_, i) => ({
              path: `other${i}.md`,
              category: 'other',
              title: `Other ${i}`
            }))
          })
        ),
        (docs: ClassifiedDocs) => {
          const stats = generator.generateStatistics(docs)

          // 验证：统计信息应该包含正确的数量
          const total =
            docs.deployment.length +
            docs.development.length +
            docs.features.length +
            docs.planning.length +
            docs.testing.length +
            docs.other.length

          expect(stats).toContain(`文档总数：${total}`)
          expect(stats).toContain(`部署文档：${docs.deployment.length}`)
          expect(stats).toContain(`开发文档：${docs.development.length}`)
          expect(stats).toContain(`功能文档：${docs.features.length}`)
          expect(stats).toContain(`规划文档：${docs.planning.length}`)
          expect(stats).toContain(`测试文档：${docs.testing.length}`)
          expect(stats).toContain(`其他文档：${docs.other.length}`)
        }
      ),
      { numRuns: 50 }
    )
  })
})
