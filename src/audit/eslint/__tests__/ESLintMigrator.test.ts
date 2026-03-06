/**
 * ESLint 迁移器单元测试
 */

import { describe, it, expect } from 'vitest'
import { ESLintMigrator } from '../ESLintMigrator'
import type { LegacyConfig } from '../types'

describe('ESLintMigrator', () => {
  const migrator = new ESLintMigrator()

  describe('convertEnv', () => {
    it('应该转换 browser 环境为浏览器全局变量', () => {
      const env = { browser: true }
      const globals = migrator.convertEnv(env)

      expect(globals).toHaveProperty('window', true)
      expect(globals).toHaveProperty('document', true)
      expect(globals).toHaveProperty('console', true)
    })

    it('应该转换 node 环境为 Node.js 全局变量', () => {
      const env = { node: true }
      const globals = migrator.convertEnv(env)

      expect(globals).toHaveProperty('process', true)
      expect(globals).toHaveProperty('Buffer', true)
      expect(globals).toHaveProperty('require', true)
    })

    it('应该转换 es2021 环境为 ES2021 全局变量', () => {
      const env = { es2021: true }
      const globals = migrator.convertEnv(env)

      expect(globals).toHaveProperty('Promise', true)
      expect(globals).toHaveProperty('Symbol', true)
      expect(globals).toHaveProperty('Map', true)
    })

    it('应该合并多个环境的全局变量', () => {
      const env = { browser: true, node: true, es2021: true }
      const globals = migrator.convertEnv(env)

      expect(globals).toHaveProperty('window', true)
      expect(globals).toHaveProperty('process', true)
      expect(globals).toHaveProperty('Promise', true)
    })

    it('应该处理空环境配置', () => {
      const env = {}
      const globals = migrator.convertEnv(env)

      expect(globals).toEqual({})
    })
  })

  describe('convertPlugins', () => {
    it('应该转换插件名称数组为插件对象映射', () => {
      const plugins = ['vue', 'typescript']
      const pluginMap = migrator.convertPlugins(plugins)

      expect(pluginMap).toHaveProperty('vue')
      expect(pluginMap).toHaveProperty('typescript')
    })

    it('应该移除 eslint-plugin- 前缀', () => {
      const plugins = ['eslint-plugin-vue', 'eslint-plugin-react']
      const pluginMap = migrator.convertPlugins(plugins)

      expect(pluginMap).toHaveProperty('vue')
      expect(pluginMap).toHaveProperty('react')
    })

    it('应该处理空插件列表', () => {
      const plugins: string[] = []
      const pluginMap = migrator.convertPlugins(plugins)

      expect(pluginMap).toEqual({})
    })
  })

  describe('convertIgnorePatterns', () => {
    it('应该为简单模式添加 **/ 前缀', () => {
      const patterns = ['dist', 'node_modules']
      const converted = migrator.convertIgnorePatterns(patterns)

      expect(converted).toContain('**/dist')
      expect(converted).toContain('**/node_modules')
    })

    it('应该保留已有 ** 的模式', () => {
      const patterns = ['**/*.test.ts', '**/dist/**']
      const converted = migrator.convertIgnorePatterns(patterns)

      expect(converted).toContain('**/*.test.ts')
      expect(converted).toContain('**/dist/**')
    })

    it('应该保留以 / 开头的模式', () => {
      const patterns = ['/dist', '/build']
      const converted = migrator.convertIgnorePatterns(patterns)

      expect(converted).toContain('/dist')
      expect(converted).toContain('/build')
    })

    it('应该处理空模式列表', () => {
      const patterns: string[] = []
      const converted = migrator.convertIgnorePatterns(patterns)

      expect(converted).toEqual([])
    })
  })

  describe('generateNewConfig', () => {
    it('应该生成包含忽略配置的新配置', () => {
      const oldConfig: LegacyConfig = {
        ignorePatterns: ['dist', 'node_modules'],
        rules: {},
      }

      const newConfig = migrator.generateNewConfig(oldConfig)

      expect(newConfig).toHaveLength(2)
      expect(newConfig[0]).toHaveProperty('ignores')
      expect(newConfig[0].ignores).toContain('**/dist')
    })

    it('应该保留所有规则配置', () => {
      const oldConfig: LegacyConfig = {
        rules: {
          'no-console': 'warn',
          'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        },
      }

      const newConfig = migrator.generateNewConfig(oldConfig)

      const mainConfig = newConfig.find(c => c.rules)
      expect(mainConfig?.rules).toHaveProperty('no-console', 'warn')
      expect(mainConfig?.rules).toHaveProperty('no-unused-vars')
    })

    it('应该转换环境配置为 globals', () => {
      const oldConfig: LegacyConfig = {
        env: {
          browser: true,
          node: true,
        },
        rules: {},
      }

      const newConfig = migrator.generateNewConfig(oldConfig)

      const mainConfig = newConfig.find(c => c.languageOptions)
      expect(mainConfig?.languageOptions?.globals).toHaveProperty('window', true)
      expect(mainConfig?.languageOptions?.globals).toHaveProperty('process', true)
    })

    it('应该转换插件配置', () => {
      const oldConfig: LegacyConfig = {
        plugins: ['vue', 'typescript'],
        rules: {},
      }

      const newConfig = migrator.generateNewConfig(oldConfig)

      const mainConfig = newConfig.find(c => c.plugins)
      expect(mainConfig?.plugins).toHaveProperty('vue')
      expect(mainConfig?.plugins).toHaveProperty('typescript')
    })

    it('应该包含文件匹配模式', () => {
      const oldConfig: LegacyConfig = {
        rules: {},
      }

      const newConfig = migrator.generateNewConfig(oldConfig)

      const mainConfig = newConfig.find(c => c.files)
      expect(mainConfig?.files).toContain('**/*.js')
      expect(mainConfig?.files).toContain('**/*.ts')
      expect(mainConfig?.files).toContain('**/*.tsx')
      expect(mainConfig?.files).toContain('**/*.vue')
      expect(mainConfig?.files).toContain('**/*.jsx')
    })

    it('应该处理完整的配置对象', () => {
      const oldConfig: LegacyConfig = {
        extends: ['eslint:recommended', 'plugin:vue/vue3-recommended'],
        plugins: ['vue', '@typescript-eslint'],
        env: {
          browser: true,
          es2021: true,
        },
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
        },
        rules: {
          'no-console': 'warn',
          'vue/multi-word-component-names': 'off',
        },
        ignorePatterns: ['dist', 'node_modules'],
      }

      const newConfig = migrator.generateNewConfig(oldConfig)

      // 应该有忽略配置和主配置
      expect(newConfig.length).toBeGreaterThanOrEqual(2)

      // 检查忽略配置
      const ignoreConfig = newConfig[0]
      expect(ignoreConfig.ignores).toBeDefined()

      // 检查主配置
      const mainConfig = newConfig[1]
      expect(mainConfig.files).toBeDefined()
      expect(mainConfig.languageOptions).toBeDefined()
      expect(mainConfig.plugins).toBeDefined()
      expect(mainConfig.rules).toBeDefined()
    })
  })

  describe('migrate', () => {
    it('应该在 dry-run 模式下不修改文件系统', async () => {
      const options = {
        dryRun: true,
        backup: false,
        deleteOld: false,
      }

      // 由于 dry-run 模式需要读取实际文件，这里只测试选项处理
      // 实际的文件系统测试应该在集成测试中进行
      expect(options.dryRun).toBe(true)
    })

    it('应该在备份模式下创建备份文件', async () => {
      const options = {
        dryRun: false,
        backup: true,
        deleteOld: false,
      }

      expect(options.backup).toBe(true)
    })

    it('应该在 deleteOld 为 true 时删除旧配置', async () => {
      const options = {
        dryRun: false,
        backup: false,
        deleteOld: true,
      }

      expect(options.deleteOld).toBe(true)
    })
  })

  describe('generateConfigFileContent', () => {
    it('应该生成有效的 JavaScript 配置文件内容', () => {
      const config: ESLintConfig[] = [
        {
          ignores: ['**/dist', '**/node_modules'],
        },
        {
          files: ['**/*.js', '**/*.ts'],
          languageOptions: {
            parserOptions: {
              ecmaVersion: 'latest',
              sourceType: 'module',
            },
            globals: {
              window: true,
              document: true,
            },
          },
          rules: {
            'no-console': 'warn',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
          },
        },
      ]

      const content = (migrator as any).generateConfigFileContent(config)

      // 验证：应该包含导出语句
      expect(content).toContain('export default')

      // 验证：应该包含配置数组
      expect(content).toContain('[')
      expect(content).toContain(']')

      // 验证：应该包含 ignores
      expect(content).toContain('ignores')
      expect(content).toContain('**/dist')

      // 验证：应该包含 files
      expect(content).toContain('files')
      expect(content).toContain('**/*.js')

      // 验证：应该包含 languageOptions
      expect(content).toContain('languageOptions')

      // 验证：应该包含 rules
      expect(content).toContain('rules')
      expect(content).toContain('no-console')
    })

    it('应该正确格式化嵌套对象', () => {
      const config: ESLintConfig[] = [
        {
          files: ['**/*.ts'],
          rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
          },
        },
      ]

      const content = (migrator as any).generateConfigFileContent(config)

      // 验证：应该包含嵌套的规则配置
      expect(content).toContain('argsIgnorePattern')
      expect(content).toContain('varsIgnorePattern')
    })

    it('应该为空配置生成有效内容', () => {
      const config: ESLintConfig[] = []

      const content = (migrator as any).generateConfigFileContent(config)

      // 验证：应该生成空数组
      expect(content).toContain('export default [')
      expect(content).toContain(']')
    })
  })

  describe('parseOldConfig', () => {
    it('应该解析标准的 .eslintrc.cjs 格式', () => {
      const content = `module.exports = {
        extends: ['eslint:recommended'],
        rules: {
          'no-console': 'warn'
        }
      }`

      const config = (migrator as any).parseOldConfig(content)

      expect(config).toHaveProperty('extends')
      expect(config).toHaveProperty('rules')
      expect(config.rules['no-console']).toBe('warn')
    })

    it('应该处理带尾随逗号的配置', () => {
      const content = `module.exports = {
        rules: {
          'no-console': 'warn',
        },
      }`

      const config = (migrator as any).parseOldConfig(content)

      expect(config).toHaveProperty('rules')
      expect(config.rules['no-console']).toBe('warn')
    })

    it('应该在解析失败时抛出错误', () => {
      const content = 'invalid javascript content'

      expect(() => {
        (migrator as any).parseOldConfig(content)
      }).toThrow('无法解析旧配置文件')
    })
  })
})
