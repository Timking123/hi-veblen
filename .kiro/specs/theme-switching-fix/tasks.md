# 实现计划: 主题切换修复

## 概述

本计划将修复主站主题切换无效果的问题，并消除管理系统中的硬编码颜色值。实现分为三个主要部分：主站主题切换修复、管理系统视图页面修复、管理系统组件修复。

## 任务

- [x] 1. 修复主站主题切换功能
  - [x] 1.1 修复 `src/composables/useTheme.ts` 中的 `applyTheme` 方法
    - 确保 `data-theme` 属性正确设置到 `document.documentElement`
    - 验证 `resolvedTheme` 计算逻辑正确
    - 确保 `cycleTheme()` 按 dark → light → system → dark 顺序循环
    - _需求: 1.1, 1.2, 1.3_
  
  - [x] 1.2 修复 `src/styles/themes/index.css` 中的 CSS 选择器优先级
    - 确保 `[data-theme="light"]` 选择器正确覆盖 `:root` 默认值
    - 确保 `[data-theme="dark"]` 选择器正确应用深色变量
    - 验证浅色主题显示浅色背景和深色文字
    - 验证深色主题显示深色背景和浅色文字
    - _需求: 1.4, 1.5_
  
  - [x] 1.3 验证主题持久化和系统主题跟随功能
    - 确保主题偏好正确保存到 localStorage
    - 确保页面重新加载时从 localStorage 读取并应用主题
    - 确保 system 模式正确跟随操作系统偏好
    - _需求: 1.6, 1.7, 1.8_
  
  - [ ]* 1.4 编写 useTheme Composable 的属性测试
    - **Property 1: 主题循环切换一致性**
    - **Property 3: localStorage 往返一致性**
    - **Property 4: 系统主题跟随**
    - **验证: 需求 1.1, 1.6, 1.7, 1.8**

- [x] 2. 检查点 - 验证主站主题切换
  - 确保主站主题切换功能正常工作
  - 验证三种模式（dark、light、system）都能正确切换
  - 如有问题请与用户确认

- [x] 3. 扩展管理系统主题变量
  - [x] 3.1 在 `src/admin/frontend/src/styles/themes.scss` 中添加新的 CSS 变量
    - 添加信息卡片背景色变量 (`--info-card-bg`, `--info-card-border`)
    - 添加警告卡片背景色变量 (`--warning-card-bg`, `--warning-card-border`)
    - 添加成功卡片背景色变量 (`--success-card-bg`, `--success-card-border`)
    - 添加代码预览背景色变量 (`--code-preview-bg`)
    - 添加渐变色变量 (`--gradient-primary`, `--gradient-success`, `--gradient-info`, `--gradient-warning`)
    - 为深色和浅色主题分别定义对应的变量值
    - _需求: 2.1, 2.10_

- [x] 4. 修复管理系统视图页面硬编码颜色
  - [x] 4.1 修复 `src/admin/frontend/src/views/Login.vue` 中的硬编码颜色
    - 将 `#667eea`, `#764ba2` 渐变替换为 `var(--gradient-primary)`
    - 将 `#fff` 替换为 `var(--bg-color)` 或 `var(--text-primary-reverse)`
    - 将 `#303133`, `#909399` 替换为 `var(--text-primary)`, `var(--text-secondary)`
    - _需求: 2.8_
  
  - [x] 4.2 修复 `src/admin/frontend/src/views/NotFound.vue` 中的硬编码颜色
    - 将 `#f5f7fa` 替换为 `var(--bg-color-page)`
    - 将 `#409eff` 替换为 `var(--primary-color)`
    - 将 `#303133`, `#909399` 替换为 `var(--text-primary)`, `var(--text-secondary)`
    - _需求: 2.9_
  
  - [x] 4.3 修复 `src/admin/frontend/src/views/Dashboard.vue` 中的硬编码颜色
    - 将内联样式中的渐变色替换为对应的 CSS 变量
    - 将 `#fff` 替换为 `var(--bg-color)`
    - 将统计卡片的渐变背景替换为 CSS 变量
    - _需求: 2.7_
  
  - [x] 4.4 修复 `src/admin/frontend/src/views/Content.vue` 中的硬编码颜色
    - 将全屏预览头部的渐变色替换为 `var(--gradient-primary)`
    - 将白色文字替换为主题变量
    - _需求: 2.2_
  
  - [x] 4.5 检查并修复 `src/admin/frontend/src/views/Message.vue` 中的硬编码颜色
    - 将所有硬编码颜色替换为 CSS 变量
    - _需求: 2.3_
  
  - [x] 4.6 检查并修复 `src/admin/frontend/src/views/File.vue` 中的硬编码颜色
    - 将所有硬编码颜色替换为 CSS 变量
    - _需求: 2.4_
  
  - [x] 4.7 检查并修复 `src/admin/frontend/src/views/Game.vue` 中的硬编码颜色
    - 将所有硬编码颜色替换为 CSS 变量
    - _需求: 2.5_
  
  - [x] 4.8 检查并修复 `src/admin/frontend/src/views/SEO.vue` 中的硬编码颜色
    - 将所有硬编码颜色替换为 CSS 变量
    - _需求: 2.6_

