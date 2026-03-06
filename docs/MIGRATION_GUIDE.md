# 前后端数据同步修复 - 迁移指南

## 概述

本指南描述了如何执行前后端数据同步修复的迁移操作，包括数据库更新、文件同步和编码修复。

## 迁移前准备

### 1. 创建备份

在执行任何迁移操作前，务必创建完整备份：

```bash
# 备份数据库
npm run backup:create

# 手动备份文件目录
cp -r src/admin/file src/admin/file.backup
cp -r public public.backup
```

### 2. 验证备份

确认备份文件已正确创建：

```bash
# 检查备份文件
ls -lh src/admin/backend/data/backups/
ls -lh src/admin/file.backup/
ls -lh public.backup/
```

### 3. 记录当前状态

记录当前系统的关键信息：

```bash
# 记录简历版本
npm run db:query "SELECT * FROM resume_versions"

# 记录统计数据
npm run db:query "SELECT * FROM statistics"

# 记录文件列表
find src/admin/file -type f > file_list_before.txt
find public -type f > public_list_before.txt
```

## 迁移步骤

### 阶段 1：一致性检查（预计 5-10 分钟）

运行一致性检查脚本，识别现有问题：

```bash
npm run check:consistency
```

检查报告将显示：
- 数据库记录与文件系统的不一致
- 公共目录缺失的文件
- 孤立的文件（无数据库记录）

**注意事项：**
- 如果发现严重（Critical）或高（High）级别问题，建议先手动修复
- 记录所有发现的问题，以便后续验证

### 阶段 2：代码部署（预计 5 分钟）

部署新的代码版本：

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建项目
npm run build
```

### 阶段 3：数据库迁移（预计 2 分钟）

执行数据库迁移脚本，创建新表：

```bash
# 运行迁移脚本
npm run migrate:up
```

这将创建以下表：
- `file_sync_log` - 文件同步日志表

### 阶段 4：文件同步（预计 5-15 分钟）

同步所有文件到公共目录：

```bash
npm run sync:files
```

此脚本将：
1. 同步当前激活的简历到 `public/resume.pdf`
2. 同步所有音频文件到 `public/audio/`

**预期输出：**
```
========== 文件同步报告 ==========

总文件数: 15
成功: 15
失败: 0

成功的文件:

  ✓ 简历同步成功
  ✓ 音频文件同步成功: audio/bgm/music1.mp3
  ✓ 音频文件同步成功: audio/sfx/click.mp3
  ...

==================================
```

### 阶段 5：编码修复（预计 2-5 分钟）

修复文件名编码问题：

```bash
npm run fix:encoding
```

此脚本将：
1. 检查所有文件名的 UTF-8 编码
2. 尝试从 GBK/GB2312 转换为 UTF-8
3. 更新数据库记录

**预期输出：**
```
========== 文件名编码修复报告 ==========

总检查数: 25
已修复: 3
失败: 0
跳过（无需修复）: 22

已修复的文件:

  ✓ [resume_versions] ID 5
    原文件名: ����-����.pdf
    新文件名: 黄彦杰-简历.pdf

========================================
```

### 阶段 6：验证迁移（预计 5-10 分钟）

#### 6.1 再次运行一致性检查

```bash
npm run check:consistency
```

应该显示：
```
✓ 未发现数据不一致问题
```

#### 6.2 验证文件访问

测试前端文件访问：

```bash
# 测试简历下载
curl -I http://localhost:3000/resume.pdf

# 测试音频文件
curl -I http://localhost:3000/audio/bgm/music.mp3
```

应该返回 200 状态码。

#### 6.3 验证后台功能

1. 登录后台管理系统
2. 访问文件管理页面
3. 测试上传新简历
4. 测试切换当前简历
5. 验证下载统计是否正确更新

#### 6.4 验证前端功能

1. 访问前端网站
2. 点击下载简历按钮
3. 验证下载的是最新版本
4. 检查音频播放是否正常

### 阶段 7：清理和监控（持续）

#### 7.1 清理临时文件

```bash
# 清理文件事务备份
rm -rf src/admin/file/.file-transaction-backup

# 清理临时文件
npm run cleanup:temp
```

#### 7.2 监控日志

查看同步日志：

```bash
# 查看文件同步日志
npm run db:query "SELECT * FROM file_sync_log ORDER BY created_at DESC LIMIT 20"

# 查看错误日志
tail -f logs/error.log
```

## 回滚方案

如果迁移失败，执行以下步骤回滚：

### 1. 停止服务

```bash
npm run stop
```

### 2. 恢复数据库

```bash
# 恢复最新备份
npm run backup:restore <backup_filename>
```

### 3. 恢复文件系统

```bash
# 恢复文件目录
rm -rf src/admin/file
mv src/admin/file.backup src/admin/file

# 恢复公共目录
rm -rf public
mv public.backup public
```

### 4. 回滚代码

```bash
# 切换到之前的版本
git checkout <previous_commit_hash>

# 重新安装依赖
npm install

# 重新构建
npm run build
```

### 5. 重启服务

```bash
npm run start
```

### 6. 验证回滚

```bash
# 验证系统功能
npm run test

