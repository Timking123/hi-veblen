# API 文档

本文档描述代码审计工具的公共 API。

## 核心类

### AuditTool

审计工具核心类，负责协调各个检查器的执行，聚合结果，生成报告。

#### 构造函数

```typescript
constructor(options?: AuditToolOptions)
```

**参数：**

- `options` - 审计工具选项（可选）
  - `rootDir` - 项目根目录，默认为当前工作目录
  - `config` - 审计配置（部分配置）
  - `incremental` - 是否为增量检查模式
  - `changedFiles` - 增量检查的文件列表

**示例：**

```typescript
const tool = new AuditTool({
  rootDir: '/path/to/project',
  config: {
    checks: {
      comments: true,
      debug: true,
      todos: true
    },
    thresholds: {
      commentCoverage: 0.6,
      commentQuality: 60
    }
  }
})
```

#### 方法

##### run()

运行审计检查。

```typescript
async run(): Promise<AuditResult>
```

**返回值：** `Promise<AuditResult>` - 审计结果

**示例：**

```typescript
const result = await tool.run()
console.log(`发现 ${result.summary.totalIssues} 个问题`)
```

---

### ESLintMigrator

ESLint 配置迁移器，负责将旧版 `.eslintrc.cjs` 格式转换为新版 `eslint.config.js` 扁平配置格式。

#### 构造函数

```typescript
constructor(rootDir?: string)
```

**参数：**

- `rootDir` - 项目根目录，默认为当前工作目录

#### 方法

##### generateNewConfig()

生成新版配置文件。

```typescript
generateNewConfig(oldConfig: LegacyConfig): ESLintConfig[]
```

**参数：**

- `oldConfig` - 旧配置对象

**返回值：** `ESLintConfig[]` - 新配置对象数组

##### migrate()

迁移 ESLint 配置。

```typescript
async migrate(options: MigrateOptions): Promise<MigrateResult>
```

**参数：**

- `options` - 迁移选项
  - `dryRun` - 是否为预览模式（不实际执行）
  - `backup` - 是否创建备份
  - `deleteOld` - 是否删除旧配置文件

**返回值：** `Promise<MigrateResult>` - 迁移结果

**示例：**

```typescript
const migrator = new ESLintMigrator('/path/to/project')
const result = await migrator.migrate({
  dryRun: false,
  backup: true,
  deleteOld: false
})
```

---

### CommentChecker

注释检查器，负责验证代码注释是否符合中文注释规范。

#### 构造函数

```typescript
constructor(qualityThreshold?: number)
```

**参数：**

- `qualityThreshold` - 质量评分阈值，默认 60

#### 方法

##### check()

检查文件的注释质量。

```typescript
async check(files: string[]): Promise<CommentCheckResult>
```

**参数：**

- `files` - 要检查的文件列表

**返回值：** `Promise<CommentCheckResult>` - 检查结果

**示例：**

```typescript
const checker = new CommentChecker(70)
const result = await checker.check([
  'src/utils/helper.ts',
  'src/components/Button.vue'
])
```

---

### DocOrganizer

文档整理器，负责归档和组织项目文档。

#### 构造函数

```typescript
constructor(projectRoot?: string)
```

**参数：**

- `projectRoot` - 项目根目录，默认为当前工作目录

#### 方法

##### organize()

整理文档结构。

```typescript
async organize(options: OrganizeOptions): Promise<OrganizeResult>
```

**参数：**

- `options` - 整理选项
  - `dryRun` - 是否为预览模式（不实际执行）
  - `backup` - 是否创建备份
  - `updateLinks` - 是否更新文档链接

**返回值：** `Promise<OrganizeResult>` - 整理结果

**示例：**

```typescript
const organizer = new DocOrganizer('/path/to/project')
const result = await organizer.organize({
  dryRun: false,
  backup: true,
  updateLinks: true
})
```

##### scanDocuments()

扫描项目中的文档文件。

```typescript
async scanDocuments(): Promise<DocumentFile[]>
```

**返回值：** `Promise<DocumentFile[]>` - 文档文件列表

---

### CodeCleaner

代码清理器，负责清理调试代码和管理待办标记。

#### 构造函数

```typescript
constructor(rootDir?: string)
```

**参数：**

- `rootDir` - 项目根目录，默认为当前工作目录

#### 方法

##### scanDebugCode()

扫描调试代码。

```typescript
async scanDebugCode(files: string[]): Promise<DebugCodeLocation[]>
```

**参数：**

- `files` - 要扫描的文件列表

**返回值：** `Promise<DebugCodeLocation[]>` - 调试代码位置列表

##### cleanDebugCode()

清理调试代码。

```typescript
async cleanDebugCode(options: CleanOptions): Promise<CleanResult>
```

**参数：**

- `options` - 清理选项
  - `mode` - 清理模式（'interactive' | 'batch'）
  - `dryRun` - 是否为预览模式
  - `backup` - 是否创建备份

**返回值：** `Promise<CleanResult>` - 清理结果

---

### TodoExtractor

待办标记提取器，负责扫描和管理代码中的 TODO 和 FIXME 标记。

#### 构造函数

```typescript
constructor(rootDir?: string)
```

**参数：**

- `rootDir` - 项目根目录，默认为当前工作目录

#### 方法

##### scanTodos()

扫描待办标记。

```typescript
async scanTodos(files: string[]): Promise<TodoItem[]>
```

**参数：**

- `files` - 要扫描的文件列表

**返回值：** `Promise<TodoItem[]>` - 待办标记列表

##### generateTodoList()

生成待办事项清单。

```typescript
generateTodoList(todos: TodoItem[], format: 'markdown' | 'json'): string
```

**参数：**

- `todos` - 待办标记列表
- `format` - 输出格式（'markdown' | 'json'）

