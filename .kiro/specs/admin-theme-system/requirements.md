# 需求文档

## 简介

管理系统主题系统完善功能，旨在解决当前深色主题不完整的问题。现有的主题切换功能已经实现了基础架构（CSS 变量定义、主题切换逻辑、ThemeSwitcher 组件），但页面组件和 Element Plus 组件仍使用硬编码颜色值，导致深色主题下内容区域（卡片、表格、表单等）仍显示白色背景。

## 术语表

- **Theme_System**：主题系统，负责管理和应用浅色/深色主题的整体架构
- **Theme_Variables**：主题变量，定义在 CSS 变量中的颜色、阴影等样式值
- **Element_Plus_Override**：Element Plus 覆盖样式，用于覆盖 Element Plus 组件默认样式的 CSS 规则
- **Page_Component**：页面组件，指 Dashboard.vue、Content.vue 等视图组件
- **Dashboard_Component**：仪表盘组件，指 StatCard.vue、TrendChart.vue 等仪表盘子组件
- **Hardcoded_Color**：硬编码颜色，直接写在样式中的固定颜色值（如 `#ffffff`、`#303133`）

## 需求

### 需求 1：Element Plus 深色模式覆盖

**用户故事：** 作为管理员，我希望在深色主题下 Element Plus 组件能正确显示深色样式，以便获得一致的视觉体验。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 卡片组件（el-card）的背景色设置为深色背景变量
2. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 表格组件（el-table）的背景色、表头背景色、行悬停背景色设置为深色主题变量
3. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 表单组件（el-input、el-select、el-date-picker）的背景色和边框色设置为深色主题变量
4. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 对话框组件（el-dialog）的背景色设置为深色背景变量
5. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 标签页组件（el-tabs）的背景色和边框色设置为深色主题变量
6. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 下拉菜单组件（el-dropdown-menu）的背景色设置为深色背景变量
7. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 消息提示组件（el-message、el-notification）的背景色设置为深色背景变量
8. WHEN 用户切换到深色主题 THEN THE Theme_System SHALL 将 Element Plus 分页组件（el-pagination）的背景色和文字颜色设置为深色主题变量

### 需求 2：Dashboard 页面主题适配

**用户故事：** 作为管理员，我希望数据看板页面在深色主题下正确显示，以便在夜间或低光环境下舒适地查看数据。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Dashboard 页面容器背景色替换为主题变量 `var(--bg-color-page)`
2. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Dashboard 页面头部背景色替换为主题变量 `var(--bg-color)`
3. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Dashboard 页面所有文字颜色替换为主题变量（`var(--text-primary)`、`var(--text-regular)`、`var(--text-secondary)`）
4. WHEN 用户切换到深色主题 THEN THE Dashboard_Component SHALL 将 StatCard 组件的背景色、文字颜色、边框色替换为主题变量
5. WHEN 用户切换到深色主题 THEN THE Dashboard_Component SHALL 将图表卡片的背景色和边框色替换为主题变量
6. WHEN 用户切换到深色主题 THEN THE Dashboard_Component SHALL 将游戏统计卡片的背景色和文字颜色替换为主题变量

### 需求 3：Content 页面主题适配

**用户故事：** 作为管理员，我希望内容管理页面在深色主题下正确显示，以便舒适地编辑和管理内容。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Content 页面标题颜色替换为主题变量 `var(--text-primary)`
2. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Content 页面标签页背景色替换为主题变量 `var(--bg-color)`
3. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将预览对话框背景色替换为主题变量

### 需求 4：Message 页面主题适配

**用户故事：** 作为管理员，我希望留言管理页面在深色主题下正确显示，以便舒适地查看和管理留言。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Message 页面标题和描述文字颜色替换为主题变量
2. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将留言筛选器背景色替换为主题变量
3. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将留言详情对话框背景色替换为主题变量

### 需求 5：File 页面主题适配

**用户故事：** 作为管理员，我希望文件管理页面在深色主题下正确显示，以便舒适地管理文件资源。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 File 页面标题和描述文字颜色替换为主题变量
2. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将文件浏览器工具栏背景色替换为主题变量 `var(--bg-color-page)`
3. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将文件浏览器内容区背景色和边框色替换为主题变量

### 需求 6：Game 页面主题适配

**用户故事：** 作为管理员，我希望游戏管理页面在深色主题下正确显示，以便舒适地管理游戏配置。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 Game 页面标题和描述文字颜色替换为主题变量
2. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将开关卡片背景色替换为主题变量
3. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将配置工具栏背景色替换为主题变量 `var(--bg-color-page)`
4. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将开关项背景色替换为主题变量

### 需求 7：SEO 页面主题适配

**用户故事：** 作为管理员，我希望 SEO 管理页面在深色主题下正确显示，以便舒适地配置 SEO 信息。

#### 验收标准

1. WHEN 用户切换到深色主题 THEN THE Page_Component SHALL 将 SEO 页面标题和描述文字颜色替换为主题变量

### 需求 8：主题切换平滑过渡

**用户故事：** 作为管理员，我希望主题切换时有平滑的过渡效果，以便获得流畅的用户体验。

#### 验收标准

1. WHEN 用户切换主题 THEN THE Theme_System SHALL 在 300ms 内完成所有颜色的过渡动画
2. WHEN 用户设置了减少动画偏好 THEN THE Theme_System SHALL 禁用过渡动画以尊重用户偏好
