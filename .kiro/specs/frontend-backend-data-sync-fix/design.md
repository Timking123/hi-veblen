# 设计文档：前后端数据同步修复

## 概述

本设计文档描述了解决前后端数据不互通问题的技术方案。核心问题在于：
1. 简历文件存储在后台目录（`src/admin/file/resume/`），但前端从公共目录（`public/resume.pdf`）读取
2. 下载统计分散在两个地方：`resume_versions.download_count` 和 `statistics.resume_downloads`
3. 文件名编码未正确处理导致中文乱码
4. 缺少文件更新后的缓存失效机制

解决方案采用"单一数据源"原则，建立统一的文件管理和同步机制。

## 架构

### 当前架构问题

```
前端应用 (src/)
  └─ 访问: public/resume.pdf (静态文件)
  └─ 问题: 无法感知后台更新

后台前端 (src/admin/frontend/)
  └─ 调用: /api/files/resume/*
  └─ 问题: 下载不更新统计

后台服务 (src/admin/backend/)
  └─ 存储: src/admin/file/resume/resume_v*.pdf
  └─ 数据库: resume_versions 表
  └─ 问题: 文件与前端隔离
```

### 目标架构

```
统一文件存储层
  ├─ 主存储: src/admin/file/ (所有文件的权威来源)
  │   ├─ resume/ (简历版本历史)
  │   ├─ audio/ (音频文件)
  │   └─ message/ (留言附件)
  │
  └─ 公共访问层: public/ (前端可访问的符号链接或副本)
      ├─ resume.pdf (当前激活简历的副本)
      └─ audio/ (音频文件的符号链接)

统一数据访问层
  └─ Backend API (唯一的数据修改入口)
      ├─ 文件操作 + 数据库更新 (原子性)
      ├─ 统计更新 (一致性)
      └─ 缓存控制 (实时性)
```


## 组件和接口

### 1. 文件同步服务 (FileSyncService)

负责在后台文件目录和前端公共目录之间同步文件。

```typescript
interface FileSyncService {
  /**
   * 同步当前激活的简历到公共目录
   * @returns 同步结果
   */
  syncActiveResumeToPublic(): Promise<SyncResult>
  
  /**
   * 同步音频文件到公共目录
   * @param audioPath 音频文件相对路径
   * @returns 同步结果
   */
  syncAudioToPublic(audioPath: string): Promise<SyncResult>
  
  /**
   * 清理公共目录中的过期文件
   * @returns 清理结果
   */
  cleanupPublicDirectory(): Promise<CleanupResult>
}

interface SyncResult {
  success: boolean
  sourcePath?: string
  targetPath?: string
  error?: string
}
```

**实现策略：**
- 使用文件复制而非符号链接（跨平台兼容性）
- 复制操作使用临时文件 + 原子重命名（避免部分更新）
- 记录同步日志用于审计

### 2. 统一下载统计服务 (DownloadStatsService)

统一管理所有下载统计，消除数据不一致。

```typescript
interface DownloadStatsService {
  /**
   * 记录简历下载（同时更新版本表和统计表）
   * @param version 简历版本号
   * @param source 下载来源 ('frontend' | 'admin')
   */
  recordResumeDownload(version: number, source: string): Promise<void>
  
  /**
   * 获取简历总下载次数
   * @returns 总下载次数
   */
  getTotalResumeDownloads(): Promise<number>
  
  /**
   * 获取指定版本的下载次数
   * @param version 简历版本号
   * @returns 下载次数
   */
  getVersionDownloads(version: number): Promise<number>
}
```

**实现策略：**
- 使用数据库事务确保两个表同时更新
- `resume_versions.download_count` 记录每个版本的下载次数
- `statistics.resume_downloads` 记录总下载次数（冗余但便于查询）
- 提供数据一致性检查和修复功能

### 3. 文件编码处理器 (FileEncodingHandler)

处理文件名的编码问题，确保中文等多字节字符正确显示。

```typescript
interface FileEncodingHandler {
  /**
   * 编码文件名用于 HTTP 响应头
   * @param filename 原始文件名
   * @returns 编码后的 Content-Disposition 值
   */
  encodeContentDisposition(filename: string): string
  
  /**
   * 验证文件名是否包含非法字符
   * @param filename 文件名
   * @returns 验证结果
   */
  validateFilename(filename: string): ValidationResult
  
  /**
   * 规范化文件名（移除特殊字符）
   * @param filename 原始文件名
   * @returns 规范化后的文件名
   */
  normalizeFilename(filename: string): string
}
```

**实现策略：**
- 使用 RFC 5987 标准编码文件名：`filename*=UTF-8''encoded_name`
- 同时提供 ASCII 兼容的 fallback：`filename="ascii_name"`
- 在数据库中始终使用 UTF-8 存储原始文件名

### 4. 缓存控制管理器 (CacheControlManager)

管理不同类型文件的缓存策略。

```typescript
interface CacheControlManager {
  /**
   * 获取文件的缓存控制头
   * @param fileType 文件类型
   * @param isVersioned 是否有版本标识
   * @returns 缓存控制头对象
   */
  getCacheHeaders(fileType: FileType, isVersioned: boolean): CacheHeaders
  
  /**
   * 生成带版本标识的 URL
   * @param basePath 基础路径
   * @param version 版本标识（时间戳或版本号）
   * @returns 带版本的 URL
   */
  generateVersionedUrl(basePath: string, version: string | number): string
}

type FileType = 'resume' | 'audio' | 'image' | 'static'

interface CacheHeaders {
  'Cache-Control': string
  'ETag'?: string
  'Last-Modified'?: string
}
```

