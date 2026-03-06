import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量（保留以备将来使用，如 API 地址配置等）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const env = loadEnv(mode, process.cwd(), '')
  const isProduction = mode === 'production'

  return {
    plugins: [vue()],
    
    // 路径别名配置
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    
    // 开发服务器配置
    server: {
      port: 5174,
      host: true,
      // API 代理配置 - 代理到后端 3001 端口
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          // 不需要 rewrite，因为后端路由已经挂载在 /api 下
          // 前端请求 /api/dashboard/stats -> 后端 /api/dashboard/stats
        }
      }
    },
    
    // 预览服务器配置（用于预览生产构建）
    preview: {
      port: 4173,
      host: true
    },
    
    // 构建优化配置
    build: {
      // 输出目录
      outDir: 'dist',
      // 静态资源目录
      assetsDir: 'assets',
      // 启用 CSS 代码分割
      cssCodeSplit: true,
      // 构建后是否生成 source map 文件（生产环境关闭）
      sourcemap: !isProduction,
      // 代码压缩配置 - 使用 esbuild（更快）或 terser（更小）
      minify: isProduction ? 'terser' : 'esbuild',
      // Terser 压缩选项（仅生产环境使用）
      terserOptions: isProduction ? {
        compress: {
          // 生产环境移除 console 和 debugger
          drop_console: true,
          drop_debugger: true,
          // 移除无用代码
          dead_code: true,
          // 优化条件表达式
          conditionals: true,
          // 优化布尔表达式
          booleans: true,
          // 移除未使用的变量
          unused: true,
          // 优化 if-return 和 if-continue
          if_return: true,
          // 合并连续的变量声明
          join_vars: true,
          // 移除未引用的函数和变量
          collapse_vars: true
        },
        mangle: {
          // 混淆顶级作用域的名称
          toplevel: true
        },
        format: {
          // 移除注释
          comments: false
        }
      } : undefined,
      // 分块策略
      rollupOptions: {
        output: {
          // 分包配置 - 优化第三方库打包
          manualChunks: (id) => {
            // node_modules 中的依赖进行分包
            if (id.includes('node_modules')) {
              // Vue 核心库
              if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
                return 'vue-vendor'
              }
              // Element Plus UI 库
              if (id.includes('element-plus') || id.includes('@element-plus')) {
                return 'element-plus'
              }
              // ECharts 图表库（较大，单独分包）
              if (id.includes('echarts') || id.includes('zrender')) {
                return 'echarts'
              }
              // Axios HTTP 库
              if (id.includes('axios')) {
                return 'axios'
              }
              // 其他第三方库
              return 'vendor'
            }
          },
          // 静态资源文件名（带 hash 用于缓存）
          chunkFileNames: (chunkInfo) => {
            // 根据 chunk 类型使用不同的命名策略
            const name = chunkInfo.name || 'chunk'
            return `assets/js/${name}-[hash].js`
          },
          entryFileNames: 'assets/js/[name]-[hash].js',
          // 资源文件按类型分目录
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || ''
            // 字体文件
            if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }
            // 图片文件
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }
            // CSS 文件
            if (/\.css$/i.test(name)) {
              return 'assets/css/[name]-[hash][extname]'
            }
            // 其他资源
            return 'assets/[ext]/[name]-[hash][extname]'
          }
        },
        // 外部化处理（如果需要 CDN 引入）
        // external: [],
      },
      // 块大小警告限制（KB）
      chunkSizeWarningLimit: 1000,
      // 资源内联阈值（小于此大小的资源会被内联为 base64）
      assetsInlineLimit: 4096, // 4KB
      // 启用 CSS 代码压缩
      cssMinify: isProduction,
      // 构建目标浏览器
      target: ['es2020', 'chrome87', 'firefox78', 'safari14', 'edge88'],
      // 清空输出目录
      emptyOutDir: true,
      // 启用 gzip 压缩报告
      reportCompressedSize: true
    },
    
    // CSS 配置
    css: {
      preprocessorOptions: {
        scss: {
          // 全局 SCSS 变量（如果需要）
          additionalData: ''
        }
      },
      // 开发环境启用 CSS sourcemap
      devSourcemap: !isProduction
    },

    // 依赖优化配置
    optimizeDeps: {
      // 预构建的依赖
      include: [
        'vue',
        'vue-router',
        'pinia',
        'element-plus',
        '@element-plus/icons-vue',
        'echarts',
        'axios'
      ],
      // 排除不需要预构建的依赖
      exclude: []
    },

    // 定义全局常量替换
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false
    },

    // ESBuild 配置
    esbuild: {
      // 生产环境移除 console 和 debugger（如果使用 esbuild 压缩）
      drop: isProduction ? ['console', 'debugger'] : []
    }
  }
})
