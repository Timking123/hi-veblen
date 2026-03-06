/**
 * ESLint 配置文件
 * 后台管理系统后端 - TypeScript 代码规范
 */
module.exports = {
  root: true,
  
  // 解析器配置
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  
  // 插件
  plugins: [
    '@typescript-eslint'
  ],
  
  // 继承的规则集
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  
  // 环境
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  
  // 忽略的文件
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '*.cjs',
    '!.eslintrc.cjs'
  ],
  
  // 自定义规则
  rules: {
    // TypeScript 特定规则
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    
    // 通用规则
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-expressions': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    // 代码风格
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', { 
      code: 120, 
      ignoreStrings: true, 
      ignoreTemplateLiterals: true,
      ignoreComments: true
    }],
    
    // 安全相关
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error'
  },
  
  // 针对测试文件的特殊规则
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.property.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        'no-console': 'off'
      }
    }
  ]
};