- [x] 5. 检查点 - 验证视图页面修复
  - 确保所有视图页面在深色/浅色主题下显示正确
  - 验证文字与背景的对比度符合可读性要求
  - 如有问题请与用户确认

- [x] 6. 修复管理系统 SEO 组件硬编码颜色
  - [x] 6.1 修复 `src/admin/frontend/src/components/seo/MetaConfigForm.vue` 中的硬编码颜色
    - 将信息卡片背景色 `#F0F9EB`, `#E1F3D8` 替换为 `var(--success-card-bg)`, `var(--success-card-border)`
    - 将文字颜色 `#67C23A` 替换为 `var(--success-color)`
    - 将 `#606266`, `#909399`, `#303133` 替换为对应的文字主题变量
    - 将 `#409EFF` 替换为 `var(--primary-color)`
    - _需求: 3.1, 3.5_
  
  - [x] 6.2 修复 `src/admin/frontend/src/components/seo/SchemaEditor.vue` 中的硬编码颜色
    - 将背景色 `#F5F7FA` 替换为 `var(--code-preview-bg)`
    - 将文字颜色 `#303133`, `#909399`, `#606266` 替换为主题变量
    - 将 `#409EFF` 替换为 `var(--primary-color)`
    - 将错误提示背景色 `#FEF0F0` 替换为 `var(--danger-card-bg)`
    - 将 `#F56C6C` 替换为 `var(--danger-color)`
    - _需求: 3.2, 3.6_
  
  - [x] 6.3 修复 `src/admin/frontend/src/components/seo/SitemapConfig.vue` 中的硬编码颜色
    - 将信息卡片背景色 `#ECF5FF`, `#D9ECFF` 替换为 `var(--info-card-bg)`, `var(--info-card-border)`
    - 将文字颜色 `#409EFF`, `#606266`, `#909399` 替换为主题变量
    - 将代码预览背景色 `#F5F7FA` 替换为 `var(--code-preview-bg)`
    - _需求: 3.3, 3.5, 3.6_
  
  - [x] 6.4 修复 `src/admin/frontend/src/components/seo/RobotsEditor.vue` 中的硬编码颜色
    - 将警告卡片背景色 `#FDF6EC`, `#FAECD8` 替换为 `var(--warning-card-bg)`, `var(--warning-card-border)`
    - 将文字颜色 `#E6A23C` 替换为 `var(--warning-color)`
    - 将 `#606266`, `#909399`, `#303133` 替换为对应的文字主题变量
    - 将 `#409EFF` 替换为 `var(--primary-color)`
    - 将模板选择器背景色 `#F5F7FA`, `#E6F7FF`, `#91D5FF` 替换为 CSS 变量
    - _需求: 3.4, 3.5_

- [x] 7. 检查点 - 验证 SEO 组件修复
  - 确保所有 SEO 组件在深色/浅色主题下显示正确
  - 验证信息卡片、代码预览区域的颜色正确响应主题切换
  - 如有问题请与用户确认

- [ ]* 8. 编写硬编码颜色检测测试
  - **Property 5: 硬编码颜色消除**
  - 编写测试验证管理系统组件样式中不包含硬编码的十六进制颜色值
  - **验证: 需求 2.2-2.9, 3.1-3.5**

- [x] 9. 最终检查点 - 全面验证
  - 确保所有测试通过
  - 验证主站和管理系统的主题切换功能完整
  - 验证所有页面和组件在深色/浅色主题下显示正确
  - 如有问题请与用户确认

## 备注

- 标记为 `*` 的任务为可选任务，可跳过以加快 MVP 进度
- 每个任务都引用了具体的需求以便追溯
- 检查点用于增量验证，确保每个阶段的修复正确
- 属性测试验证通用正确性属性，单元测试验证具体示例和边界情况
