/**
 * CommentChecker 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { CommentChecker } from '../CommentChecker'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('CommentChecker 属性测试', () => {
  /**
   * Feature: code-audit-and-docs-organization, Property 3: 文件扫描完整性
   * **验证需求：2.1**
   * 
   * 对于任何指定的文件类型集合和目录，扫描器应该找到该目录下所有匹配类型的文件，
   * 不遗漏任何符合条件的文件。
   */
  it('属性 3：应该扫描所有指定类型的文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成文件列表：包含不同扩展名的文件
        fc.array(
          fc.record({
            name: fc.constantFrom('test', 'helper', 'utils', 'component'),
            ext: fc.constantFrom('.ts', '.vue', '.js', '.tsx', '.jsx')
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (fileSpecs) => {
          // 创建临时目录
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-test-'))
          
          try {
            // 创建测试文件
            const createdFiles: string[] = []
            for (let i = 0; i < fileSpecs.length; i++) {
              const spec = fileSpecs[i]
              const fileName = `${spec.name}${i}${spec.ext}`
              const filePath = path.join(tempDir, fileName)
              
              // 创建简单的代码文件
              const content = spec.ext === '.vue'
                ? '<template><div>Test</div></template>\n<script setup lang="ts">\nfunction test() {}\n</script>'
                : 'function test() {}\n'
              
              await fs.writeFile(filePath, content, 'utf-8')
              createdFiles.push(filePath)
            }

            // 执行检查
            const checker = new CommentChecker()
            const result = await checker.check(createdFiles)

            // 验证：检查的文件数应该等于创建的文件数
            expect(result.files.length).toBe(createdFiles.length)
            
            // 验证：每个创建的文件都应该在结果中
            const resultPaths = result.files.map(f => f.path)
            for (const file of createdFiles) {
              expect(resultPaths).toContain(file)
            }
          } finally {
            // 清理临时目录
            await fs.rm(tempDir, { recursive: true, force: true })
          }
        }
      ),
      { numRuns: 20 } // 减少运行次数以加快测试速度
    )
  })

  /**
   * Feature: code-audit-and-docs-organization, Property 4: 注释识别准确性
   * **验证需求：2.2**
   * 
   * 对于任何包含函数、类、方法或复杂逻辑块的代码文件，
   * 注释检查器应该能够识别这些代码结构及其关联的注释。
   */
  it('属性 4：应该准确识别函数、类、方法和接口', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成不同类型的代码结构
        fc.record({
          hasFunction: fc.boolean(),
          hasClass: fc.boolean(),
          hasInterface: fc.boolean(),
          hasComment: fc.boolean()
        }),
        async (spec) => {
          // 创建临时文件
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-test-'))
          const filePath = path.join(tempDir, 'test.ts')
          
          try {
            // 生成代码内容
            let content = ''
            let expectedMissingCount = 0

            if (spec.hasFunction) {
              if (spec.hasComment) {
                content += '// 测试函数\n'
              } else {
                expectedMissingCount++
              }
              content += 'export function testFunction() {}\n\n'
            }

            if (spec.hasClass) {
              if (spec.hasComment) {
                content += '// 测试类\n'
              } else {
                expectedMissingCount++
              }
              content += 'export class TestClass {}\n\n'
            }

            if (spec.hasInterface) {
              if (spec.hasComment) {
                content += '// 测试接口\n'
              } else {
                expectedMissingCount++
              }
              content += 'export interface TestInterface {}\n\n'
            }

            // 如果没有任何代码结构，跳过此测试
            if (!spec.hasFunction && !spec.hasClass && !spec.hasInterface) {
              return true
            }

            await fs.writeFile(filePath, content, 'utf-8')

            // 执行检查
            const checker = new CommentChecker()
            const result = await checker.check([filePath])

            // 验证：缺少注释的数量应该符合预期
            expect(result.files[0].missingComments.length).toBe(expectedMissingCount)

            // 验证：识别的代码类型应该正确
            if (spec.hasFunction && !spec.hasComment) {
              const functionMissing = result.files[0].missingComments.find(
                m => m.type === 'function' && m.name === 'testFunction'
              )
              expect(functionMissing).toBeDefined()
            }

            if (spec.hasClass && !spec.hasComment) {
              const classMissing = result.files[0].missingComments.find(
                m => m.type === 'class' && m.name === 'TestClass'
              )
              expect(classMissing).toBeDefined()
            }

            if (spec.hasInterface && !spec.hasComment) {
              const interfaceMissing = result.files[0].missingComments.find(
                m => m.type === 'interface' && m.name === 'TestInterface'
              )
              expect(interfaceMissing).toBeDefined()
            }
          } finally {
            // 清理临时目录
            await fs.rm(tempDir, { recursive: true, force: true })
          }

          return true
        }
      ),
      { numRuns: 30 }
    )
  })

  /**
   * 测试方法定义的识别
   */
  it('属性 4（扩展）：应该识别类方法', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          methodName: fc.constantFrom('getData', 'setData', 'process', 'handle'),
          hasComment: fc.boolean()
        }),
        async (spec) => {
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-test-'))
          const filePath = path.join(tempDir, 'test.ts')
          
          try {
            let content = 'export class TestClass {\n'
            
            if (spec.hasComment) {
              content += `  // ${spec.methodName} 方法\n`
            }
            content += `  ${spec.methodName}() {}\n`
            content += '}\n'

            await fs.writeFile(filePath, content, 'utf-8')

            const checker = new CommentChecker()
            const result = await checker.check([filePath])

            // 类本身没有注释，所以至少有 1 个缺失
            expect(result.files[0].missingComments.length).toBeGreaterThanOrEqual(1)

            // 如果方法没有注释，应该被识别
            if (!spec.hasComment) {
              const methodMissing = result.files[0].missingComments.find(
                m => m.type === 'method' && m.name === spec.methodName
              )
              expect(methodMissing).toBeDefined()
            }
          } finally {
            await fs.rm(tempDir, { recursive: true, force: true })
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 测试导出状态的识别
   */
  it('属性 4（扩展）：应该正确识别公共 API（导出的代码）', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // 是否导出
        async (isExported) => {
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-test-'))
          const filePath = path.join(tempDir, 'test.ts')
          
          try {
            const exportKeyword = isExported ? 'export ' : ''
            const content = `${exportKeyword}function testFunction() {}\n`

            await fs.writeFile(filePath, content, 'utf-8')

            const checker = new CommentChecker()
            const result = await checker.check([filePath])

            // 应该识别到缺少注释的函数
            expect(result.files[0].missingComments.length).toBe(1)
            
            // 验证 isPublicAPI 标志
            const missing = result.files[0].missingComments[0]
            expect(missing.isPublicAPI).toBe(isExported)
          } finally {
            await fs.rm(tempDir, { recursive: true, force: true })
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * 测试 Vue 文件的解析
   */
  it('属性 4（扩展）：应该能够解析 Vue 文件', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // 是否有注释
        async (hasComment) => {
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-test-'))
          const filePath = path.join(tempDir, 'test.vue')
          
          try {
            let content = '<template>\n  <div>Test</div>\n</template>\n\n'
            content += '<script setup lang="ts">\n'
            
            if (hasComment) {
              content += '// 测试函数\n'
            }
            content += 'function testFunction() {}\n'
            content += '</script>\n'

            await fs.writeFile(filePath, content, 'utf-8')

            const checker = new CommentChecker()
            const result = await checker.check([filePath])

            // 应该能够成功解析 Vue 文件
            expect(result.files.length).toBe(1)
            
            // 如果没有注释，应该识别到缺失
            if (!hasComment) {
              expect(result.files[0].missingComments.length).toBeGreaterThan(0)
            }
          } finally {
            await fs.rm(tempDir, { recursive: true, force: true })
          }

          return true
        }
      ),
      { numRuns: 20 }
    )
  })
})
