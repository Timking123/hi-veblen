# 需求文档

## 简介

本文档定义了主题切换功能修复的需求。当前存在两个主要问题：
1. 主站前端主题切换无效果，始终显示暗色主题
2. 管理系统前端多个页面存在硬编码颜色值，导致主题切换时部分元素颜色不变

## 术语表

- **Theme_System**（主题系统）：负责管理和应用主题的核心模块
- **Theme_Mode**（主题模式）：主题的三种状态 - dark（深色）、light（浅色）、system（跟随系统）
- **CSS_Variable**（CSS 变量）：使用 `var(--variable-name)` 语法定义的可复用颜色值
- **Hardcoded_Color**（硬编码颜色）：直接写在样式中的固定颜色值（如 `#ffffff`、`rgb()`）
- **data-theme**（主题属性）：HTML 根元素上用于标识当前主题的属性

## 需求

### 需求 1：主站主题切换修复

**用户故事：** 作为网站访客，我希望能够切换网站主题，以便在不同光线环境下获得舒适的浏览体验。

#### 验收标准

1. WHEN 用户点击主题切换按钮 THEN THE Theme_System SHALL 在 dark、light、system 三种模式之间循环切换
2. WHEN 主题模式改变 THEN THE Theme_System SHALL 立即更新 HTML 根元素的 data-theme 属性
3. WHEN data-theme 属性改变 THEN THE Theme_System SHALL 应用对应主题的 CSS 变量
4. WHEN 用户选择 light 模式 THEN THE Theme_System SHALL 显示浅色背景和深色文字
5. WHEN 用户选择 dark 模式 THEN THE Theme_System SHALL 显示深色背景和浅色文字
6. WHEN 用户选择 system 模式 THEN THE Theme_System SHALL 根据操作系统偏好自动选择主题
7. WHEN 主题切换完成 THEN THE Theme_System SHALL 将用户偏好持久化到 localStorage
8. WHEN 页面重新加载 THEN THE Theme_System SHALL 从 localStorage 读取并应用保存的主题偏好

### 需求 2：管理系统硬编码颜色修复

**用户故事：** 作为管理员，我希望管理系统的主题切换能够完整生效，以便在深色模式下也能舒适地使用所有功能。

#### 验收标准

1. WHEN 管理系统主题切换 THEN THE Theme_System SHALL 更新所有页面元素的颜色
2. THE Content_Page（内容管理页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
3. THE Message_Page（留言管理页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
4. THE File_Page（文件管理页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
5. THE Game_Page（游戏管理页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
6. THE SEO_Page（SEO 管理页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
7. THE Dashboard_Page（仪表盘页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
8. THE Login_Page（登录页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
9. THE NotFound_Page（404 页面）SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
10. WHEN 深色主题激活 THEN THE Theme_System SHALL 确保所有文字与背景的对比度符合 WCAG AA 标准

### 需求 3：管理系统组件硬编码颜色修复

**用户故事：** 作为管理员，我希望管理系统的所有组件在主题切换时都能正确响应，以获得一致的视觉体验。

#### 验收标准

1. THE MetaConfigForm_Component SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
2. THE SchemaEditor_Component SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
3. THE SitemapConfig_Component SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
4. THE RobotsEditor_Component SHALL 使用 CSS_Variable 替代所有 Hardcoded_Color
5. WHEN 组件中存在信息卡片 THEN THE Component SHALL 使用主题变量定义背景色和边框色
6. WHEN 组件中存在代码预览区域 THEN THE Component SHALL 使用主题变量定义背景色和文字色
