#!/usr/bin/env node
/**
 * 代码审计工具命令行接口
 * 
 * 提供三个主要命令：
 * - audit: 运行代码审计
 * - migrate-eslint: 迁移 ESLint 配置
 * - organize-docs: 整理文档结构
 */

import { Command } from 'commander'
import { AuditTool } from './AuditTool'
import { ESLintMigrator } from './eslint/ESLintMigrator'
import { DocOrganizer } from './docs/DocOrganizer'
import type { AuditConfig } from './types'

const program = new Command()

program
  .name('code-audit')
  .description('代码审计和文档整理工具')
  .version('1.0.0')

// audit 命令：运行代码审计
program
  .command('audit')
  .description('运行代码审计')
  .option('--eslint', '运行 ESLint 检查')
  .option('--comments', '运行注释检查')
  .option('--debug', '检查调试代码')
  .option('--todos', '检查待办标记')
  .option('--fix', '自动修复可修复的问题')
  .option('--ci', '使用 CI 模式')
  .option('--report <format>', '生成报告 (json|html|junit)', 'json')
  .option('--output <path>', '报告输出路径', './audit-report')
  .option('--threshold <number>', '质量门槛', '60')
  .option('--coverage <number>', '注释覆盖率门槛', '0.6')
  .action(async (options) => {
    try {
      // 构建配置
      const config: Partial<AuditConfig> = {
        checks: {
          eslint: options.eslint || false,
          comments: options.comments || false,
          debug: options.debug || false,
          todos: options.todos || false
        },
        thresholds: {
          commentCoverage: parseFloat(options.coverage),
          commentQuality: parseInt(options.threshold, 10)
        },
        output: {
          format: options.report,
          path: options.output
        },
        ci: options.ci || false,
        fix: options.fix || false
      }

      // 如果没有指定任何检查，则启用所有检查
      if (!options.eslint && !options.comments && !options.debug && !options.todos) {
        config.checks = {
          eslint: false, // ESLint 检查需要单独实现
          comments: true,
          debug: true,
          todos: true
        }
      }

      // 运行审计
      const tool = new AuditTool({ config })
      const result = await tool.run()

      // 根据结果设置退出码
      if (!result.success) {
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ 审计失败:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

// migrate-eslint 命令：迁移 ESLint 配置
program
  .command('migrate-eslint')
  .description('迁移 ESLint 配置到新版格式')
  .option('--dry-run', '预览迁移而不执行')
  .option('--backup', '创建备份')
  .option('--no-delete-old', '保留旧配置文件')
  .action(async (options) => {
    try {
      const migrator = new ESLintMigrator()
      const result = await migrator.migrate({
        dryRun: options.dryRun || false,
        backup: options.backup || false,
        deleteOld: options.deleteOld !== false
      })

      if (result.success) {
        console.log('✅ ESLint 配置迁移成功')
        console.log(`新配置文件: ${result.configPath}`)
        
        if (result.backupPath) {
          console.log(`备份文件: ${result.backupPath}`)
        }
        
        if (result.differences.length > 0) {
          console.log('\n⚠️  发现配置差异:')
          for (const diff of result.differences) {
            console.log(`  - ${diff.type}: ${diff.message}`)
          }
        }
      } else {
        console.error('❌ ESLint 配置迁移失败')
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ 迁移失败:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

// organize-docs 命令：整理文档结构
program
  .command('organize-docs')
  .description('整理文档结构')
  .option('--dry-run', '预览整理而不执行')
  .option('--backup', '创建备份')
  .option('--no-update-links', '不更新文档链接')
  .action(async (options) => {
    try {
      const organizer = new DocOrganizer()
      const result = await organizer.organize({
        dryRun: options.dryRun || false,
        backup: options.backup || false,
        updateLinks: options.updateLinks !== false
      })

      if (result.success) {
        console.log('✅ 文档整理成功')
        console.log(`移动了 ${result.movedFiles.length} 个文件`)
        console.log(`更新了 ${result.updatedLinks.length} 个链接`)
        console.log(`文档索引: ${result.indexPath}`)
        
        if (options.dryRun) {
          console.log('\n📋 预览模式 - 未实际执行操作')
          console.log('\n将要移动的文件:')
          for (const move of result.movedFiles.slice(0, 10)) {
            console.log(`  ${move.from} -> ${move.to}`)
          }
          if (result.movedFiles.length > 10) {
            console.log(`  ... 还有 ${result.movedFiles.length - 10} 个文件`)
          }
        }
      } else {
        console.error('❌ 文档整理失败')
        process.exit(1)
      }
    } catch (error) {
      console.error('❌ 整理失败:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  })

// 解析命令行参数
program.parse()
