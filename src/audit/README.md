# 代码审计和文档整理工具

一套完整的代码审计和文档整理工具，帮助提升代码质量和文档可维护性。

## 功能特性

- ✅ **ESLint 配置迁移** - 将旧版 `.eslintrc.cjs` 迁移到新版 `eslint.config.js` 格式
- ✅ **注释规范检查** - 确保所有代码注释使用中文，符合团队规范
- ✅ **文档结构整理** - 自动归档和组织项目文档
- ✅ **调试代码清理** - 扫描和清理 `console.debug` 等调试代码
- ✅ **待办标记管理** - 统一管理代码中的 TODO 和 FIXME 标记
- ✅ **多格式报告** - 支持 JSON、HTML 和 JUnit XML 格式报告
- ✅ **CI/CD 集成** - 支持持续集成环境，可作为构建流程的一部分

## 安装

```bash
# 安装依赖
npm install

# 构建工具
npm run build

# 全局安装（可选）
npm link
```

## 快速开始

### 命令行使用

```bash
# 运行完整审计
npx ts-node src/audit/cli.ts audit

# 只检查注释
npx ts-node src/audit/cli.ts audit --comments

# 自动修复问题
npx ts-node src/audit/cli.ts audit --fix

# 生成 HTML 报告
npx ts-node src/audit/cli.ts audit --report html --output ./reports/audit.html

# CI 模式
npx ts-node src/audit/cli.ts audit --ci --threshold 70
```

### API 使用

```typescript
import { AuditTool } from './audit/AuditTool'
import type { AuditConfig } from './audit/types'

// 配置审计工具
const config: AuditConfig = {
  rootDir: process.cwd(),
  checks: {
    eslint: false,
    comments: true,
    debug: true,
    todos: true
  },
  thresholds: {
    commentCoverage: 0.6,  // 注释覆盖率阈值（60%）
    commentQuality: 60     // 注释质量评分阈值（60 分）
  },
  output: {
    format: 'json',
    path: './audit-report'
  },
  ci: false,
  fix: false
}

// 创建审计工具实例
const tool = new AuditTool({ config })

// 运行审计
const result = await tool.run()

// 检查结果
if (result.success) {
  console.log('✓ 审计通过')
} else {
  console.log(`✗ 审计失败，发现 ${result.summary.totalIssues} 个问题`)
  process.exit(1)
}
```

## 命令行选项

### audit 命令

运行代码审计检查。

```bash
npx ts-node src/audit/cli.ts audit [options]
```

**选项：**

- `--eslint` - 运行 ESLint 检查
- `--comments` - 运行注释检查
- `--debug` - 检查调试代码
- `--todos` - 检查待办标记
- `--fix` - 自动修复可修复的问题
- `--ci` - 使用 CI 模式（简洁输出）
- `--report <format>` - 生成报告（json|html|junit），默认 json
- `--output <path>` - 报告输出路径，默认 ./audit-report
- `--threshold <number>` - 质量门槛，默认 60

**示例：**

```bash
# 运行所有检查
npx ts-node src/audit/cli.ts audit --eslint --comments --debug --todos

# 生成 HTML 报告
npx ts-node src/audit/cli.ts audit --comments --report html --output ./reports/audit

# CI 模式，设置质量门槛
npx ts-node src/audit/cli.ts audit --ci --threshold 70 --report junit
```

### migrate-eslint 命令

迁移 ESLint 配置文件。

```bash
npx ts-node src/audit/cli.ts migrate-eslint [options]
```

**选项：**

- `--dry-run` - 预览迁移而不执行
- `--backup` - 创建备份
- `--no-delete-old` - 保留旧配置文件

**示例：**

```bash
# 预览迁移
npx ts-node src/audit/cli.ts migrate-eslint --dry-run

# 执行迁移并创建备份
npx ts-node src/audit/cli.ts migrate-eslint --backup
```

### organize-docs 命令

整理文档结构。

```bash
npx ts-node src/audit/cli.ts organize-docs [options]
```

**选项：**

- `--dry-run` - 预览整理而不执行
- `--backup` - 创建备份
- `--update-links` - 更新文档链接（默认启用）

**示例：**

```bash
# 预览文档整理
npx ts-node src/audit/cli.ts organize-docs --dry-run

# 执行文档整理
npx ts-node src/audit/cli.ts organize-docs --backup
```

## 配置选项

### AuditConfig

```typescript
interface AuditConfig {
  // 项目根目录（可选，默认为当前工作目录）
  rootDir?: string
  
  // 要执行的检查
  checks: {
    eslint: boolean      // ESLint 检查
    comments: boolean    // 注释检查
    debug: boolean       // 调试代码检查
    todos: boolean       // 待办标记检查
  }
  
  // 质量阈值
  thresholds: {
    commentCoverage: number  // 注释覆盖率（0-1）
    commentQuality: number   // 注释质量评分（0-100）
  }
  
  // 输出配置
  output: {
    format: 'json' | 'html' | 'junit'  // 报告格式
    path: string                        // 输出路径
  }
  
  // CI 模式
  ci: boolean
  
  // 自动修复
  fix: boolean
}
```