# 检查服务状态
curl http://localhost:3000/api/health
```

## 常见问题

### Q1: 一致性检查发现大量问题怎么办？

**A:** 
1. 首先备份所有数据
2. 分析问题类型和严重程度
3. 对于严重问题，手动修复后再运行迁移
4. 对于中低级别问题，可以继续迁移，迁移脚本会自动修复

### Q2: 文件同步失败怎么办？

**A:**
1. 检查文件权限：`ls -la src/admin/file`
2. 检查磁盘空间：`df -h`
3. 查看错误日志：`tail -f logs/error.log`
4. 手动同步失败的文件
5. 再次运行同步脚本

### Q3: 编码修复后文件名仍然乱码？

**A:**
1. 检查原始文件名编码：`file -i <filename>`
2. 尝试手动转换：`iconv -f GBK -t UTF-8 <filename>`
3. 如果无法转换，考虑重命名文件
4. 更新数据库记录

### Q4: 前端无法访问简历文件？

**A:**
1. 检查文件是否存在：`ls -la public/resume.pdf`
2. 检查文件权限：`chmod 644 public/resume.pdf`
3. 检查 Nginx/Apache 配置
4. 清除浏览器缓存
5. 检查防火墙规则

### Q5: 下载统计不准确？

**A:**
1. 运行一致性检查：`npm run check:consistency`
2. 查看统计数据：`npm run db:query "SELECT * FROM statistics"`
3. 查看版本下载数：`npm run db:query "SELECT * FROM resume_versions"`
4. 如果不一致，运行修复脚本（待实现）

### Q6: 迁移后性能下降？

**A:**
1. 检查数据库索引：确保所有索引已创建
2. 清理旧日志：`npm run cleanup:logs`
3. 优化数据库：`npm run db:optimize`
4. 检查文件同步频率：避免过于频繁的同步操作

## 性能优化建议

### 1. 数据库优化

```sql
-- 创建缺失的索引
CREATE INDEX IF NOT EXISTS idx_file_sync_log_created_at ON file_sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_file_sync_log_status ON file_sync_log(status);

-- 清理旧日志（保留最近 30 天）
DELETE FROM file_sync_log WHERE created_at < datetime('now', '-30 days');

-- 优化数据库
VACUUM;
ANALYZE;
```

### 2. 文件系统优化

```bash
# 定期清理临时文件
find public -name "*.tmp" -mtime +1 -delete

# 清理文件事务备份
find src/admin/file/.file-transaction-backup -mtime +7 -delete
```

### 3. 缓存优化

在 Nginx 配置中添加：

```nginx
# 简历文件不缓存
location = /resume.pdf {
    add_header Cache-Control "no-cache, must-revalidate";
}

# 音频文件缓存 1 天
location /audio/ {
    add_header Cache-Control "public, max-age=86400";
}

# 图片文件缓存 7 天
location /images/ {
    add_header Cache-Control "public, max-age=604800";
}
```

## 监控和维护

### 定期任务

建议设置以下定期任务（cron）：

```bash
# 每日凌晨 2 点运行一致性检查
0 2 * * * cd /path/to/project && npm run check:consistency

# 每周日凌晨 3 点清理临时文件
0 3 * * 0 cd /path/to/project && npm run cleanup:temp

# 每月 1 号凌晨 4 点清理旧日志
0 4 1 * * cd /path/to/project && npm run cleanup:logs
```

### 监控指标

关注以下关键指标：

1. **文件同步成功率**：应保持在 99% 以上
2. **下载统计准确性**：定期验证两个表的一致性
3. **文件访问延迟**：应在 100ms 以内
4. **错误率**：应低于 0.1%
5. **磁盘使用率**：避免超过 80%

## 联系支持

如果遇到无法解决的问题，请：

1. 收集错误日志
2. 记录复现步骤
3. 提供系统环境信息
4. 联系技术支持团队

## 附录

### A. 数据库表结构

#### file_sync_log 表

```sql
CREATE TABLE file_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,
  source_path TEXT NOT NULL,
  target_path TEXT,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### B. 文件目录结构

```
项目根目录/
├── public/                          # 前端公共访问目录
│   ├── resume.pdf                   # 当前激活简历
│   ├── audio/                       # 音频文件
│   │   ├── bgm/
│   │   └── sfx/
│   └── images/                      # 公开图片
│
├── src/admin/file/                  # 后台文件存储
│   ├── resume/                      # 简历版本历史
│   ├── audio/                       # 音频文件
│   ├── message/                     # 留言附件（私有）
│   └── images/                      # 图片文件
│
└── src/admin/backend/data/          # 数据库
    └── admin.db
```

### C. 环境变量配置

```env
# 文件存储路径（可选，默认使用相对路径）
ADMIN_FILE_ROOT=/path/to/admin/file
PUBLIC_ROOT=/path/to/public

# 文件大小限制（字节）
MAX_RESUME_SIZE=20971520    # 20MB
MAX_IMAGE_SIZE=10485760     # 10MB
MAX_AUDIO_SIZE=52428800     # 50MB

# 缓存配置
CACHE_CONTROL_RESUME=no-cache
CACHE_CONTROL_AUDIO=public,max-age=86400
CACHE_CONTROL_IMAGE=public,max-age=604800
```

## 版本历史

- **v1.0.0** (2024-01-15): 初始版本
  - 创建 file_sync_log 表
  - 实现文件同步功能
  - 实现编码修复功能
  - 实现一致性检查功能
