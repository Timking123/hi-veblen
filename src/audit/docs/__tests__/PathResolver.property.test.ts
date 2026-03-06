/**
 * 路径解析器属性测试
 * Feature: code-audit-and-docs-organization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { PathResolver } from '../PathResolver'
import { promises as fs } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('PathResolver Property Tests', () => {
  let tempDir: string
  let resolver: PathResolver

  beforeEach(async () => {
    // 创建临时测试目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'path-resolver-test-'))
    resolver = new PathResolver(tempDir)
  })

  afterEach(async () => {
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // 忽略清理错误
    }
  })

  // Feature: code-audit-and-docs-organization, Property 9: 文件移动保留内容
  // **验证需求：3.3**
  it('should preserve file content after moving', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileName: fc.constantFrom('test1.md', 'test2.md', 'test3.md'),
          content: fc.string({ minLength: 0, maxLength: 1000 }),
          targetDir: fc.constantFrom('docs', 'guides', 'references')
        }),
        async ({ fileName, content, targetDir }) => {
          // 创建源文件
          const sourcePath = path.join(tempDir, fileName)
          await fs.writeFile(sourcePath, content, 'utf-8')

          // 移动文件
          const targetPath = path.join(tempDir, targetDir, fileName)
          await resolver.moveFile(sourcePath, targetPath, false)

          // 验证：目标文件内容与原内容相同
          const movedContent = await fs.readFile(targetPath, 'utf-8')
          expect(movedContent).toBe(content)

          // 验证：源文件不再存在
          await expect(fs.access(sourcePath)).rejects.toThrow()
        }
      ),
      { numRuns: 50 } // 减少运行次数以加快测试
    )
  })

  // Feature: code-audit-and-docs-organization, Property 12: 路径引用更新正确性
  // **验证需求：3.6, 7.6**
  it('should correctly update relative path references', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          docName: fc.constantFrom('doc1.md', 'doc2.md'),
          linkTarget: fc.constantFrom('target1.md', 'target2.md'),
          linkText: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(']') && !s.includes('['))
        }),
        async ({ docName, linkTarget, linkText }) => {
          // 创建文档和目标文件
          const docPath = path.join(tempDir, docName)
          const targetPath = path.join(tempDir, linkTarget)
          
          // 创建包含链接的文档
          const docContent = `# Test\n\n[${linkText}](${linkTarget})\n`
          await fs.writeFile(docPath, docContent, 'utf-8')
          await fs.writeFile(targetPath, 'target content', 'utf-8')

          // 移动目标文件到子目录
          const newTargetPath = path.join(tempDir, 'docs', linkTarget)
          await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true })
          await fs.rename(targetPath, newTargetPath)

          // 更新链接
          const moves = new Map([[targetPath, newTargetPath]])
          const updates = await resolver.updateLinks(docPath, moves)

          // 验证：链接已更新
          expect(updates.length).toBeGreaterThan(0)
          
          // 验证：新链接指向正确位置
          const updatedContent = await fs.readFile(docPath, 'utf-8')
          const expectedRelativePath = path.relative(
            path.dirname(docPath),
            newTargetPath
          ).replace(/\\/g, '/')
          
          expect(updatedContent).toContain(`[${linkText}](${expectedRelativePath})`)
        }
      ),
      { numRuns: 30 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 24: 文件冲突检测
  // **验证需求：7.4**
  it('should detect file conflicts when checkConflict is enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fileName: fc.constantFrom('conflict1.md', 'conflict2.md'),
          content1: fc.string(),
          content2: fc.string()
        }),
        async ({ fileName, content1, content2 }) => {
          // 创建源文件
          const sourcePath = path.join(tempDir, 'source', fileName)
          await fs.mkdir(path.join(tempDir, 'source'), { recursive: true })
          await fs.writeFile(sourcePath, content1, 'utf-8')

          // 创建目标文件（冲突）
          const targetPath = path.join(tempDir, 'target', fileName)
          await fs.mkdir(path.join(tempDir, 'target'), { recursive: true })
          await fs.writeFile(targetPath, content2, 'utf-8')

          // 验证：启用冲突检测时应该抛出错误
          await expect(
            resolver.moveFile(sourcePath, targetPath, true)
          ).rejects.toThrow(/目标文件已存在/)

          // 验证：源文件仍然存在
          const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false)
          expect(sourceExists).toBe(true)

          // 验证：目标文件内容未改变
          const targetContent = await fs.readFile(targetPath, 'utf-8')
          expect(targetContent).toBe(content2)
        }
      ),
      { numRuns: 30 }
    )
  })

  // 额外测试：验证相对路径计算的正确性
  it('should correctly calculate relative paths', () => {
    fc.assert(
      fc.property(
        fc.record({
          fromPath: fc.constantFrom(
            'docs/guide.md',
            'src/readme.md',
            'deep/nested/file.md'
          ),
          toPath: fc.constantFrom(
            'docs/api.md',
            'src/utils/helper.md',
            'README.md'
          )
        }),
        ({ fromPath, toPath }) => {
          const relativePath = resolver.calculateRelativePath(fromPath, toPath)
          
          // 验证：相对路径不应该为空
          expect(relativePath).toBeTruthy()
          
          // 验证：相对路径应该使用正斜杠（Markdown 标准）
          expect(relativePath).not.toContain('\\')
          
          // 验证：相对路径不应该是绝对路径
          expect(path.isAbsolute(relativePath)).toBe(false)
          
          // 验证：解析后应该指向正确的位置
          const resolved = resolver.resolveRelativePath(fromPath, relativePath)
          const normalizedResolved = path.normalize(resolved)
          const normalizedTo = path.normalize(path.resolve(toPath))
          
          expect(normalizedResolved).toBe(normalizedTo)
        }
      ),
      { numRuns: 100 }
    )
  })

  // 额外测试：验证外部链接不被修改
  it('should not modify external links', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          url: fc.constantFrom(
            'https://example.com',
            'http://test.org/page',
            'https://github.com/user/repo'
          ),
          linkText: fc.string({ minLength: 1, maxLength: 20 })
        }),
        async ({ url, linkText }) => {
          const docPath = path.join(tempDir, 'doc.md')
          const content = `# Test\n\n[${linkText}](${url})\n`
          await fs.writeFile(docPath, content, 'utf-8')

          // 尝试更新链接（应该不影响外部链接）
          const moves = new Map([['some/path.md', 'new/path.md']])
          const updates = await resolver.updateLinks(docPath, moves)

          // 验证：没有更新
          expect(updates.length).toBe(0)

          // 验证：内容未改变
          const updatedContent = await fs.readFile(docPath, 'utf-8')
          expect(updatedContent).toBe(content)
        }
      ),
      { numRuns: 30 }
    )
  })
})
