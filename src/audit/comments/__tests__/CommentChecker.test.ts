/**
 * CommentChecker 单元测试
 * 测试典型场景和边界情况
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CommentChecker } from '../CommentChecker'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

describe('CommentChecker 单元测试', () => {
  let tempDir: string
  let checker: CommentChecker

  beforeEach(async () => {
    // 创建临时目录
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'comment-checker-test-'))
    checker = new CommentChecker()
  })

  afterEach(async () => {
    // 清理临时目录
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('典型代码文件的注释检查', () => {
    it('应该检查包含函数的 TypeScript 文件', async () => {
      const filePath = path.join(tempDir, 'functions.ts')
      const content = `// 计算两个数的和
export function add(a: number, b: number): number {
  return a + b
}

function multiply(a: number, b: number): number {
  return a * b
}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      expect(result.files[0].path).toBe(filePath)
      
      // 应该识别到缺少注释的函数
      const missingMultiply = result.files[0].missingComments.find(
        m => m.name === 'multiply'
      )
      expect(missingMultiply).toBeDefined()
      
      // add 函数有注释，不应该被标记为缺失
      const missingAdd = result.files[0].missingComments.find(
        m => m.name === 'add'
      )
      expect(missingAdd).toBeUndefined()
    })

    it('应该检查包含类的 TypeScript 文件', async () => {
      const filePath = path.join(tempDir, 'classes.ts')
      const content = `
// 用户类
export class User {
  name: string
  
  constructor(name: string) {
    this.name = name
  }
  
  // 获取用户名
  getName(): string {
    return this.name
  }
  
  setName(name: string): void {
    this.name = name
  }
}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      
      // setName 方法没有注释，应该被标记
      const missingSetName = result.files[0].missingComments.find(
        m => m.name === 'setName' && m.type === 'method'
      )
      expect(missingSetName).toBeDefined()
      
      // getName 方法有注释，不应该被标记
      const missingGetName = result.files[0].missingComments.find(
        m => m.name === 'getName'
      )
      expect(missingGetName).toBeUndefined()
    })

    it('应该检查包含接口的 TypeScript 文件', async () => {
      const filePath = path.join(tempDir, 'interfaces.ts')
      const content = `
// 用户接口
export interface IUser {
  name: string
  age: number
}

export interface IProduct {
  id: string
  price: number
}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      
      // IProduct 接口没有注释，应该被标记
      const missingProduct = result.files[0].missingComments.find(
        m => m.name === 'IProduct' && m.type === 'interface'
      )
      expect(missingProduct).toBeDefined()
      
      // IUser 接口有注释，不应该被标记
      const missingUser = result.files[0].missingComments.find(
        m => m.name === 'IUser'
      )
      expect(missingUser).toBeUndefined()
    })
  })

  describe('边界情况', () => {
    it('应该处理空文件', async () => {
      const filePath = path.join(tempDir, 'empty.ts')
      await fs.writeFile(filePath, '', 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      expect(result.files[0].missingComments.length).toBe(0)
      expect(result.files[0].coverage).toBe(1) // 空文件视为完全覆盖
    })

    it('应该处理只有注释的文件', async () => {
      const filePath = path.join(tempDir, 'comments-only.ts')
      const content = `
// 这是一个注释
// 这是另一个注释
/* 
 * 这是块注释
 */
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      expect(result.files[0].missingComments.length).toBe(0)
    })

    it('应该处理没有注释的文件', async () => {
      const filePath = path.join(tempDir, 'no-comments.ts')
      const content = `
export function test1() {}
export function test2() {}
export class TestClass {}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      expect(result.files[0].missingComments.length).toBeGreaterThan(0)
      expect(result.files[0].coverage).toBeLessThan(0.5)
      expect(result.files[0].qualityScore).toBeLessThan(60)
    })

    it('应该处理语法错误的文件', async () => {
      const filePath = path.join(tempDir, 'syntax-error.ts')
      const content = `
export function test() {
  // 缺少闭合括号
`
      await fs.writeFile(filePath, content, 'utf-8')

      // 应该跳过无法解析的文件，不抛出错误
      const result = await checker.check([filePath])

      // 由于文件解析失败，应该被跳过
      expect(result.files.length).toBe(0)
    })
  })

  describe('Vue 组件的注释检查', () => {
    it('应该检查 Vue 单文件组件', async () => {
      const filePath = path.join(tempDir, 'Component.vue')
      const content = `<template>
  <div>{{ message }}</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// 消息内容
const message = ref('Hello')

function updateMessage(newMessage: string) {
  message.value = newMessage
}
</script>

<style scoped>
div {
  color: blue;
}
</style>
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      // 验证：Vue 文件应该能够被成功解析
      expect(result.files.length).toBe(1)
      expect(result.files[0].path).toBe(filePath)
      
      // 验证：应该能够识别到代码结构（可能包含缺失的注释）
      // 注意：Vue 文件的 AST 结构可能与普通 TS 文件不同
      expect(result.files[0].missingComments).toBeDefined()
    })

    it('应该检查带有 Options API 的 Vue 组件', async () => {
      const filePath = path.join(tempDir, 'OptionsComponent.vue')
      const content = `
<template>
  <div>{{ count }}</div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    // 增加计数
    increment() {
      this.count++
    },
    decrement() {
      this.count--
    }
  }
}
</script>
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      // Vue 组件应该能够被解析
      expect(result.files[0].path).toBe(filePath)
    })
  })

  describe('整体报告聚合', () => {
    it('应该正确聚合多个文件的结果', async () => {
      // 创建多个测试文件
      const file1 = path.join(tempDir, 'file1.ts')
      const file2 = path.join(tempDir, 'file2.ts')
      const file3 = path.join(tempDir, 'file3.ts')

      await fs.writeFile(file1, '// 注释\nexport function test1() {}', 'utf-8')
      await fs.writeFile(file2, 'export function test2() {}', 'utf-8')
      await fs.writeFile(file3, '// 注释\nexport function test3() {}', 'utf-8')

      const result = await checker.check([file1, file2, file3])

      expect(result.files.length).toBe(3)
      expect(result.overall.totalFiles).toBe(3)
      expect(result.overall.averageCoverage).toBeGreaterThanOrEqual(0)
      expect(result.overall.averageCoverage).toBeLessThanOrEqual(1)
      expect(result.overall.averageQuality).toBeGreaterThanOrEqual(0)
      expect(result.overall.averageQuality).toBeLessThanOrEqual(100)
    })

    it('应该识别低质量文件', async () => {
      const goodFile = path.join(tempDir, 'good.ts')
      const badFile = path.join(tempDir, 'bad.ts')

      // 好文件：有注释
      await fs.writeFile(goodFile, `
// 这是一个很好的函数
// 它有详细的注释
export function goodFunction() {
  return 'good'
}
`, 'utf-8')

      // 差文件：没有注释
      await fs.writeFile(badFile, `
export function badFunction1() {}
export function badFunction2() {}
export function badFunction3() {}
export class BadClass {}
`, 'utf-8')

      const result = await checker.check([goodFile, badFile])

      expect(result.files.length).toBe(2)
      expect(result.overall.filesWithLowQuality).toBeGreaterThan(0)
      expect(result.lowQualityFiles.length).toBeGreaterThan(0)
      
      // 差文件应该在低质量列表中
      expect(result.lowQualityFiles).toContain(badFile)
    })
  })

  describe('建议生成', () => {
    it('应该为缺少注释的公共 API 生成高优先级建议', async () => {
      const filePath = path.join(tempDir, 'api.ts')
      const content = `
export function publicAPI() {
  return 'public'
}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      expect(result.files[0].suggestions.length).toBeGreaterThan(0)
      
      // 应该有高优先级的建议
      const highPrioritySuggestions = result.files[0].suggestions.filter(
        s => s.priority === 'high'
      )
      expect(highPrioritySuggestions.length).toBeGreaterThan(0)
    })

    it('应该为低覆盖率文件生成建议', async () => {
      const filePath = path.join(tempDir, 'low-coverage.ts')
      const content = `
const x = 1
const y = 2
const z = 3
function test1() {}
function test2() {}
function test3() {}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      
      // 应该有关于覆盖率的建议
      const coverageSuggestions = result.files[0].suggestions.filter(
        s => s.message.includes('覆盖率')
      )
      expect(coverageSuggestions.length).toBeGreaterThan(0)
    })
  })

  describe('质量评分', () => {
    it('应该为有中文注释的文件给予更高评分', async () => {
      const chineseFile = path.join(tempDir, 'chinese.ts')
      const englishFile = path.join(tempDir, 'english.ts')

      await fs.writeFile(chineseFile, `
// 这是中文注释
export function test() {
  return 'test'
}
`, 'utf-8')

      await fs.writeFile(englishFile, `
// This is English comment
export function test() {
  return 'test'
}
`, 'utf-8')

      const chineseResult = await checker.check([chineseFile])
      const englishResult = await checker.check([englishFile])

      // 中文注释的文件应该有更高的质量评分
      expect(chineseResult.files[0].qualityScore).toBeGreaterThan(
        englishResult.files[0].qualityScore
      )
    })

    it('应该为完全覆盖的文件给予高分', async () => {
      const filePath = path.join(tempDir, 'full-coverage.ts')
      const content = `
// 函数 1
export function func1() {}

// 函数 2
export function func2() {}

// 类定义
export class MyClass {
  // 方法 1
  method1() {}
  
  // 方法 2
  method2() {}
}
`
      await fs.writeFile(filePath, content, 'utf-8')

      const result = await checker.check([filePath])

      expect(result.files.length).toBe(1)
      expect(result.files[0].qualityScore).toBeGreaterThan(70)
    })
  })
})
