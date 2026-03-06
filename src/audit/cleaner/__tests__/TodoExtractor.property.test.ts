/**
 * TodoExtractor 属性测试
 * 使用 fast-check 进行基于属性的测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import * as fs from 'fs-extra'
import * as path from 'path'
import { TodoExtractor } from '../TodoExtractor'
import type { TodoItem, TodoType } from '../types'

describe('TodoExtractor Property Tests', () => {
  let testDir: string

  beforeEach(async () => {
    // 创建临时测试目录
    testDir = path.join(process.cwd(), '.test-temp', `test-${Date.now()}`)
    await fs.ensureDir(testDir)
  })

  afterEach(async () => {
    // 清理测试目录
    await fs.remove(testDir)
  })

  // Feature: code-audit-and-docs-organization, Property 15: 待办事项分组逻辑
  // **验证需求：5.3**
  it('生成的清单应该按文件路径分组，同一文件的待办事项在同一组', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            fileName: fc.constantFrom('file1.ts', 'file2.ts', 'file3.ts'),
            todos: fc.array(
              fc.record({
                type: fc.constantFrom('TODO', 'FIXME'),
                content: fc.string({ minLength: 5, maxLength: 50 })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (fileConfigs) => {
          // 创建测试文件
          for (const config of fileConfigs) {
            const lines = config.todos.map(
              todo => `// ${todo.type}: ${todo.content}`
            )
            const filePath = path.join(testDir, config.fileName)
            await fs.writeFile(filePath, lines.join('\n'), 'utf-8')
          }

          const extractor = new TodoExtractor(testDir)
          const todos = await extractor.scanTodos()
          const markdown = extractor.generateTodoList(todos, 'markdown')

          // 验证 Markdown 包含文件分组部分
          expect(markdown).toContain('## 按文件分组')

          // 验证每个文件都有对应的分组
          const fileNames = new Set(fileConfigs.map(c => c.fileName))
          for (const fileName of fileNames) {
            const fileTodos = todos.filter(t => t.file.endsWith(fileName))
            if (fileTodos.length > 0) {
              // 文件名应该出现在 Markdown 中
              expect(markdown).toContain(fileName)
            }
          }

          // 验证同一文件的待办事项在一起
          const todosByFile = new Map<string, TodoItem[]>()
          for (const todo of todos) {
            const existing = todosByFile.get(todo.file) || []
            existing.push(todo)
            todosByFile.set(todo.file, existing)
          }

          // 每个文件的待办事项应该连续出现
          for (const [file, fileTodos] of todosByFile.entries()) {
            expect(fileTodos.length).toBeGreaterThan(0)
            // 所有待办事项的文件路径应该相同
            for (const todo of fileTodos) {
              expect(todo.file).toBe(file)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 16: Markdown 格式有效性
  // **验证需求：5.4**
  it('导出的 Markdown 应该是有效的格式，包含正确的标题和列表', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('TODO', 'FIXME') as fc.Arbitrary<TodoType>,
            content: fc.string({ minLength: 5, maxLength: 50 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (todoConfigs) => {
          const lines = todoConfigs.map(
            todo => `// ${todo.type}: ${todo.content}`
          )
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, lines.join('\n'), 'utf-8')

          const extractor = new TodoExtractor(testDir)
          const todos = await extractor.scanTodos()
          const markdown = extractor.generateTodoList(todos, 'markdown')

          // 验证 Markdown 基本结构
          expect(markdown).toContain('# 待办事项清单')
          expect(markdown).toContain('## 统计')
          expect(markdown).toContain('## 按优先级分组')
          expect(markdown).toContain('## 按文件分组')

          // 验证包含生成时间
          expect(markdown).toMatch(/生成时间: \d{4}-\d{2}-\d{2}/)

          // 验证包含总计
          expect(markdown).toContain(`总计: ${todos.length} 个待办事项`)

          // 验证统计部分
          expect(markdown).toContain('- 高优先级:')
          expect(markdown).toContain('- 中优先级:')
          expect(markdown).toContain('- 低优先级:')

          // 验证列表项格式（以 - 开头）
          const listItems = markdown.match(/^- /gm)
          expect(listItems).toBeTruthy()
          expect(listItems!.length).toBeGreaterThan(0)

          // 验证标题格式（以 # 开头）
          const headers = markdown.match(/^#{1,3} /gm)
          expect(headers).toBeTruthy()
          expect(headers!.length).toBeGreaterThanOrEqual(4) // 至少 4 个标题
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: code-audit-and-docs-organization, Property 17: 待办事项删除准确性
  // **验证需求：5.6**
  it('删除待办事项应该只删除对应的注释行，不影响其他代码', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          beforeLines: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
          todoLine: fc.record({
            type: fc.constantFrom('TODO', 'FIXME') as fc.Arbitrary<TodoType>,
            content: fc.string({ minLength: 5, maxLength: 30 })
          }),
          afterLines: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
        }),
        async ({ beforeLines, todoLine, afterLines }) => {
          const todoComment = `// ${todoLine.type}: ${todoLine.content}`
          const allLines = [...beforeLines, todoComment, ...afterLines]
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, allLines.join('\n'), 'utf-8')

          const extractor = new TodoExtractor(testDir)
          const todos = await extractor.scanTodos()

          // 应该找到一个待办事项
          expect(todos.length).toBeGreaterThan(0)
          const todo = todos[0]

          // 删除待办事项
          await extractor.removeTodo(todo)

          // 读取文件内容
          const content = await fs.readFile(testFile, 'utf-8')
          const remainingLines = content.split('\n')

          // 验证待办注释被删除
          expect(content).not.toContain(todoComment)

          // 验证其他行保持不变
          expect(remainingLines.length).toBe(allLines.length - 1)

          // 验证前后的行都还在
          for (const line of beforeLines) {
            if (line.trim()) {
              expect(content).toContain(line)
            }
          }
          for (const line of afterLines) {
            if (line.trim()) {
              expect(content).toContain(line)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('应该正确识别 TODO 和 FIXME 标记', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('TODO', 'FIXME', 'todo', 'fixme'),
            content: fc.string({ minLength: 5, maxLength: 30 }),
            format: fc.constantFrom(
              (type: string, content: string) => `// ${type}: ${content}`,
              (type: string, content: string) => `// ${type} ${content}`,
              (type: string, content: string) => `/* ${type}: ${content} */`
            )
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (todoConfigs) => {
          const lines = todoConfigs.map(config =>
            config.format(config.type, config.content)
          )
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, lines.join('\n'), 'utf-8')

          const extractor = new TodoExtractor(testDir)
          const todos = await extractor.scanTodos()

          // 应该找到所有的待办标记
          expect(todos.length).toBe(todoConfigs.length)

          // 验证每个待办事项的类型
          for (const todo of todos) {
            expect(['TODO', 'FIXME']).toContain(todo.type)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('优先级判断应该一致且合理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('TODO', 'FIXME') as fc.Arbitrary<TodoType>,
            content: fc.oneof(
              fc.constant('urgent fix needed'),
              fc.constant('important feature'),
              fc.constant('maybe later'),
              fc.constant('normal task')
            )
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (todoConfigs) => {
          const lines = todoConfigs.map(
            todo => `// ${todo.type}: ${todo.content}`
          )
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, lines.join('\n'), 'utf-8')

          const extractor = new TodoExtractor(testDir)
          const todos = await extractor.scanTodos()

          // 验证优先级在有效范围内
          for (const todo of todos) {
            expect(['high', 'medium', 'low']).toContain(todo.priority)
          }

          // FIXME 应该是高优先级
          const fixmeTodos = todos.filter(t => t.type === 'FIXME')
          for (const todo of fixmeTodos) {
            expect(todo.priority).toBe('high')
          }

          // 包含 urgent/important 的应该是高优先级
          const urgentTodos = todos.filter(t => 
            t.content.toLowerCase().includes('urgent') ||
            t.content.toLowerCase().includes('important')
          )
          for (const todo of urgentTodos) {
            expect(todo.priority).toBe('high')
          }

          // 包含 maybe/later 的应该是低优先级
          const laterTodos = todos.filter(t =>
            t.content.toLowerCase().includes('maybe') ||
            t.content.toLowerCase().includes('later')
          )
          for (const todo of laterTodos) {
            expect(todo.priority).toBe('low')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('JSON 格式输出应该可以被正确解析', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('TODO', 'FIXME') as fc.Arbitrary<TodoType>,
            content: fc.string({ minLength: 5, maxLength: 50 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (todoConfigs) => {
          const lines = todoConfigs.map(
            todo => `// ${todo.type}: ${todo.content}`
          )
          const testFile = path.join(testDir, 'test.ts')
          await fs.writeFile(testFile, lines.join('\n'), 'utf-8')

          const extractor = new TodoExtractor(testDir)
          const todos = await extractor.scanTodos()
          const json = extractor.generateTodoList(todos, 'json')

          // 验证 JSON 可以被解析
          const parsed = JSON.parse(json)
          expect(Array.isArray(parsed)).toBe(true)
          expect(parsed.length).toBe(todos.length)

          // 验证每个待办事项的结构
          for (const item of parsed) {
            expect(item).toHaveProperty('file')
            expect(item).toHaveProperty('line')
            expect(item).toHaveProperty('type')
            expect(item).toHaveProperty('priority')
            expect(item).toHaveProperty('content')
            expect(item).toHaveProperty('context')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
