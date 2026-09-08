/**
 * ESLint 配置文件（扁平配置格式）
 * 按源码类型选择解析器，保留现有规则范围。
 */
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      // 属性测试会生成含重复声明等内容的合成代码，不属于项目源码。
      '.test-temp/**',
      'src/admin/**',
      'src/audit/**',
    ],
  },
  {
    files: [
      "**/*.js",
      "**/*.ts",
      "**/*.tsx",
      "**/*.cts",
      "**/*.mts",
      "**/*.vue",
      "**/*.jsx"
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: true,
        document: true,
        navigator: true,
        console: true,
        setTimeout: true,
        setInterval: true,
        clearTimeout: true,
        clearInterval: true,
        fetch: true,
        localStorage: true,
        sessionStorage: true,
        Promise: true,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-undef": "off",
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: { parser: tsParser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tsParser, extraFileExtensions: ['.vue'] },
    },
  },
]
