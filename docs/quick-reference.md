# 命令速查表

## 部署相关

```bash
# 一键部署
bash scripts/deploy.sh

# 验证部署
bash scripts/verify-deployment.sh

# 初始化服务器
bash scripts/init-server.sh

# 申请 SSL 证书
bash scripts/setup-ssl.sh
```

## 服务管理

```bash
# Docker 容器
docker-compose up -d          # 启动容器
docker-compose down           # 停止容器
docker-compose restart        # 重启容器
docker-compose ps             # 查看状态
docker-compose logs nginx     # 查看日志

# PM2 进程
pm2 start ecosystem.config.js --env production  # 启动
pm2 stop admin-backend                          # 停止
pm2 restart admin-backend                       # 重启
pm2 status                                      # 查看状态
pm2 logs admin-backend                          # 查看日志
pm2 save                                        # 保存配置
```

## 数据库管理

```bash
# 初始化数据库
bash scripts/init-database.sh

# 备份数据库
bash scripts/backup.sh

# 恢复数据库
bash scripts/restore.sh backups/admin_db_20240101_120000.db.gz

# 直接操作数据库
sqlite3 src/admin/backend/data/admin.db
```

## 监控和日志

```bash
# 启动监控
nohup bash scripts/monitor.sh &

# 查看监控日志
tail -f logs/monitor.log

# 查看 Nginx 日志
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log

# 查看后端日志
tail -f src/admin/backend/logs/app.log
pm2 logs admin-backend
```

## 系统信息

```bash
# 查看系统资源
free -h                    # 内存使用
df -h                      # 磁盘使用
top                        # 进程监控
htop                       # 进程监控（增强版）

# 查看端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :443
netstat -tulpn | grep :3001

# 查看进程
ps aux | grep node
ps aux | grep nginx
```

## 域名和 SSL

```bash
# 验证域名解析
bash scripts/verify-domain.sh hi-veblen.com <服务器IP>
dig hi-veblen.com

# 查看 SSL 证书
sudo certbot certificates

# 手动续期证书
sudo certbot renew

# 测试证书续期
sudo certbot renew --dry-run
```

## Git 操作

```bash
# 更新代码
git pull

# 查看状态
git status

# 查看提交历史
git log --oneline -10

# 回滚到指定版本
git checkout <commit-hash>
```

## 防火墙

```bash
# 查看防火墙状态
sudo ufw status

# 开放端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 关闭端口
sudo ufw deny 8080/tcp

# 重载防火墙
sudo ufw reload
```

## 故障排查

```bash
# 检查服务是否运行
curl http://localhost/
curl http://localhost:3001/api/health

# 测试 Nginx 配置
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx:alpine nginx -t

# 重新构建 Docker 镜像
docker-compose build --no-cache

# 清理 Docker 资源
docker system prune -a

# 重启所有服务
docker-compose restart && pm2 restart all
```

## 性能优化

```bash
# 清理日志
find logs/ -name "*.log" -mtime +7 -delete

# 清理旧备份
find backups/ -name "*.db.gz" -mtime +30 -delete

# 数据库优化
sqlite3 src/admin/backend/data/admin.db "VACUUM;"

# 查看数据库大小
du -h src/admin/backend/data/admin.db
```

## 安全检查

```bash
# 检查开放端口
sudo netstat -tulpn | grep LISTEN

# 检查 SSH 配置
sudo cat /etc/ssh/sshd_config | grep PasswordAuthentication

# 查看登录日志
sudo tail -f /var/log/auth.log

# 查看失败的登录尝试
sudo grep "Failed password" /var/log/auth.log
```