**缓存策略：**
- 当前简历：`Cache-Control: no-cache, must-revalidate`（总是验证）
- 历史版本：`Cache-Control: public, max-age=31536000, immutable`（永久缓存）
- 音频文件：`Cache-Control: public, max-age=86400`（1天）
- 图片文件：`Cache-Control: public, max-age=604800`（7天）


### 5. 文件操作事务管理器 (FileTransactionManager)

确保文件操作和数据库操作的原子性。

```typescript
interface FileTransactionManager {
  /**
   * 执行文件事务
   * @param operations 文件操作列表
   * @param dbOperations 数据库操作函数
   * @returns 事务结果
   */
  executeTransaction(
    operations: FileOperation[],
    dbOperations: () => Promise<void>
  ): Promise<TransactionResult>
  
  /**
   * 回滚文件操作
   * @param operations 已执行的操作列表
   */
  rollback(operations: FileOperation[]): Promise<void>
}

interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'copy'
  path: string
  backupPath?: string
  content?: Buffer
}

interface TransactionResult {
  success: boolean
  completedOperations: FileOperation[]
  error?: string
}
```

**实现策略：**
- 文件操作前创建备份
- 数据库操作失败时回滚文件更改
- 使用临时目录存储事务中的文件
- 记录详细的事务日志

### 6. 路径映射配置 (PathMappingConfig)

集中管理所有文件路径配置。

```typescript
interface PathMappingConfig {
  // 后台文件存储根目录
  adminFileRoot: string
  
  // 前端公共目录
  publicRoot: string
  
  // 路径映射
  mappings: {
    resume: {
      admin: string      // src/admin/file/resume/
      public: string     // public/resume.pdf
    }
    audio: {
      admin: string      // src/admin/file/audio/
      public: string     // public/audio/
    }
    message: {
      admin: string      // src/admin/file/message/
      public: null       // 不公开访问
    }
  }
  
  /**
   * 获取文件的公共访问 URL
   * @param adminPath 后台文件路径
   * @returns 公共访问 URL 或 null
   */
  getPublicUrl(adminPath: string): string | null
  
  /**
   * 获取文件的后台存储路径
   * @param publicUrl 公共 URL
   * @returns 后台存储路径或 null
   */
  getAdminPath(publicUrl: string): string | null
}
```

## 数据模型

### 数据库表结构调整

#### resume_versions 表（无需修改）

