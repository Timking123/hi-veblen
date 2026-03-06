# 需求文档：前后端数据同步修复

## 简介

本功能旨在解决前后端数据不互通的严重问题，特别是简历文件管理、文件编码、统计数据同步等方面的问题。通过统一数据源、修复文件路径映射、解决编码问题，确保前后端数据的一致性和实时同步。

## 术语表

- **Frontend（前端）**: 用户访问的主应用界面，位于 `src/` 目录
- **Admin_Frontend（后台前端）**: 管理员使用的后台管理界面，位于 `src/admin/frontend/` 目录
- **Backend（后端）**: 后台服务器端应用，位于 `src/admin/backend/` 目录
- **Resume_Version（简历版本）**: 存储在数据库中的简历版本记录
- **Active_Resume（当前简历）**: 标记为 `is_active = 1` 的简历版本
- **File_Path（文件路径）**: 文件在服务器上的相对路径
- **Public_Directory（公共目录）**: 前端可直接访问的静态文件目录 `public/`
- **Admin_File_Directory（后台文件目录）**: 后台管理的文件存储目录 `src/admin/file/`
- **Download_Count（下载次数）**: 记录在 `resume_versions` 表中的下载统计
- **Statistics_Table（统计表）**: 数据库中的 `statistics` 表，存储全局统计数据
- **Magic_Bytes（魔术字节）**: 文件头部的特征字节序列，用于验证文件类型
- **Encoding（编码）**: 文件名和内容的字符编码格式

## 需求

### 需求 1：简历文件路径统一

**用户故事：** 作为系统管理员，我希望简历文件使用统一的存储路径，以便前后端都能访问到最新的简历文件。

#### 验收标准

1. WHEN 后台上传新简历 THEN THE System SHALL 将文件保存到统一的存储位置
2. WHEN 前端下载简历 THEN THE System SHALL 从统一的存储位置获取当前激活的简历
3. WHEN 后台设置当前简历 THEN THE System SHALL 更新数据库中的激活状态并同步到前端可访问的位置
4. THE System SHALL 维护简历版本历史记录在数据库中
5. THE System SHALL 确保前端访问的简历文件与后台当前激活的简历版本一致

### 需求 2：简历下载统计同步

**用户故事：** 作为系统管理员，我希望无论从前端还是后台下载简历，下载次数都能正确统计，以便准确了解简历的访问情况。

#### 验收标准

1. WHEN 用户从前端下载简历 THEN THE System SHALL 增加对应版本的下载计数
2. WHEN 管理员从后台下载简历 THEN THE System SHALL 增加对应版本的下载计数
3. WHEN 查询简历版本列表 THEN THE System SHALL 显示每个版本的准确下载次数
4. THE System SHALL 在数据库的 `resume_versions` 表中持久化下载计数
5. THE System SHALL 确保下载计数的原子性更新避免并发问题

### 需求 3：文件名编码处理

**用户故事：** 作为系统管理员，我希望上传包含中文名称的文件时不会出现乱码，以便正确识别和管理文件。

#### 验收标准

1. WHEN 上传包含中文字符的文件 THEN THE System SHALL 正确保存文件名的 UTF-8 编码
2. WHEN 下载文件 THEN THE System SHALL 在 HTTP 响应头中正确设置 `Content-Disposition` 使用 RFC 5987 编码
3. WHEN 列出文件 THEN THE System SHALL 正确显示包含中文字符的文件名
4. THE System SHALL 支持中文、日文、韩文等多字节字符
5. THE System SHALL 在文件系统和数据库中一致地使用 UTF-8 编码

### 需求 4：简历文件同步机制

**用户故事：** 作为系统用户，我希望在后台修改简历后，前端能立即访问到最新版本，而不是缓存的旧版本。

#### 验收标准

1. WHEN 后台上传新简历并设置为当前版本 THEN THE System SHALL 将文件复制到前端可访问的公共目录
2. WHEN 后台切换当前简历版本 THEN THE System SHALL 更新前端公共目录中的简历文件
3. WHEN 前端请求下载简历 THEN THE System SHALL 添加缓存控制头防止浏览器缓存
4. THE System SHALL 在文件更新时生成新的文件标识或时间戳
5. THE System SHALL 确保文件复制操作的原子性避免部分更新

### 需求 5：音频文件路径映射

**用户故事：** 作为系统管理员，我希望在后台上传的音频文件能被前端正确访问，以便游戏功能正常运行。

#### 验收标准

1. WHEN 后台上传音频文件 THEN THE System SHALL 将文件保存到前端可访问的目录
2. WHEN 前端请求音频文件 THEN THE System SHALL 从正确的路径提供文件
3. THE System SHALL 维护音频文件的分类结构（BGM 和 SFX）
4. THE System SHALL 确保音频文件路径在前后端配置中一致
5. THE System SHALL 验证音频文件的格式和完整性

### 需求 6：留言文件存储统一

**用户故事：** 作为系统管理员，我希望留言附件使用统一的存储机制，以便正确管理和访问用户上传的文件。

#### 验收标准

1. WHEN 用户提交带附件的留言 THEN THE System SHALL 将附件保存到统一的存储位置
2. WHEN 管理员查看留言 THEN THE System SHALL 提供附件的下载链接
3. THE System SHALL 记录附件的元数据（文件名、大小、类型）
4. THE System SHALL 验证附件的文件类型和大小限制
5. THE System SHALL 在删除留言时同步删除关联的附件文件

