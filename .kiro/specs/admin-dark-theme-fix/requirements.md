# 需求文档

## 简介

本文档定义了管理系统前端 P0 级别紧急修复的需求，包括暗色主题样式修复和数据显示异常问题修复。这些问题严重影响用户体验和系统功能的正常使用。

## 术语表

- **Admin_Frontend**（管理系统前端）：Vue 3 + TypeScript 构建的管理后台界面
- **Dark_Theme**（暗色主题）：系统的深色显示模式
- **Element_Plus**：Vue 3 的 UI 组件库
- **Theme_Switcher**（主题切换器）：用于切换浅色/深色/跟随系统主题的组件
- **Beijing_Time**（北京时间）：UTC+8 时区的时间显示格式

## 需求

### 需求 1：内容管理暗色主题修复

**用户故事：** 作为管理员，我希望在暗色主题下内容管理页面的所有元素都能正确显示暗色样式，以便获得一致的视觉体验。

#### 验收标准

1. WHILE Dark_Theme 激活时，THE ProfileForm（个人信息表单）组件的基本信息框、个人简介框、求职意向框 SHALL 使用暗色背景和边框样式
2. WHILE Dark_Theme 激活时，THE ProfileForm 组件中的所有子元素（输入框、标签、按钮）SHALL 使用暗色主题变量定义的颜色
3. WHILE Dark_Theme 激活时，THE SkillTreeEditor（技能树编辑器）组件的容器 SHALL 使用暗色背景
4. WHILE Dark_Theme 激活时，THE SkillTreeEditor 组件中的文字 SHALL 使用白色或浅色，而非灰色
5. WHILE Dark_Theme 激活时，THE CampusList（校园经历）组件的列表容器 SHALL 使用暗色背景和边框
6. WHILE Dark_Theme 激活时，THE ContentPreview（预览按钮）SHALL 使用暗色主题的按钮样式

### 需求 2：留言管理暗色主题修复

**用户故事：** 作为管理员，我希望留言管理页面的导航栏在暗色主题下正确显示，以便保持界面一致性。

#### 验收标准

1. WHILE Dark_Theme 激活时，THE MessageFilter（留言筛选器）组件的上方导航栏 SHALL 使用暗色背景和边框
2. WHILE Dark_Theme 激活时，THE MessageFilter 组件中的所有表单元素 SHALL 使用暗色主题变量

### 需求 3：文件管理暗色主题修复

**用户故事：** 作为管理员，我希望文件管理页面的所有元素在暗色主题下正确显示，以便获得一致的视觉体验。

#### 验收标准

1. WHILE Dark_Theme 激活时，THE ResumeManager（简历管理）组件的"当前使用版本"整个元素 SHALL 使用暗色背景和边框
2. WHILE Dark_Theme 激活时，THE ImageManager（图片管理）组件所有子页面的上传图片框 SHALL 使用暗色背景和边框
3. WHILE Dark_Theme 激活时，THE AudioManager（音频管理）组件的上传音频框 SHALL 使用暗色背景和边框
4. WHILE Dark_Theme 激活时，THE AudioManager 组件的所有音频项容器 SHALL 使用暗色背景和边框

### 需求 4：通用暗色主题修复

**用户故事：** 作为管理员，我希望所有页面的通用元素在暗色主题下正确显示，以便获得一致的视觉体验。

#### 验收标准

1. WHILE Dark_Theme 激活时，THE Admin_Frontend 中所有页面的按钮、标签、输入字数提示等小元素 SHALL 使用暗色主题变量定义的颜色
2. WHILE Dark_Theme 激活时，THE ThemeSwitcher 组件的暗色图标（月亮）SHALL 在暗色背景下清晰可见
3. WHILE Dark_Theme 激活时，THE Admin_Frontend 中所有 `.form-section`、`.upload-section`、`.list-container` 等容器类 SHALL 使用 CSS 变量而非硬编码颜色

### 需求 5：游戏玩家数据显示修复

**用户故事：** 作为管理员，我希望能够查看游戏玩家的游玩数据，以便分析游戏使用情况。

#### 验收标准

1. WHEN 管理员访问游戏管理页面时，THE LeaderboardTable（排行榜表格）组件 SHALL 正确显示所有玩家的游玩数据
2. WHEN 后端返回排行榜数据时，THE LeaderboardTable 组件 SHALL 正确解析并渲染数据
3. IF 排行榜数据为空，THEN THE LeaderboardTable 组件 SHALL 显示"暂无排行榜数据"的空状态提示

### 需求 6：游戏排行榜数据显示修复

**用户故事：** 作为管理员，我希望能够查看完整的游戏排行榜数据，以便管理游戏记录。

#### 验收标准

1. WHEN 管理员访问排行榜管理标签页时，THE Admin_Frontend SHALL 正确调用排行榜 API 并显示数据
2. WHEN 排行榜数据加载完成时，THE LeaderboardTable 组件 SHALL 显示排名、玩家名、分数、关卡、游戏时长、记录时间
3. IF API 调用失败，THEN THE Admin_Frontend SHALL 显示错误提示信息

