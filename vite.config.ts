import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      vue(),
      // PWA 配置
      // 验证: 需求 3.5 - 支持添加到主屏幕功能
      // 验证: 需求 3.6 - 配置 Service Worker 实现基本离线缓存
      // 验证: 需求 3.7 - 在 manifest.json 中定义应用元数据
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: '黄彦杰 - 个人求职网站',
          short_name: '黄彦杰',
          description: '黄彦杰的个人求职网站，展示前端开发、软件需求分析专业技能、项目经验和教育背景。',
          theme_color: '#0A0E27',
          background_color: '#0A0E27',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          lang: 'zh-CN',
          categories: ['portfolio', 'personal', 'resume'],
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'apple touch icon'
            }
          ],
          screenshots: [
            {
              src: 'screenshot-wide.png',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: '黄彦杰个人网站 - 桌面版'
            },
            {
              src: 'screenshot-narrow.png',
              sizes: '750x1334',
              type: 'image/png',
              form_factor: 'narrow',
              label: '黄彦杰个人网站 - 移动版'
            }
          ]
        },
        // Service Worker 缓存策略配置（使用 Workbox）
        workbox: {
          // 预缓存的文件类型
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // 排除大文件（如头像图片）
          globIgnores: ['**/images/avatar.png'],
          // 增加文件大小限制到 15MB
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          // 运行时缓存策略
          runtimeCaching: [
            {
              // 缓存 Google Fonts 样式表
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 年
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // 缓存 Google Fonts 字体文件
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 年
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // 缓存图片资源
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
                }
              }
            },
            {
              // 缓存 PDF 文件（简历）
              urlPattern: /\.pdf$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'pdf-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
                }
              }
            },
            {
              // 缓存音频文件
              urlPattern: /\.(?:mp3|wav|ogg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
                }
              }
            }
          ],
          // 跳过等待，立即激活新的 Service Worker
          skipWaiting: true,
          // 立即控制所有客户端
          clientsClaim: true
        },
        // 开发模式下也启用 PWA（用于测试）
        devOptions: {
          enabled: false, // 生产环境才启用
          type: 'module'
        }
      })
    ],
    
    // Base public path
    base: env.VITE_BASE_URL || '/',
    
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    
    build: {
      // Output directory
      outDir: 'dist',
      
      // Generate sourcemaps for production (set to false for smaller builds)
      sourcemap: mode === 'development',
      
      // Minify options
      minify: 'terser',
      terserOptions: {
        compress: {
          // Remove console.log in production
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
      
      // Code splitting configuration（代码分割配置）
      // 验证: 需求 4.3 - 将路由组件拆分为独立的代码块，实现按需加载
      // 验证: 需求 4.4 - 对大型第三方库（如 ECharts）进行单独分包
      rollupOptions: {
        output: {
          // Manual chunks for better caching（手动分包以优化缓存）
          manualChunks: (id: string) => {
            // 只处理 node_modules 中的依赖
            if (id.includes('node_modules')) {
              // Vue 核心生态系统单独分包（vue、vue-router、pinia）
              // 这些库更新频率较低，单独分包可以提高缓存命中率
              if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
                return 'vue-vendor'
              }
              
              // ECharts 单独分包（体积较大，约 1MB+）
              // 只有技能页面使用，单独分包可以减少首屏加载时间
              if (id.includes('echarts') || id.includes('zrender')) {
                return 'echarts-vendor'
              }
              
              // 其他第三方依赖统一打包
              return 'vendor'
            }
            
            // 路由组件使用动态导入，Vite 会自动进行代码分割
            // 无需在此处额外配置
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            let extType = info[info.length - 1]
            
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetInfo.name || '')) {
              extType = 'images'
            } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              extType = 'fonts'
            }
            
            return `assets/${extType}/[name]-[hash][extname]`
          },
          
          // Chunk file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Enable CSS code splitting
      cssCodeSplit: true,
      
      // Asset inline limit (smaller assets will be inlined as base64)
      assetsInlineLimit: 4096,
      
      // Report compressed size
      reportCompressedSize: true,
      
      // Target browsers
      target: 'es2015',
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['vue', 'vue-router', 'pinia', 'echarts'],
    },
    
    // Server configuration
    server: {
      port: 5173,
      host: true,
      open: true,
      cors: true,
      // API 代理配置 - 代理到后端管理系统 3001 端口
      // 需求: 1.5 - 前后端集成
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    
    // Preview configuration
    preview: {
      port: 4173,
      host: true,
      open: true,
    },
    
    // Test configuration
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/.{idea,git,cache,output,temp}/**',
      ],
    },
  }
})
