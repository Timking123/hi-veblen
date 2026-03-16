/**
 * ESLint 配置文件（扁平配置格式）
 * 简化配置，跳过插件检查
 */

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      'src/admin/**',
      'src/audit/**',
    ],
  },
  {
    files: [
      "**/*.js",
      "**/*.ts",
      "**/*.tsx",
      "**/*.vue",
      "**/*.jsx"
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
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
  }
]