**返回值：** `string` - 清单内容

---

### Reporter

报告生成器，负责生成 JSON、HTML 和 JUnit XML 格式的审计报告。

#### 方法

##### generateJSON()

生成 JSON 报告。

```typescript
async generateJSON(result: AuditResult, outputPath: string): Promise<void>
```

**参数：**

- `result` - 审计结果
- `outputPath` - 输出路径

##### generateHTML()

生成 HTML 报告。

```typescript
async generateHTML(result: AuditResult, outputPath: string): Promise<void>
```

**参数：**

- `result` - 审计结果
- `outputPath` - 输出路径

##### generateJUnit()

生成 JUnit XML 报告。

```typescript
async generateJUnit(result: AuditResult, outputPath: string): Promise<void>
```

**参数：**

- `result` - 审计结果
- `outputPath` - 输出路径

##### logCI()

输出 CI 模式日志。

```typescript
logCI(result: AuditResult): void
```

**参数：**

- `result` - 审计结果

---

## 类型定义

### AuditConfig

审计配置接口。

```typescript
interface AuditConfig {
  /** 项目根目录（可选） */
  rootDir?: string
  
  /** 要执行的检查 */
  checks: {
    eslint: boolean      // ESLint 检查
    comments: boolean    // 注释检查
    debug: boolean       // 调试代码检查
    todos: boolean       // 待办标记检查
  }
  
  /** 质量阈值 */
  thresholds: {
    commentCoverage: number  // 注释覆盖率（0-1）
    commentQuality: number   // 注释质量评分（0-100）
  }
  
  /** 输出配置 */
  output: {
    format: 'json' | 'html' | 'junit'  // 报告格式
    path: string                        // 输出路径
  }
  
  /** CI 模式 */
  ci: boolean
  
  /** 自动修复 */
  fix: boolean
}
```

### AuditResult

审计结果接口。

```typescript
interface AuditResult {
  /** 是否成功（无错误） */
  success: boolean
  
  /** 时间戳 */
  timestamp: string
  
  /** 运行环境 */
  environment: string
  
  /** 检查结果列表 */
  checks: CheckResult[]
  
  /** 审计摘要 */
  summary: AuditSummary
}
```

### CheckResult

检查结果接口。

```typescript
interface CheckResult {
  /** 检查名称 */
  name: string
  
  /** 是否通过 */
  passed: boolean
  
  /** 问题列表 */
  issues: Issue[]
  
  /** 指标数据（可选） */
  metrics?: Record<string, number>
}
```

### Issue

问题详情接口。

```typescript
interface Issue {
  /** 文件路径 */
  file: string
  
  /** 行号 */
  line: number
  
  /** 列号（可选） */
  column?: number
  
  /** 严重程度 */
  severity: 'error' | 'warning' | 'info'
  
  /** 问题描述 */
  message: string
  
  /** 规则名称（可选） */
  rule?: string
}
```

### AuditSummary

审计摘要接口。

```typescript
interface AuditSummary {
  /** 检查的文件总数 */
  totalFiles: number
  
  /** 问题总数 */
  totalIssues: number
  
  /** 错误数量 */
  errorCount: number
  
  /** 警告数量 */
  warningCount: number
  
  /** 信息数量 */
  infoCount: number
}
```

---

## 工具函数

### fileUtils

文件操作工具函数。

#### readFile()

读取文件内容。

```typescript
async function readFile(filePath: string): Promise<string>
```

#### writeFile()

写入文件内容。

```typescript
async function writeFile(filePath: string, content: string): Promise<void>
```

#### ensureDir()

确保目录存在。

```typescript
async function ensureDir(dirPath: string): Promise<void>
```

#### getRelativePath()

获取文件的相对路径。

```typescript
function getRelativePath(from: string, to: string): string
```

#### resolveRelativePath()

解析相对路径为绝对路径。

```typescript
function resolveRelativePath(from: string, relativePath: string): string
```

---

## 使用示例

### 基本使用

```typescript
import { AuditTool } from './audit/AuditTool'

const tool = new AuditTool({
  config: {
    checks: {
      comments: true,
      debug: true,
      todos: true
    },
    thresholds: {
      commentCoverage: 0.6,
      commentQuality: 60
    },
    output: {
      format: 'json',
      path: './audit-report'
    }
  }
})

const result = await tool.run()
```

### ESLint 配置迁移

```typescript
import { ESLintMigrator } from './audit/eslint/ESLintMigrator'

const migrator = new ESLintMigrator()
const result = await migrator.migrate({
  dryRun: false,
  backup: true,
  deleteOld: false
})
```

### 文档整理

```typescript
import { DocOrganizer } from './audit/docs/DocOrganizer'

const organizer = new DocOrganizer()
const result = await organizer.organize({
  dryRun: false,
  backup: true,
  updateLinks: true
})
```

### 生成报告

```typescript
import { Reporter } from './audit/reporter/Reporter'

const reporter = new Reporter()

// JSON 报告
await reporter.generateJSON(result, './report.json')

// HTML 报告
await reporter.generateHTML(result, './report.html')

// JUnit XML 报告
await reporter.generateJUnit(result, './report.xml')
```

---

## 错误处理

所有异步方法都可能抛出错误。建议使用 try-catch 块进行错误处理：

```typescript
try {
  const result = await tool.run()
  console.log('审计成功')
} catch (error) {
  console.error('审计失败:', error.message)
  process.exit(1)
}
```

---

## 更多信息

- [README.md](./README.md) - 项目概述和快速开始
- [设计文档](../../.kiro/specs/code-audit-and-docs-organization/design.md) - 详细的设计文档
- [需求文档](../../.kiro/specs/code-audit-and-docs-organization/requirements.md) - 功能需求