### 需求 7：游戏成就信息显示修复

**用户故事：** 作为管理员，我希望能够查看和管理游戏成就信息，以便配置游戏成就系统。

#### 验收标准

1. WHEN 管理员访问成就管理标签页时，THE AchievementList（成就列表）组件 SHALL 正确显示所有成就数据
2. WHEN 成就数据加载完成时，THE AchievementList 组件 SHALL 显示成就图标、ID、名称、描述、条件类型、目标值
3. IF 成就数据为空，THEN THE AchievementList 组件 SHALL 显示"暂无成就数据"的空状态提示

### 需求 8：游戏配置修改生效修复

**用户故事：** 作为管理员，我希望修改游戏配置后能够立即生效，以便实时调整游戏参数。

#### 验收标准

1. WHEN 管理员修改游戏配置并点击保存时，THE Admin_Frontend SHALL 将配置发送到后端并保存
2. WHEN 配置保存成功时，THE Admin_Frontend SHALL 显示成功提示并刷新配置数据
3. WHEN 配置保存成功时，THE 游戏前端 SHALL 能够获取到最新的配置数据
4. IF 配置保存失败，THEN THE Admin_Frontend SHALL 显示错误提示信息

### 需求 9：高级参数面板修复

**用户故事：** 作为管理员，我希望能够正常打开和使用高级参数配置面板，以便进行详细的游戏参数调整。

#### 验收标准

1. WHEN 管理员点击"显示高级参数"开关时，THE AdvancedConfigPanel（高级配置面板）组件 SHALL 正常展开显示
2. WHEN AdvancedConfigPanel 组件加载时，THE 组件 SHALL 正确处理 `modelValue.enemies.types` 数据结构
3. WHEN AdvancedConfigPanel 组件渲染时，THE ElSlider 组件 SHALL 正常初始化和显示
4. IF 配置数据结构不完整，THEN THE AdvancedConfigPanel 组件 SHALL 使用默认值而非抛出错误

### 需求 10：基础参数配置扩展

**用户故事：** 作为管理员，我希望基础参数配置能够包含更多可配置项，以便更灵活地调整游戏参数。

#### 验收标准

1. THE BasicConfigPanel（基础配置面板）组件 SHALL 提供分关卡配置选项
2. THE BasicConfigPanel 组件 SHALL 提供敌我双方参数配置选项
3. THE BasicConfigPanel 组件 SHALL 提供敌人单体参数配置选项
4. THE BasicConfigPanel 组件 SHALL 提供新增敌人类型的配置选项

### 需求 11：文件浏览器功能修复

**用户故事：** 作为管理员，我希望文件浏览器能够正常工作，以便管理服务器上的文件。

#### 验收标准

1. WHEN 管理员在文件浏览器中点击文件时，THE FileTree（文件树）组件 SHALL 能够打开或预览该文件
2. WHEN 管理员在文件浏览器中选择文件时，THE FileTree 组件 SHALL 能够定位到文件所在位置
3. WHEN 管理员在文件浏览器中操作文件时，THE FileTree 组件 SHALL 支持删除和修改文件
4. IF 文件操作失败，THEN THE Admin_Frontend SHALL 显示具体的错误信息

### 需求 12：简历上传中文名称修复

**用户故事：** 作为管理员，我希望上传中文名称的简历后能够正确显示文件名，以便识别不同版本的简历。

#### 验收标准

1. WHEN 管理员上传包含中文名称的简历文件时，THE ResumeManager 组件 SHALL 正确保存并显示中文文件名
2. WHEN 简历列表加载时，THE ResumeManager 组件 SHALL 正确解码并显示中文文件名
3. THE 后端 API SHALL 使用 UTF-8 编码处理文件名

### 需求 13：简历下载版本修复

**用户故事：** 作为管理员，我希望下载简历时能够获取到最新上传的版本，以便确保简历内容是最新的。

#### 验收标准

1. WHEN 管理员点击下载简历时，THE Admin_Frontend SHALL 下载当前设置为"使用中"的简历版本
2. WHEN 管理员更新简历后，THE 前端网站 SHALL 能够下载到最新上传的简历文件
3. THE 简历下载 API SHALL 返回正确版本的简历文件而非缓存的旧版本

### 需求 14：时间显示北京时间修复

**用户故事：** 作为管理员，我希望所有时间显示都使用北京时间，以便准确了解事件发生的时间。

#### 验收标准

1. THE Admin_Frontend 中所有时间显示 SHALL 使用北京时间（UTC+8）格式
2. WHEN 格式化时间时，THE 时间格式化函数 SHALL 将 UTC 时间转换为北京时间
3. THE 时间显示格式 SHALL 为 `YYYY-MM-DD HH:mm` 或 `YYYY-MM-DD HH:mm:ss`
