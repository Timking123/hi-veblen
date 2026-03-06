/**
 * PM2 配置文件
 * 用于生产环境部署后端服务
 * 
 * 配置说明：
 * - 应用名称：admin-backend
 * - 入口文件：dist/app.js（TypeScript 编译后的文件）
 * - 内存限制：500MB（满足需求 1.5：后端内存占用不超过 500MB）
 * - 日志配置：分离错误日志和输出日志
 * - 环境变量：支持开发和生产环境
 */
module.exports = {
  apps: [
    {
      // 应用名称
      name: 'admin-backend',
      
      // 入口文件（编译后的 JavaScript 文件）
      script: 'dist/app.js',
      
      // 工作目录
      cwd: __dirname,
      
      // 实例数量（单实例，适合小型服务器）
      instances: 1,
      
      // 执行模式：fork（单进程）
      exec_mode: 'fork',
      
      // 内存限制：500MB（超过此限制将自动重启）
      // 满足需求 1.5：后端内存占用不超过 500MB
      max_memory_restart: '500M',
      
      // 自动重启配置
      autorestart: true,
      
      // 监听文件变化（生产环境关闭）
      watch: false,
      
      // 最大重启次数（防止无限重启）
      max_restarts: 10,
      
      // 重启延迟（毫秒）
      restart_delay: 1000,
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      
      // 环境变量 - 生产环境
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      
      // 环境变量 - 开发环境
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      
      // Node.js 参数
      node_args: [
        // 限制堆内存大小为 400MB（留出余量给其他内存使用）
        '--max-old-space-size=400',
        // 启用垃圾回收优化
        '--optimize-for-size'
      ],
      
      // 优雅关闭超时（毫秒）
      kill_timeout: 5000,
      
      // 等待应用就绪的超时时间（毫秒）
      wait_ready: true,
      listen_timeout: 10000
    }
  ],
  
  // 部署配置（可选，用于远程部署）
  deploy: {
    production: {
      // 远程服务器用户
      user: 'deploy',
      
      // 远程服务器地址
      host: ['your-server-ip'],
      
      // 部署分支
      ref: 'origin/main',
      
      // Git 仓库地址
      repo: 'git@github.com:your-username/your-repo.git',
      
      // 远程部署路径
      path: '/var/www/admin-backend',
      
      // 部署后执行的命令
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      
      // 环境变量
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
