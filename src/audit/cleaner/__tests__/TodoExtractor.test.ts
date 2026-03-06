/**
 * TodoExtractor 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs-extra'
import * as path from 'path'
import { TodoExtractor } from '../TodoExtractor'

describe('TodoExtractor', () => {
  let testDir: string
  let extractor: TodoExtractor

  beforeEach(async () => {
    testDir = path.join(process.cwd(), '.test-temp', `test-${Date.now()}`)
    await fs.ensureDir(testDir)
    extractor = new TodoExtractor(testDir)
  })

  afterEach(async () => {
    await fs.remove(testDir)
  })

  describe('scanTodos', () => {
    it('应该扫描并找到所有 TODO 标记', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
// TODO: 实现这个功能
function test() {
  // FIXME: 修复这个 bug
  return null
}
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()

      expect(todos).toHaveLength(2)
      expect(todos[0].type).toBe('TODO')
      expect(todos[0].content).toContain('实现这个功能')
      expect(todos[1].type).toBe('FIXME')
      expect(todos[1].content).toContain('修复这个 bug')
    })

    it('应该识别不同格式的待办标记', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
// TODO: 格式1
// TODO 格式2
/* TODO: 格式3 */
// FIXME: 格式4
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()

      expect(todos.length).toBeGreaterThanOrEqual(3)
    })

    it('应该正确判断优先级', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
// FIXME: 这是高优先级
// TODO: urgent 紧急任务
// TODO: 普通任务
// TODO: maybe later 稍后处理
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()

      expect(todos).toHaveLength(4)
      
      // FIXME 应该是高优先级
      const fixme = todos.find(t => t.type === 'FIXME')
      expect(fixme?.priority).toBe('high')

      // 包含 urgent 的应该是高优先级
      const urgent = todos.find(t => t.content.includes('urgent'))
      expect(urgent?.priority).toBe('high')

      // 包含 later 的应该是低优先级
      const later = todos.find(t => t.content.includes('later'))
      expect(later?.priority).toBe('low')
    })

    it('应该提取上下文代码', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
line 1
line 2
// TODO: 待办事项
line 4
line 5
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()

      expect(todos).toHaveLength(1)
      expect(todos[0].context).toBeTruthy()
      expect(todos[0].context).toContain('TODO')
    })

    it('应该处理空文件', async () => {
      const testFile = path.join(testDir, 'empty.ts')
      await fs.writeFile(testFile, '', 'utf-8')

      const todos = await extractor.scanTodos()

      expect(todos).toHaveLength(0)
    })

    it('应该处理没有待办标记的文件', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
function test() {
  return 42
}
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()

      expect(todos).toHaveLength(0)
    })
  })

  describe('generateTodoList', () => {
    it('应该生成 Markdown 格式的清单', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
// TODO: 任务1
// FIXME: 任务2
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()
      const markdown = extractor.generateTodoList(todos, 'markdown')

      expect(markdown).toContain('# 待办事项清单')
      expect(markdown).toContain('## 统计')
      expect(markdown).toContain('## 按优先级分组')
      expect(markdown).toContain('## 按文件分组')
      expect(markdown).toContain('总计: 2 个待办事项')
    })

    it('应该生成 JSON 格式的清单', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = '// TODO: 测试任务'
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()
      const json = extractor.generateTodoList(todos, 'json')

      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0]).toHaveProperty('file')
      expect(parsed[0]).toHaveProperty('line')
      expect(parsed[0]).toHaveProperty('type')
      expect(parsed[0]).toHaveProperty('priority')
      expect(parsed[0]).toHaveProperty('content')
    })

    it('Markdown 应该按文件分组', async () => {
      const file1 = path.join(testDir, 'file1.ts')
      const file2 = path.join(testDir, 'file2.ts')
      
      await fs.writeFile(file1, '// TODO: 文件1任务', 'utf-8')
      await fs.writeFile(file2, '// TODO: 文件2任务', 'utf-8')

      const todos = await extractor.scanTodos()
      const markdown = extractor.generateTodoList(todos, 'markdown')

      expect(markdown).toContain('file1.ts')
      expect(markdown).toContain('file2.ts')
    })

    it('Markdown 应该包含优先级统计', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
// FIXME: 高优先级
// TODO: 中优先级
// TODO: maybe 低优先级
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()
      const markdown = extractor.generateTodoList(todos, 'markdown')

      expect(markdown).toContain('- 高优先级:')
      expect(markdown).toContain('- 中优先级:')
      expect(markdown).toContain('- 低优先级:')
    })
  })

  describe('removeTodo', () => {
    it('应该删除指定的待办标记', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
line 1
// TODO: 要删除的任务
line 3
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()
      expect(todos).toHaveLength(1)

      await extractor.removeTodo(todos[0])

      const afterContent = await fs.readFile(testFile, 'utf-8')
      expect(afterContent).not.toContain('TODO')
      expect(afterContent).toContain('line 1')
      expect(afterContent).toContain('line 3')
    })

    it('应该只删除匹配的待办标记', async () => {
      const testFile = path.join(testDir, 'test.ts')
      const content = `
// TODO: 任务1
// TODO: 任务2
      `.trim()
      await fs.writeFile(testFile, content, 'utf-8')

      const todos = await extractor.scanTodos()
      expect(todos).toHaveLength(2)

      // 只删除第一个
      await extractor.removeTodo(todos[0])

      const afterContent = await fs.readFile(testFile, 'utf-8')
      const remainingTodos = afterContent.split('\n').filter(l => l.includes('TODO'))
      expect(remainingTodos).toHaveLength(1)
    })
  })
})