```sql
CREATE TABLE resume_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER NOT NULL UNIQUE,
  filename TEXT NOT NULL,           -- 原始文件名（UTF-8）
  file_path TEXT NOT NULL,          -- 后台存储路径
  file_size INTEGER,
  is_active INTEGER DEFAULT 0,      -- 当前激活标志
  download_count INTEGER DEFAULT 0, -- 版本下载次数
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

#### statistics 表（无需修改）

```sql
CREATE TABLE statistics (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  resume_downloads INTEGER DEFAULT 0,  -- 总下载次数（冗余）
  game_triggers INTEGER DEFAULT 0,
  game_completions INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

#### 新增：file_sync_log 表（用于审计）

```sql
CREATE TABLE file_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,          -- 'sync' | 'delete' | 'cleanup'
  source_path TEXT NOT NULL,
  target_path TEXT,
  file_type TEXT NOT NULL,          -- 'resume' | 'audio' | 'image'
  status TEXT NOT NULL,             -- 'success' | 'failed'
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### 文件系统结构

```
项目根目录/
├── public/                          # 前端公共访问目录
│   ├── resume.pdf                   # 当前激活简历（副本）
│   ├── audio/                       # 音频文件（副本或链接）
│   │   ├── bgm/
│   │   └── sfx/
│   └── images/                      # 公开图片
│
├── src/admin/file/                  # 后台文件存储（权威来源）
│   ├── resume/                      # 简历版本历史
│   │   ├── resume_v1.pdf
│   │   ├── resume_v2.pdf
│   │   └── ...
│   ├── audio/                       # 音频文件
│   │   ├── bgm/
│   │   └── sfx/
│   ├── message/                     # 留言附件（私有）
│   └── images/                      # 图片文件
│       ├── avatar/
│       ├── screenshot/
│       └── other/
│
└── src/admin/backend/data/          # 数据库
    └── admin.db
```


## 正确性属性

属性（Property）是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1：简历文件路径一致性

*对于任何*上传的简历文件，该文件应该同时存在于后台存储目录（`src/admin/file/resume/`）和数据库记录中，且数据库中的 `file_path` 字段应该指向该文件的实际位置。

**验证：需求 1.1, 1.4**

### 属性 2：激活简历同步性

*对于任何*标记为激活状态（`is_active = 1`）的简历版本，前端公共目录（`public/resume.pdf`）中的文件内容应该与该版本在后台存储目录中的文件内容完全一致。

**验证：需求 1.2, 1.3, 1.5, 4.1, 4.2**

### 属性 3：下载统计一致性

*对于任何*简历版本，从任何来源（前端或后台）下载该版本后，`resume_versions` 表中该版本的 `download_count` 应该增加 1，且 `statistics` 表中的 `resume_downloads` 也应该增加 1。

**验证：需求 2.1, 2.2, 2.3, 2.5**

### 属性 4：文件名编码往返一致性

*对于任何*包含多字节字符（中文、日文、韩文等）的文件名，上传文件后再下载，下载响应头中的文件名应该能正确解码回原始文件名。

**验证：需求 3.1, 3.2, 3.3, 3.4, 3.5**

### 属性 5：文件同步原子性

*对于任何*简历版本切换操作，要么数据库的 `is_active` 标志更新且公共目录的文件更新成功，要么两者都不更新（回滚）。不应该出现只有一个更新成功的中间状态。

**验证：需求 4.5, 8.3**

### 属性 6：缓存控制正确性

*对于任何*文件下载请求，响应头中的 `Cache-Control` 值应该根据文件类型和是否有版本标识来设置：当前简历使用 `no-cache`，历史版本使用长期缓存，其他文件使用中期缓存。

**验证：需求 4.3, 10.1, 10.2, 10.4**

### 属性 7：文件版本标识唯一性

*对于任何*文件更新操作，新生成的版本标识（时间戳或版本号）应该与之前的所有版本标识不同，确保 URL 的唯一性。

**验证：需求 4.4, 10.3, 13.1**

### 属性 8：音频文件路径映射正确性

*对于任何*上传的音频文件，如果类型为 BGM，文件应该保存在 `audio/bgm/` 目录；如果类型为 SFX，文件应该保存在 `audio/sfx/` 目录，且前端应该能通过对应的公共路径访问该文件。

**验证：需求 5.1, 5.2, 5.3**

### 属性 9：留言附件级联删除

*对于任何*包含附件的留言，删除该留言后，关联的附件文件应该从文件系统中删除，且数据库中不应该有孤立的附件记录。

**验证：需求 6.5, 8.2**

### 属性 10：文件访问权限正确性

*对于任何*文件访问请求，如果文件类型为公共文件（简历、音频、公开图片），未认证用户应该能访问；如果文件类型为私有文件（留言附件），只有认证的管理员应该能访问。

**验证：需求 7.1, 7.2**

### 属性 11：路径遍历防护

*对于任何*包含路径遍历尝试（如 `../`、`..\\`）的文件路径请求，系统应该拒绝访问并返回错误，不应该允许访问文件根目录之外的文件。

**验证：需求 7.4**

### 属性 12：数据库-文件系统一致性

*对于任何*文件记录，如果数据库中存在该记录，则文件系统中应该存在对应的文件；如果文件系统中存在文件，则数据库中应该有对应的记录（对于需要记录的文件类型）。

**验证：需求 8.1, 8.2, 8.4**

### 属性 13：文件上传双重验证

*对于任何*上传的文件，系统应该同时验证文件扩展名和文件内容的 Magic Bytes，只有两者都匹配预期类型时才接受上传。

**验证：需求 9.1, 9.2, 5.5**

### 属性 14：文件大小限制

*对于任何*上传的文件，如果文件大小超过类型限制（简历 20MB、图片 10MB、音频 50MB）或为零字节，系统应该拒绝上传。

**验证：需求 9.3, 9.4**

### 属性 15：文件名安全性

*对于任何*上传的文件，如果文件名包含路径遍历字符（`../`、`..\\`）或禁止的特殊字符，系统应该拒绝上传或清理文件名。

**验证：需求 9.5**

### 属性 16：条件请求支持

*对于任何*支持 ETag 的文件，如果客户端发送带有 `If-None-Match` 头且 ETag 匹配的请求，服务器应该返回 304 Not Modified 而不是完整文件内容。

**验证：需求 10.5**

### 属性 17：错误日志完整性

*对于任何*文件操作失败，系统应该记录包含操作类型、文件路径、错误原因和时间戳的错误日志。

**验证：需求 11.1, 11.2, 11.3**

### 属性 18：文件元数据完整性

*对于任何*上传的文件，数据库中应该记录文件名、大小、MIME 类型、上传时间和上传者（如果已认证），且这些元数据应该准确反映文件的实际属性。

**验证：需求 12.1, 12.4**

### 属性 19：下载响应头正确性

*对于任何*文件下载请求，响应应该包含正确的 `Content-Type`（基于文件 MIME 类型）和 `Content-Disposition`（包含 UTF-8 编码的文件名）头。

**验证：需求 13.3**

### 属性 20：文件类型目录隔离

*对于任何*上传的文件，根据文件类型（简历、音频、图片、留言附件），文件应该保存在对应的独立子目录中，不应该混合存储。

**验证：需求 14.3**


## 错误处理

### 错误分类

#### 1. 文件操作错误

**场景：** 文件读写、复制、删除失败

**处理策略：**
- 捕获文件系统异常（权限不足、磁盘空间不足、文件不存在等）
- 记录详细错误日志（操作类型、文件路径、错误代码、错误消息）
- 回滚相关的数据库操作
- 向客户端返回友好的错误消息（不暴露内部路径）

**示例：**
```typescript
try {
  await fs.copyFile(sourcePath, targetPath)
  await db.updateActiveResume(version)
} catch (error) {
  logger.error('简历同步失败', {
    operation: 'syncResume',
    version,
    sourcePath,
    targetPath,
    error: error.message
  })
  // 回滚数据库操作
  await db.rollback()
  throw new FileOperationError('简历文件同步失败，请稍后重试')
}
```

#### 2. 编码错误

**场景：** 文件名包含无法处理的字符、编码转换失败

**处理策略：**
- 验证文件名是否为有效的 UTF-8
- 记录原始文件名和编码信息
- 提供文件名清理功能（移除或替换非法字符）
- 向用户提示文件名问题并建议修改

**示例：**
```typescript
function validateAndCleanFilename(filename: string): string {
  // 检查是否为有效 UTF-8
  if (!isValidUtf8(filename)) {
    logger.warn('文件名编码无效', { filename })
    throw new EncodingError('文件名包含无效字符，请使用标准字符')
  }
  
  // 移除路径遍历字符
  const cleaned = filename.replace(/\.\.[/\\]/g, '')
  
  // 移除其他危险字符
  return cleaned.replace(/[<>:"|?*]/g, '_')
}
```

#### 3. 并发冲突

**场景：** 多个请求同时修改同一资源

**处理策略：**
- 使用数据库事务和行级锁
- 实现乐观锁（版本号检查）
- 对于文件操作使用文件锁或原子操作
- 冲突时返回明确的错误信息

**示例：**
```typescript
async function setActiveResume(version: number): Promise<void> {
  const db = getDatabase()
  
  // 开始事务
  db.run('BEGIN TRANSACTION')
  
  try {
    // 检查版本是否存在
    const resume = await getResumeVersion(version)
    if (!resume) {
      throw new NotFoundError('简历版本不存在')
    }
    
    // 更新激活状态（使用行级锁）
    db.run('UPDATE resume_versions SET is_active = 0')
    db.run('UPDATE resume_versions SET is_active = 1 WHERE version = ?', [version])
    
    // 同步文件
    await syncResumeToPublic(resume.filePath)
    
    // 提交事务
    db.run('COMMIT')
  } catch (error) {
    // 回滚事务
    db.run('ROLLBACK')
    throw error
  }
}
```

#### 4. 验证错误

**场景：** 文件类型不匹配、大小超限、Magic Bytes 验证失败

**处理策略：**
- 在文件上传前进行所有验证
- 提供清晰的验证错误消息
- 记录安全相关的验证失败（可能的攻击尝试）
- 拒绝上传并清理临时文件

**示例：**
```typescript
async function validateUploadedFile(
  file: Buffer,
  filename: string,
  expectedType: 'resume' | 'image' | 'audio'
): Promise<ValidationResult> {
  const errors: string[] = []
  
  // 验证文件大小
  if (!validateFileSize(file.length, expectedType)) {
    errors.push(`文件大小超过限制（最大 ${FILE_SIZE_LIMITS[expectedType]} 字节）`)
  }
  
  // 验证文件扩展名
  const ext = path.extname(filename).toLowerCase()
  if (!isExtensionAllowed(ext, expectedType)) {
    errors.push(`不支持的文件类型：${ext}`)
  }
  
  // 验证 Magic Bytes
  const mimeType = getMimeTypeFromExtension(ext)
  if (!validateMagicBytes(file, mimeType)) {
    logger.warn('文件内容与扩展名不匹配', {
      filename,
      extension: ext,
      expectedMimeType: mimeType
    })
    errors.push('文件内容与文件类型不匹配')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

#### 5. 权限错误

**场景：** 未认证用户访问私有资源、权限不足

**处理策略：**
- 在路由层面进行权限检查
- 记录未授权访问尝试
- 返回 401 Unauthorized 或 403 Forbidden
- 不泄露资源是否存在的信息

**示例：**
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    logger.warn('未授权访问尝试', {
      path: req.path,
      ip: req.ip
    })
    return res.status(401).json({ error: '需要登录' })
  }
  next()
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdmin) {
    logger.warn('权限不足', {
      userId: req.session?.userId,
      path: req.path
    })
    return res.status(403).json({ error: '权限不足' })
  }
  next()
}
```

### 错误恢复机制

#### 自动重试

对于临时性错误（网络超时、临时文件锁），实现指数退避重试：

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }
      
      if (!isRetryableError(error)) {
        throw error
      }
      
      const delay = baseDelay * Math.pow(2, attempt)
      await sleep(delay)
    }
  }
  
  throw new Error('不应该到达这里')
}
```

#### 数据一致性修复

提供工具检测和修复数据不一致：

```typescript
async function checkAndRepairConsistency(): Promise<RepairReport> {
  const issues: Issue[] = []
  
  // 检查数据库记录与文件系统的一致性
  const dbRecords = await getAllResumeVersions()
  for (const record of dbRecords) {
    const fileExists = await fs.pathExists(record.filePath)
    if (!fileExists) {
      issues.push({
        type: 'missing_file',
        record,
        severity: 'high'
      })
    }
  }
  
  // 检查激活简历是否同步到公共目录
  const activeResume = await getActiveResume()
  if (activeResume) {
    const publicFileExists = await fs.pathExists('public/resume.pdf')
    if (!publicFileExists) {
      issues.push({
        type: 'missing_public_file',
        record: activeResume,
        severity: 'critical'
      })
      // 自动修复
      await syncResumeToPublic(activeResume.filePath)
    }
  }
  
  return {
    totalIssues: issues.length,
    issues,
    repaired: issues.filter(i => i.repaired).length
  }
}
```

## 测试策略

### 单元测试

**目标：** 验证单个函数和模块的正确性

**覆盖范围：**
- 文件路径验证函数（`isPathSafe`、`getFullPath`）
- 文件名编码函数（`encodeContentDisposition`、`normalizeFilename`）
- Magic Bytes 验证函数（`validateMagicBytes`）
- 文件大小验证函数（`validateFileSize`）
- 缓存头生成函数（`getCacheHeaders`）

**示例：**
```typescript
describe('文件名编码处理', () => {
  it('应该正确编码包含中文的文件名', () => {
    const filename = '黄彦杰-个人简历.pdf'
    const encoded = encodeContentDisposition(filename)
    
    expect(encoded).toContain('filename*=UTF-8\'\'')
    expect(encoded).toContain(encodeURIComponent(filename))
  })
  
  it('应该提供 ASCII fallback', () => {
    const filename = '简历.pdf'
    const encoded = encodeContentDisposition(filename)
    
    expect(encoded).toContain('filename="resume.pdf"')
  })
})
```

### 属性测试

**目标：** 验证系统在各种输入下的通用属性

**测试库：** fast-check（已在项目中使用）

**配置：** 每个属性测试至少运行 100 次迭代

**覆盖的属性：**
- 属性 1-20（如正确性属性部分所述）

**示例：**
```typescript
import fc from 'fast-check'

describe('属性测试：简历文件路径一致性', () => {
  it('上传的简历应该在数据库和文件系统中都存在', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 100, maxLength: 1000 }), // 随机 PDF 内容
        fc.string({ minLength: 1, maxLength: 50 }),         // 随机文件名
        async (pdfContent, filename) => {
          // 添加 PDF 头
          const pdfBuffer = Buffer.concat([
            Buffer.from('%PDF-1.4\n'),
            Buffer.from(pdfContent)
          ])
          
          // 上传简历
          const result = await uploadResume(pdfBuffer, `${filename}.pdf`)
          
          if (!result.success) {
            return true // 验证失败是可接受的
          }
          
          // 验证数据库记录存在
          const dbRecord = await getResumeVersion(result.version!)
          expect(dbRecord).toBeDefined()
          
          // 验证文件存在
          const fileExists = await fs.pathExists(dbRecord!.filePath)
          expect(fileExists).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: frontend-backend-data-sync-fix, Property 1: 上传的简历应该在数据库和文件系统中都存在
```

### 集成测试

**目标：** 验证多个组件协同工作的正确性

**测试场景：**
1. 完整的简历上传-激活-下载流程
2. 简历版本切换和文件同步
3. 并发下载和统计更新
4. 文件更新后的缓存失效
5. 权限控制和访问日志

**示例：**
```typescript
describe('集成测试：简历完整流程', () => {
  it('应该正确处理上传-激活-下载流程', async () => {
    // 1. 上传简历
    const pdfContent = await fs.readFile('test/fixtures/resume.pdf')
    const uploadResult = await uploadResume(pdfContent, '测试简历.pdf')
    expect(uploadResult.success).toBe(true)
    
    const version = uploadResult.version!
    
    // 2. 设置为当前简历
    const setActiveResult = await setActiveResume(version)
    expect(setActiveResult.success).toBe(true)
    
    // 3. 验证公共目录文件已更新
    const publicFileExists = await fs.pathExists('public/resume.pdf')
    expect(publicFileExists).toBe(true)
    
    const publicContent = await fs.readFile('public/resume.pdf')
    expect(publicContent.equals(pdfContent)).toBe(true)
    
    // 4. 前端下载简历
    const downloadResponse = await request(app)
      .get(`/api/files/resume/download/${version}`)
      .expect(200)
    
    expect(downloadResponse.body).toEqual(pdfContent)
    
    // 5. 验证下载统计更新
    const versions = await getResumeVersions()
    const downloadedVersion = versions.find(v => v.version === version)
    expect(downloadedVersion!.downloadCount).toBe(1)
    
    const totalDownloads = await getTotalResumeDownloads()
    expect(totalDownloads).toBeGreaterThanOrEqual(1)
  })
})
```

### 端到端测试

**目标：** 验证从用户角度的完整功能

**工具：** Playwright（已在项目中使用）

**测试场景：**
1. 用户从前端下载简历
2. 管理员在后台上传新简历
3. 管理员切换当前简历版本
4. 验证前端立即显示新简历

**示例：**
```typescript
import { test, expect } from '@playwright/test'

test('前端简历下载应该获取最新版本', async ({ page, context }) => {
  // 1. 访问前端页面
  await page.goto('/')
  
  // 2. 点击下载简历按钮
  const downloadPromise = page.waitForEvent('download')
  await page.click('button:has-text("下载简历")')
  const download = await downloadPromise
  
  // 3. 验证下载的文件
  const filename = download.suggestedFilename()
  expect(filename).toContain('.pdf')
  
  // 4. 在后台上传新简历
  const adminPage = await context.newPage()
  await adminPage.goto('/admin')
  await adminPage.fill('input[name="username"]', 'admin')
  await adminPage.fill('input[name="password"]', 'password')
  await adminPage.click('button[type="submit"]')
  
  await adminPage.goto('/admin/files/resume')
  await adminPage.setInputFiles('input[type="file"]', 'test/fixtures/new-resume.pdf')
  await adminPage.click('button:has-text("上传")')
  
  // 等待上传完成
  await adminPage.waitForSelector('text=上传成功')
  
  // 5. 设置为当前简历
  await adminPage.click('button:has-text("设为当前")')
  await adminPage.waitForSelector('text=设置成功')
  
  // 6. 返回前端页面，再次下载
  await page.reload()
  const newDownloadPromise = page.waitForEvent('download')
  await page.click('button:has-text("下载简历")')
  const newDownload = await newDownloadPromise
  
  // 7. 验证下载的是新文件
  const newPath = await newDownload.path()
  const newContent = await fs.readFile(newPath!)
  const expectedContent = await fs.readFile('test/fixtures/new-resume.pdf')
  
  expect(newContent.equals(expectedContent)).toBe(true)
})
```

### 性能测试

**目标：** 验证系统在负载下的性能

**测试场景：**
1. 并发下载测试（100 个并发请求）
2. 大文件上传测试（接近 20MB 的简历）
3. 文件同步性能测试
4. 数据库查询性能测试

**示例：**
```typescript
describe('性能测试：并发下载', () => {
  it('应该能处理 100 个并发下载请求', async () => {
    const concurrency = 100
    const startTime = Date.now()
    
    const promises = Array.from({ length: concurrency }, () =>
      request(app)
        .get('/api/files/resume/download/1')
        .expect(200)
    )
    
    await Promise.all(promises)
    
    const duration = Date.now() - startTime
    
    // 应该在 5 秒内完成
    expect(duration).toBeLessThan(5000)
    
    // 验证下载统计正确
    const version = await getResumeVersion(1)
    expect(version!.downloadCount).toBe(concurrency)
  })
})
```


## 实施细节

### 文件同步实现

#### 简历同步到公共目录

```typescript
/**
 * 同步激活的简历到公共目录
 * 使用临时文件 + 原子重命名确保原子性
 */
async function syncActiveResumeToPublic(): Promise<void> {
  const activeResume = await getActiveResume()
  
  if (!activeResume) {
    logger.warn('没有激活的简历版本')
    return
  }
  
  const sourcePath = path.join(FILE_ROOT, activeResume.filePath)
  const targetPath = path.join(PUBLIC_ROOT, 'resume.pdf')
  const tempPath = path.join(PUBLIC_ROOT, `.resume.pdf.tmp.${Date.now()}`)
  
  try {
    // 1. 复制到临时文件
    await fs.copyFile(sourcePath, tempPath)
    
    // 2. 原子重命名（覆盖旧文件）
    await fs.rename(tempPath, targetPath)
    
    // 3. 记录同步日志
    await logFileSync({
      operation: 'sync',
      sourceFile: sourcePath,
      targetPath,
      fileType: 'resume',
      status: 'success'
    })
    
    logger.info('简历同步成功', {
      version: activeResume.version,
      filename: activeResume.filename
    })
  } catch (error) {
    // 清理临时文件
    await fs.remove(tempPath).catch(() => {})
    
    await logFileSync({
      operation: 'sync',
      sourcePath,
      targetPath,
      fileType: 'resume',
      status: 'failed',
      errorMessage: error.message
    })
    
    throw error
  }
}
```

#### 音频文件同步

音频文件使用符号链接或复制（根据操作系统）：

```typescript
async function syncAudioToPublic(audioPath: string): Promise<void> {
  const sourcePath = path.join(FILE_ROOT, audioPath)
  const targetPath = path.join(PUBLIC_ROOT, audioPath)
  
  // 确保目标目录存在
  await fs.ensureDir(path.dirname(targetPath))
  
  try {
    // 尝试创建符号链接（Linux/Mac）
    await fs.symlink(sourcePath, targetPath)
  } catch (error) {
    // 如果符号链接失败，使用复制（Windows）
    await fs.copyFile(sourcePath, targetPath)
  }
}
```

### 下载统计实现

```typescript
/**
 * 记录简历下载（事务性更新两个表）
 */
async function recordResumeDownload(version: number, source: string): Promise<void> {
  const db = getDatabase()
  
  db.run('BEGIN TRANSACTION')
  
  try {
    // 1. 更新版本表的下载计数
    db.run(
      'UPDATE resume_versions SET download_count = download_count + 1 WHERE version = ?',
      [version]
    )
    
    // 2. 更新统计表的总下载计数
    db.run(
      'UPDATE statistics SET resume_downloads = resume_downloads + 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1'
    )
    
    // 3. 记录下载日志（可选，用于分析）
    db.run(
      'INSERT INTO download_log (version, source, timestamp) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [version, source]
    )
    
    db.run('COMMIT')
    
    logger.info('记录简历下载', { version, source })
  } catch (error) {
    db.run('ROLLBACK')
    logger.error('记录下载失败', { version, source, error: error.message })
    throw error
  }
}
```

### 文件名编码实现

```typescript
/**
 * 编码文件名用于 Content-Disposition 头
 * 遵循 RFC 5987 标准
 */
function encodeContentDisposition(filename: string): string {
  // 生成 ASCII fallback（移除非 ASCII 字符）
  const asciiFallback = filename.replace(/[^\x00-\x7F]/g, '_')
  
  // RFC 5987 编码
  const encodedFilename = encodeURIComponent(filename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A')
  
  // 组合两种格式
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`
}
```

### 缓存控制实现

```typescript
/**
 * 获取文件的缓存控制头
 */
function getCacheHeaders(fileType: FileType, isVersioned: boolean): CacheHeaders {
  const headers: CacheHeaders = {}
  
  switch (fileType) {
    case 'resume':
      if (isVersioned) {
        // 历史版本：永久缓存
        headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      } else {
        // 当前简历：不缓存
        headers['Cache-Control'] = 'no-cache, must-revalidate'
        headers['Pragma'] = 'no-cache'
        headers['Expires'] = '0'
      }
      break
      
    case 'audio':
      // 音频：1 天缓存
      headers['Cache-Control'] = 'public, max-age=86400'
      break
      
    case 'image':
      // 图片：7 天缓存
      headers['Cache-Control'] = 'public, max-age=604800'
      break
      
    case 'static':
      // 静态资源：30 天缓存
      headers['Cache-Control'] = 'public, max-age=2592000'
      break
  }
  
  return headers
}

/**
 * 生成带版本标识的 URL
 */
function generateVersionedUrl(basePath: string, version: string | number): string {
  const timestamp = typeof version === 'number' ? version : Date.now()
  return `${basePath}?v=${timestamp}`
}
```

### 路径安全验证

```typescript
/**
 * 验证路径安全性（防止路径遍历）
 */
function isPathSafe(relativePath: string): boolean {
  // 空路径视为根目录
  if (!relativePath || relativePath === '' || relativePath === '/') {
    return true
  }
  
  // 检查禁止的名称
  const parts = relativePath.split(/[/\\]/)
  for (const part of parts) {
    if (FORBIDDEN_NAMES.has(part)) {
      return false
    }
  }
  
  // 规范化路径
  const normalizedPath = path.normalize(relativePath)
  
  // 检查路径遍历
  if (normalizedPath.startsWith('..') || normalizedPath.includes('..')) {
    return false
  }
  
  // 构建完整路径并验证
  const fullPath = path.resolve(FILE_ROOT, normalizedPath)
  
  // 确保在文件根目录内
  return fullPath.startsWith(FILE_ROOT)
}
```

## 数据迁移策略

### 迁移脚本设计

#### 1. 数据一致性检查脚本

```typescript
/**
 * 检查数据库记录与文件系统的一致性
 */
async function checkDataConsistency(): Promise<ConsistencyReport> {
  const issues: Issue[] = []
  
  // 检查简历版本
  const resumeVersions = await getAllResumeVersions()
  for (const version of resumeVersions) {
    const filePath = path.join(FILE_ROOT, version.filePath)
    const fileExists = await fs.pathExists(filePath)
    
    if (!fileExists) {
      issues.push({
        type: 'missing_file',
        severity: 'high',
        description: `简历版本 ${version.version} 的文件不存在`,
        record: version,
        suggestedFix: '从备份恢复或删除数据库记录'
      })
    }
  }
  
  // 检查激活简历的公共副本
  const activeResume = await getActiveResume()
  if (activeResume) {
    const publicPath = path.join(PUBLIC_ROOT, 'resume.pdf')
    const publicExists = await fs.pathExists(publicPath)
    
    if (!publicExists) {
      issues.push({
        type: 'missing_public_file',
        severity: 'critical',
        description: '公共目录缺少当前简历',
        record: activeResume,
        suggestedFix: '运行同步脚本'
      })
    } else {
      // 检查内容是否一致
      const sourcePath = path.join(FILE_ROOT, activeResume.filePath)
      const sourceHash = await getFileHash(sourcePath)
      const publicHash = await getFileHash(publicPath)
      
      if (sourceHash !== publicHash) {
        issues.push({
          type: 'file_mismatch',
          severity: 'high',
          description: '公共目录的简历与激活版本不一致',
          record: activeResume,
          suggestedFix: '运行同步脚本'
        })
      }
    }
  }
  
  // 检查孤立文件
  const resumeDir = path.join(FILE_ROOT, 'resume')
  const files = await fs.readdir(resumeDir)
  
  for (const file of files) {
    const filePath = `resume/${file}`
    const hasRecord = resumeVersions.some(v => v.filePath === filePath)
    
    if (!hasRecord) {
      issues.push({
        type: 'orphan_file',
        severity: 'medium',
        description: `文件 ${file} 没有对应的数据库记录`,
        filePath,
        suggestedFix: '删除文件或创建数据库记录'
      })
    }
  }
  
  return {
    totalIssues: issues.length,
    criticalIssues: issues.filter(i => i.severity === 'critical').length,
    highIssues: issues.filter(i => i.severity === 'high').length,
    mediumIssues: issues.filter(i => i.severity === 'medium').length,
    issues
  }
}
```

#### 2. 文件同步脚本

```typescript
/**
 * 同步所有需要公开访问的文件
 */
async function syncAllFiles(): Promise<SyncReport> {
  const results: SyncResult[] = []
  
  // 1. 同步当前简历
  try {
    await syncActiveResumeToPublic()
    results.push({
      type: 'resume',
      status: 'success',
      message: '简历同步成功'
    })
  } catch (error) {
    results.push({
      type: 'resume',
      status: 'failed',
      message: `简历同步失败: ${error.message}`
    })
  }
  
  // 2. 同步音频文件
  const audioTypes: AudioType[] = ['bgm', 'sfx']
  for (const type of audioTypes) {
    const audioFiles = await getAudioByType(type)
    
    for (const audio of audioFiles) {
      try {
        await syncAudioToPublic(audio.path)
        results.push({
          type: 'audio',
          status: 'success',
          message: `音频文件 ${audio.name} 同步成功`
        })
      } catch (error) {
        results.push({
          type: 'audio',
          status: 'failed',
          message: `音频文件 ${audio.name} 同步失败: ${error.message}`
        })
      }
    }
  }
  
  return {
    total: results.length,
    successful: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'failed').length,
    results
  }
}
```

#### 3. 编码修复脚本

```typescript
/**
 * 修复文件名编码问题
 */