## GitHub Actions 集成

在项目中创建 `.github/workflows/code-audit.yml`：

```yaml
name: Code Audit

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run code audit
        run: |
          npx ts-node src/audit/cli.ts audit \
            --comments \
            --debug \
            --todos \
            --ci \
            --threshold 70 \
            --report junit \
            --output ./audit-report
      
      - name: Upload audit report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: ./audit-report.xml
      
      - name: Publish test results
        if: always()
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: ./audit-report.xml
```

## 报告格式

### JSON 报告

```json
{
  "success": false,
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "development",
  "checks": [
    {
      "name": "comments",
      "passed": false,
      "issues": [
        {
          "file": "src/utils/helper.ts",
          "line": 10,
          "severity": "warning",
          "message": "函数 'formatDate' 缺少中文注释",
          "rule": "missing-chinese-comment"
        }
      ],
      "metrics": {
        "averageCoverage": 65,
        "averageQuality": 58,
        "lowQualityFiles": 12
      }
    }
  ],
  "summary": {
    "totalFiles": 150,
    "totalIssues": 23,
    "errorCount": 0,
    "warningCount": 23,
    "infoCount": 0
  }
}
```

### HTML 报告

生成可视化的 HTML 报告，包含：
- 审计状态概览
- 问题统计图表
- 详细的问题列表
- 文件级别的质量评分

### JUnit XML 报告

适用于 CI/CD 系统的标准 JUnit XML 格式报告。

## 项目结构

```
src/audit/
├── types.ts                    # 核心类型定义
├── constants.ts                # 常量配置
├── index.ts                    # 入口文件
├── cli.ts                      # 命令行接口
├── AuditTool.ts               # 审计工具核心
├── tsconfig.json              # TypeScript 配置
├── README.md                  # 项目说明
│
├── eslint/                    # ESLint 迁移器
│   ├── types.ts              # ESLint 相关类型
│   ├── ESLintMigrator.ts     # 配置迁移器
│   └── ConfigValidator.ts    # 配置验证器
│
├── comments/                  # 注释检查器
│   ├── types.ts              # 注释检查相关类型
│   ├── CommentChecker.ts     # 注释检查器
│   ├── CommentAnalyzer.ts    # 注释分析器
│   └── QualityScorer.ts      # 质量评分器
│
├── docs/                      # 文档整理器
│   ├── types.ts              # 文档整理相关类型
│   ├── DocOrganizer.ts       # 文档整理器
│   ├── PathResolver.ts       # 路径解析器
│   └── IndexGenerator.ts     # 索引生成器
│
├── cleaner/                   # 代码清理器
│   ├── types.ts              # 代码清理相关类型
│   ├── CodeCleaner.ts        # 代码清理器
│   └── TodoExtractor.ts      # 待办提取器
│
├── reporter/                  # 报告生成器
│   ├── types.ts              # 报告生成相关类型
│   └── Reporter.ts           # 报告生成器
│
└── utils/                     # 工具函数
    └── fileUtils.ts          # 文件操作工具
```

## 开发

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- src/audit/__tests__/AuditTool.test.ts

# 运行属性测试
npm test -- src/audit/__tests__/*.property.test.ts

# 查看测试覆盖率
npm test -- --coverage
```

### 测试策略

- **单元测试** - 验证具体示例和边界情况
- **属性测试** - 使用 fast-check 验证跨所有输入的通用属性
- **集成测试** - 验证完整的审计流程
- **端到端测试** - 测试真实场景下的工具行为

每个属性测试至少运行 100 次迭代，确保全面覆盖。

## 依赖项

- `@typescript-eslint/parser` - TypeScript 解析器
- `vue-eslint-parser` - Vue 文件解析器
- `eslint` - 代码检查工具
- `fast-check` - 属性测试框架
- `vitest` - 测试框架
- `fs-extra` - 文件系统操作
- `commander` - 命令行工具
- `glob` - 文件匹配

## 常见问题

### 如何跳过某些文件？

在项目根目录创建 `.auditignore` 文件（类似 `.gitignore`）：

```
node_modules/
dist/
*.test.ts
*.spec.ts
```

### 如何自定义注释质量评分？

注释质量评分基于以下因素：
- 注释覆盖率（30%）
- 公共 API 注释覆盖率（50%）
- 中文注释比例（20%）

可以通过修改 `QualityScorer.ts` 中的权重来自定义评分逻辑。

### 如何在 CI 中使用？

1. 设置 `--ci` 标志以获得简洁输出
2. 使用 `--threshold` 设置质量门槛
3. 使用 `--report junit` 生成 CI 友好的报告
4. 检查退出码（0 = 成功，非 0 = 失败）

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
