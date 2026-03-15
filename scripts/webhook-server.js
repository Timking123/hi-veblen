#!/usr/bin/env node
/**
 * GitHub Webhook 服务器
 * 监听 GitHub push 事件，自动拉取代码并重新部署
 * 
 * 使用方法：
 * 1. 在服务器上运行: node scripts/webhook-server.js
 * 2. 使用 PM2 管理: pm2 start scripts/webhook-server.js --name webhook
 * 3. 在 GitHub 仓库设置中配置 Webhook
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  port: 9000,
  secret: 'your-webhook-secret-here', // 在 GitHub Webhook 设置中配置的密钥
  projectPath: '/var/www/portfolio',
  logFile: '/var/www/portfolio/logs/webhook.log'
};

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  console.log(logMessage.trim());
  
  // 写入日志文件
  const logDir = path.dirname(CONFIG.logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(CONFIG.logFile, logMessage);
}

// 验证 GitHub 签名
function verifySignature(payload, signature) {
  if (!signature) {
    return false;
  }
  
  const hmac = crypto.createHmac('sha256', CONFIG.secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// 执行部署脚本
function deploy() {
  return new Promise((resolve, reject) => {
    log('开始自动部署...');
    
    const deployScript = `
      cd ${CONFIG.projectPath} && \
      git pull origin main && \
      echo "代码已更新" && \
      npm install --production && \
      echo "依赖已安装" && \
      cd src/admin/backend && \
      pm2 restart admin-backend && \
      echo "后端服务已重启"
    `;
    
    exec(deployScript, (error, stdout, stderr) => {
      if (error) {
        log(`部署失败: ${error.message}`, 'ERROR');
        log(`错误输出: ${stderr}`, 'ERROR');
        reject(error);
        return;
      }
      
      log('部署成功！');
      log(`输出: ${stdout}`);
      resolve(stdout);
    });
  });
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        // 验证签名
        const signature = req.headers['x-hub-signature-256'];
        if (!verifySignature(body, signature)) {
          log('签名验证失败', 'WARN');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }
        
        // 解析 payload
        const payload = JSON.parse(body);
        const event = req.headers['x-github-event'];
        
        log(`收到 GitHub 事件: ${event}`);
        log(`仓库: ${payload.repository?.full_name}`);
        log(`分支: ${payload.ref}`);
        
        // 只处理 push 到 main 分支的事件
        if (event === 'push' && payload.ref === 'refs/heads/main') {
          log('检测到 main 分支更新，开始部署...');
          
          try {
            await deploy();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'success',
              message: 'Deployment completed successfully'
            }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'error',
              message: error.message
            }));
          }
        } else {
          log('忽略此事件（非 main 分支 push）');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ignored',
            message: 'Event ignored (not a push to main)'
          }));
        }
      } catch (error) {
        log(`处理请求失败: ${error.message}`, 'ERROR');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'error',
          message: error.message
        }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    // 健康检查端点
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// 启动服务器
server.listen(CONFIG.port, () => {
  log(`Webhook 服务器已启动，监听端口 ${CONFIG.port}`);
  log(`项目路径: ${CONFIG.projectPath}`);
  log(`日志文件: ${CONFIG.logFile}`);
  log('等待 GitHub Webhook 事件...');
});

// 错误处理
server.on('error', (error) => {
  log(`服务器错误: ${error.message}`, 'ERROR');
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    log('服务器已关闭');
    process.exit(0);
  });
});