async function fixFileEncoding(): Promise<FixReport> {
  const fixes: Fix[] = []
  
  // 检查所有文件记录
  const allFiles = await getAllFileRecords()
  
  for (const file of allFiles) {
    // 检查文件名是否为有效 UTF-8
    if (!isValidUtf8(file.filename)) {
      try {
        // 尝试从不同编码转换
        const fixedFilename = await detectAndConvertEncoding(file.filename)
        
        // 更新数据库记录
        await updateFileRecord(file.id, { filename: fixedFilename })
        
        fixes.push({
          fileId: file.id,
          originalFilename: file.filename,
          fixedFilename,
          status: 'success'
        })
      } catch (error) {
        fixes.push({
          fileId: file.id,
          originalFilename: file.filename,
          status: 'failed',
          error: error.message
        })
      }
    }
  }
  
  return {
    totalChecked: allFiles.length,
    totalFixed: fixes.filter(f => f.status === 'success').length,
    totalFailed: fixes.filter(f => f.status === 'failed').length,
    fixes
  }
}
```

### 迁移执行计划

#### 阶段 1：准备和备份（预计 30 分钟）

1. 创建完整的数据库备份
2. 创建文件系统备份（`src/admin/file/` 和 `public/`）
3. 记录当前系统状态

```bash
# 备份脚本
npm run backup:create
npm run backup:verify
```

#### 阶段 2：一致性检查（预计 15 分钟）

1. 运行一致性检查脚本
2. 生成问题报告
3. 评估问题严重性

```bash
npm run migrate:check
```

#### 阶段 3：代码部署（预计 1 小时）

1. 部署新的后端代码
2. 部署新的前端代码
3. 更新配置文件

```bash
npm run deploy:backend
npm run deploy:frontend
```

#### 阶段 4：数据修复（预计 30 分钟）

1. 运行文件同步脚本
2. 运行编码修复脚本
3. 验证修复结果

```bash
npm run migrate:sync
npm run migrate:fix-encoding
npm run migrate:verify
```

#### 阶段 5：验证和测试（预计 1 小时）

1. 运行自动化测试套件
2. 手动测试关键功能
3. 验证数据一致性

```bash
npm run test:integration
npm run test:e2e
npm run migrate:check
```

#### 阶段 6：监控和回滚准备（持续）

1. 监控错误日志
2. 监控性能指标
3. 准备回滚方案

### 回滚方案

如果迁移失败，执行以下步骤：

1. 停止服务
2. 恢复数据库备份
3. 恢复文件系统备份
4. 回滚代码到之前版本
5. 重启服务
6. 验证系统恢复正常

```bash
npm run rollback:database
npm run rollback:files
npm run rollback:code
npm run service:restart
```

## 监控和维护

### 关键指标

1. **文件同步成功率**：监控简历同步到公共目录的成功率
2. **下载统计准确性**：定期验证两个表的下载计数一致性
3. **文件访问延迟**：监控文件下载的响应时间
4. **错误率**：监控文件操作失败的频率
5. **存储空间使用**：监控文件存储目录的磁盘使用情况

### 日志记录

所有关键操作都应该记录日志：

```typescript
// 文件同步日志
logger.info('文件同步', {
  operation: 'sync',
  fileType: 'resume',
  version: 1,
  sourcePath: 'src/admin/file/resume/resume_v1.pdf',
  targetPath: 'public/resume.pdf',
  duration: 150, // ms
  status: 'success'
})

// 下载统计日志
logger.info('记录下载', {
  operation: 'download',
  fileType: 'resume',
  version: 1,
  source: 'frontend',
  userId: null,
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
})

// 错误日志
logger.error('文件操作失败', {
  operation: 'upload',
  fileType: 'resume',
  filename: '简历.pdf',
  error: 'File size exceeds limit',
  userId: 1
})
```

### 定期维护任务

1. **每日**：运行一致性检查脚本
2. **每周**：清理过期的临时文件
3. **每月**：审查错误日志和性能指标
4. **每季度**：验证备份可恢复性

```bash
# 定期任务配置（cron）
0 2 * * * npm run maintenance:check-consistency
0 3 * * 0 npm run maintenance:cleanup-temp
0 4 1 * * npm run maintenance:review-logs
```

