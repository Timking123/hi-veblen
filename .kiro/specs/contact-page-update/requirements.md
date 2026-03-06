# 需求文档

## 简介

更新联系方式页面，添加微信信息卡片，重新设计留言功能为可折叠留言栏，实现留言本地存储，修复简历下载路径，并优化整体页面布局使重要信息更加突出。

## 术语表

- **Contact_Page**（联系页面）：展示联系方式和留言功能的页面组件
- **Info_Card**（信息卡片）：展示单个联系方式的卡片组件
- **Message_Form**（留言表单）：用户提交留言的表单组件
- **Message_Storage**（留言存储）：将用户留言保存到本地文件的功能模块

## 需求

### 需求 1：微信信息卡片

**用户故事：** 作为访客，我希望在联系页面看到微信联系方式，以便通过微信与网站主人取得联系。

#### 验收标准

1. WHEN 用户访问联系页面 THEN Contact_Page SHALL 在电话信息卡片右侧显示微信信息卡片
2. THE Info_Card SHALL 显示微信图标、"微信"标签和微信号 "14775378984"
3. WHEN 用户点击微信卡片 THEN Contact_Page SHALL 复制微信号到剪贴板并显示复制成功提示

### 需求 2：留言栏重新设计

**用户故事：** 作为访客，我希望留言栏默认收起，点击后展开，以便页面更简洁且重要信息更突出。

#### 验收标准

1. THE Message_Form SHALL 将"姓名"字段改为"称呼"
2. THE Message_Form SHALL 将"邮箱"字段改为"联系方式"
3. THE Message_Form SHALL 将"发送消息"按钮改为"留言"按钮
4. WHEN 页面加载时 THEN Message_Form SHALL 默认处于收起状态，仅显示"留言"按钮
5. WHEN 用户点击"留言"按钮且表单处于收起状态 THEN Message_Form SHALL 展开显示完整表单
6. WHEN 表单展开后 THEN Message_Form SHALL 显示称呼、联系方式、留言内容三个输入字段和提交按钮

### 需求 3：留言本地存储

**用户故事：** 作为网站主人，我希望访客的留言能保存到本地文件，以便我可以查看和管理留言。

**状态：** ⏳ 部分实现（文件系统存储待后端支持）

#### 验收标准

1. WHEN 用户提交留言 THEN Message_Storage SHALL 将留言保存到 file/message 文件夹
   - **当前实现：** 使用 localStorage 临时存储，待后端 API 实现后改为文件系统存储
2. THE Message_Storage SHALL 使用"日期+留言者称呼"格式命名文件（如：2024-01-15_张三.txt）
   - **已实现：** 文件名生成逻辑已完成
3. THE Message_Storage SHALL 以最小空间格式存储留言内容（包含称呼、联系方式、留言内容、时间戳）
   - **已实现：** 序列化/反序列化逻辑已完成
4. IF 保存失败 THEN Message_Storage SHALL 显示错误提示并允许用户重试
   - **已实现：** 错误处理逻辑已完成

#### 后续计划

- 开发后端管理系统时，添加 API 接口将留言写入 `file/message` 文件夹
- 前端 `saveMessage` 函数已预留 API 调用接口，届时只需修改存储逻辑

### 需求 4：简历下载路径修复

**用户故事：** 作为访客，我希望能正确下载简历文件，以便了解网站主人的详细信息。

#### 验收标准

1. WHEN 用户点击下载简历按钮 THEN Contact_Page SHALL 下载 file/CV/黄彦杰-个人简历.pdf 文件
2. THE Contact_Page SHALL 将下载的文件命名为"黄彦杰_简历.pdf"

### 需求 5：页面布局优化

**用户故事：** 作为访客，我希望联系页面布局美观且重要信息一目了然，以便快速找到需要的联系方式。

#### 验收标准

1. THE Contact_Page SHALL 将联系方式信息卡片（邮箱、电话、微信）放置在页面显眼位置
2. THE Contact_Page SHALL 使用三列网格布局展示三个联系方式卡片（响应式设计）
3. THE Contact_Page SHALL 将简历下载区域与联系方式区域整合，形成统一的信息展示区
4. THE Contact_Page SHALL 将留言栏放置在页面底部，默认收起以减少视觉干扰
5. WHILE 屏幕宽度小于 768px THEN Contact_Page SHALL 将信息卡片改为单列布局
6. THE Contact_Page SHALL 保持页面整体视觉风格一致，使用现有的设计系统变量