### 需求 7：文件访问权限控制

**用户故事：** 作为系统架构师，我希望明确区分公共文件和私有文件的访问权限，以便保护敏感数据。

#### 验收标准

1. WHEN 访问公共文件（简历、音频） THEN THE System SHALL 允许未认证用户访问
2. WHEN 访问私有文件（留言附件） THEN THE System SHALL 要求管理员认证
3. THE System SHALL 在路由层面实施访问控制
4. THE System SHALL 防止路径遍历攻击
5. THE System SHALL 记录文件访问日志用于审计

### 需求 8：数据库与文件系统一致性

**用户故事：** 作为系统维护人员，我希望数据库记录与实际文件系统保持一致，以便避免数据不一致导致的错误。

#### 验收标准

1. WHEN 创建文件记录 THEN THE System SHALL 确保文件已成功写入文件系统
2. WHEN 删除文件记录 THEN THE System SHALL 同步删除文件系统中的文件
3. IF 文件操作失败 THEN THE System SHALL 回滚数据库事务
4. THE System SHALL 提供数据一致性检查工具
5. THE System SHALL 在启动时验证关键文件的存在性

### 需求 9：文件上传验证增强

**用户故事：** 作为安全管理员，我希望系统严格验证上传文件的类型和内容，以便防止恶意文件上传。

#### 验收标准

1. WHEN 上传文件 THEN THE System SHALL 同时验证文件扩展名和 Magic Bytes
2. IF 文件扩展名与内容不匹配 THEN THE System SHALL 拒绝上传并记录安全警告
3. THE System SHALL 限制文件大小（简历 20MB、图片 10MB、音频 50MB）
4. THE System SHALL 拒绝零字节文件
5. THE System SHALL 扫描文件名中的特殊字符和路径遍历尝试

### 需求 10：缓存控制策略

**用户故事：** 作为前端开发者，我希望系统提供合适的缓存控制策略，以便在文件更新时用户能获取最新版本。

#### 验收标准

1. WHEN 提供静态文件 THEN THE System SHALL 设置适当的 `Cache-Control` 头
2. WHEN 提供动态内容（当前简历） THEN THE System SHALL 设置 `no-cache` 或短期缓存
3. WHEN 文件更新 THEN THE System SHALL 使用版本号或时间戳作为查询参数
4. THE System SHALL 为不同类型的文件设置不同的缓存策略
5. THE System SHALL 支持 `ETag` 和 `Last-Modified` 头用于条件请求

### 需求 11：错误处理和日志记录

**用户故事：** 作为系统运维人员，我希望系统详细记录文件操作的错误和异常，以便快速定位和解决问题。

#### 验收标准

1. WHEN 文件操作失败 THEN THE System SHALL 记录详细的错误日志包含文件路径和错误原因
2. WHEN 发生编码问题 THEN THE System SHALL 记录原始文件名和编码信息
3. WHEN 检测到安全威胁 THEN THE System SHALL 记录安全警告日志
4. THE System SHALL 为不同严重级别的问题使用不同的日志级别
5. THE System SHALL 提供日志查询和分析接口

### 需求 12：文件元数据管理

**用户故事：** 作为系统管理员，我希望系统记录完整的文件元数据，以便追踪文件的生命周期和使用情况。

#### 验收标准

1. WHEN 上传文件 THEN THE System SHALL 记录文件名、大小、类型、上传时间、上传者
2. WHEN 修改文件 THEN THE System SHALL 更新修改时间和修改者信息
3. THE System SHALL 为简历版本记录创建时间和激活状态变更历史
4. THE System SHALL 记录文件的 MIME 类型和原始文件名
5. THE System SHALL 支持查询文件的完整历史记录

### 需求 13：前端简历下载优化

**用户故事：** 作为网站访客，我希望下载简历时能获取最新版本，而不受浏览器缓存影响。

#### 验收标准

1. WHEN 前端请求下载简历 THEN THE System SHALL 添加时间戳参数防止缓存
2. WHEN 简历文件更新 THEN THE System SHALL 确保前端链接指向最新文件
3. THE System SHALL 在下载响应中设置正确的 `Content-Type` 和 `Content-Disposition` 头
4. THE System SHALL 支持断点续传对于大文件
5. THE System SHALL 在下载失败时提供友好的错误提示

### 需求 14：文件存储路径规范化

**用户故事：** 作为系统架构师，我希望建立清晰的文件存储路径规范，以便团队成员理解和维护文件结构。

#### 验收标准

1. THE System SHALL 使用 `public/` 目录存储前端直接访问的静态文件
2. THE System SHALL 使用 `src/admin/file/` 目录存储后台管理的文件
3. THE System SHALL 为不同类型的文件使用独立的子目录
4. THE System SHALL 在配置文件中集中管理所有文件路径
5. THE System SHALL 提供路径映射文档说明前后端文件访问关系

### 需求 15：数据迁移和修复工具

**用户故事：** 作为系统维护人员，我希望有工具能修复现有的数据不一致问题，以便平滑过渡到新的同步机制。

#### 验收标准

1. THE System SHALL 提供脚本检测数据库记录与文件系统的不一致
2. THE System SHALL 提供脚本同步现有简历文件到正确位置
3. THE System SHALL 提供脚本修复文件名编码问题
4. THE System SHALL 在迁移前备份数据和文件
5. THE System SHALL 生成迁移报告列出所有修复的问题
