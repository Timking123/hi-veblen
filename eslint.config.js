/**
 * ESLint 配置文件（扁平配置格式）
 * 由 ESLintMigrator 自动生成
 */

export default [
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
        "ecmaVersion": "latest",
        "parser": "@typescript-eslint/parser",
        "sourceType": "module"
      },
      globals: {
        "window": true,
        "document": true,
        "navigator": true,
        "console": true,
        "setTimeout": true,
        "setInterval": true,
        "clearTimeout": true,
        "clearInterval": true,
        "fetch": true,
        "localStorage": true,
        "sessionStorage": true,
        "global": true,
        "process": true,
        "Buffer": true,
        "__dirname": true,
        "__filename": true,
        "require": true,
        "module": true,
        "exports": true,
        "Promise": true,
        "Symbol": true,
        "Map": true,
        "Set": true,
        "WeakMap": true,
        "WeakSet": true,
        "Proxy": true,
        "Reflect": true,
        "BigInt": true
      },
    },
    plugins: {
      'vue': 'vue', // 需要手动导入插件
      '@typescript-eslint': '@typescript-eslint', // 需要手动导入插件
      'prettier': 'prettier', // 需要手动导入插件
    },
    rules: {
      "prettier/prettier": "warn",
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_"
        }
      ]
    },
  }
]
