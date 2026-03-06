# 实现计划: 管理系统主题系统完善

## 概述

本实现计划将设计文档中的方案转化为可执行的编码任务。采用渐进式实现策略，先完成全局样式覆盖，再逐个更新页面组件。

## 任务

- [x] 1. 扩展 themes.scss 添加 Element Plus 深色模式覆盖
  - [x] 1.1 添加 Element Plus 卡片组件（el-card）深色模式样式
    - 设置背景色为 `var(--card-bg)`
    - 设置边框色为 `var(--card-border)`
    - 设置头部边框色为 `var(--border-color)`
    - _需求: 1.1_
  - [x] 1.2 添加 Element Plus 表格组件（el-table）深色模式样式
    - 设置表格背景色、文字颜色
    - 设置表头背景色为 `var(--table-header-bg)`
    - 设置行悬停背景色为 `var(--table-row-hover-bg)`
    - 设置边框色为 `var(--table-border)`
    - _需求: 1.2_
  - [x] 1.3 添加 Element Plus 表单组件深色模式样式
    - 设置 el-input 背景色和边框色
    - 设置 el-select 背景色和边框色
    - 设置 el-date-picker 背景色
    - _需求: 1.3_
  - [x] 1.4 添加 Element Plus 对话框和标签页组件深色模式样式
    - 设置 el-dialog 背景色、标题颜色、边框色
    - 设置 el-tabs 背景色、边框色、激活状态样式
    - _需求: 1.4, 1.5_
  - [x] 1.5 添加 Element Plus 其他组件深色模式样式
    - 设置 el-dropdown-menu 背景色和边框色
    - 设置 el-pagination 背景色和文字颜色
    - 设置 el-message、el-notification 背景色
    - 设置 el-breadcrumb、el-empty、el-divider 等组件样式
    - _需求: 1.6, 1.7, 1.8_

- [x] 2. 更新 Dashboard 页面和组件主题适配
  - [x] 2.1 更新 Dashboard.vue 页面样式
    - 将 `.dashboard-container` 背景色替换为 `var(--bg-color-page)`
    - 将 `.dashboard-header` 背景色替换为 `var(--bg-color)`
    - 将所有硬编码文字颜色替换为主题变量
    - _需求: 2.1, 2.2, 2.3_
  - [x] 2.2 更新 StatCard.vue 组件样式
    - 将卡片背景色、文字颜色、边框色替换为主题变量
    - _需求: 2.4_
  - [x] 2.3 更新 Dashboard.vue 中的图表卡片和游戏统计卡片样式
    - 将 `.chart-card` 背景色和边框色替换为主题变量
    - 将 `.game-stat-card` 背景色和文字颜色替换为主题变量
    - _需求: 2.5, 2.6_

- [x] 3. 检查点 - 验证 Dashboard 页面主题切换
  - 确保所有测试通过，如有问题请询问用户。

- [x] 4. 更新 Content 页面主题适配
  - [x] 4.1 更新 Content.vue 页面样式
    - 将 `.page-title` 颜色替换为 `var(--text-primary)`
    - 将 `.content-tabs` 背景色替换为 `var(--bg-color)`
    - 将预览对话框相关样式替换为主题变量
    - _需求: 3.1, 3.2, 3.3_

- [x] 5. 更新 Message 页面主题适配
  - [x] 5.1 更新 Message.vue 页面样式
    - 将 `.page-header h2` 颜色替换为 `var(--text-primary)`
    - 将 `.page-desc` 颜色替换为 `var(--text-secondary)`
    - _需求: 4.1, 4.2, 4.3_

- [x] 6. 更新 File 页面主题适配
  - [x] 6.1 更新 File.vue 页面样式
    - 将 `.page-header h2` 颜色替换为 `var(--text-primary)`
    - 将 `.page-desc` 颜色替换为 `var(--text-secondary)`
    - 将 `.browser-toolbar` 背景色替换为 `var(--bg-color-page)`
    - 将 `.browser-content` 背景色和边框色替换为主题变量
    - _需求: 5.1, 5.2, 5.3_

- [x] 7. 更新 Game 页面主题适配
  - [x] 7.1 更新 Game.vue 页面样式
    - 将 `.page-header h2` 颜色替换为 `var(--text-primary)`
    - 将 `.page-desc` 颜色替换为 `var(--text-secondary)`
    - 将 `.switch-card` 和 `.switch-item` 背景色替换为主题变量
    - 将 `.config-toolbar` 背景色替换为 `var(--bg-color-page)`
    - _需求: 6.1, 6.2, 6.3, 6.4_

- [x] 8. 更新 SEO 页面主题适配
  - [x] 8.1 更新 SEO.vue 页面样式
    - 将 `.page-header h2` 颜色替换为 `var(--text-primary)`
    - 将 `.page-desc` 颜色替换为 `var(--text-secondary)`
    - _需求: 7.1_

- [x] 9. 检查点 - 验证所有页面主题切换
  - 确保所有测试通过，如有问题请询问用户。

- [x] 10. 验证主题过渡动画
  - [x] 10.1 确认过渡动画配置正确
    - 验证 `.theme-transition` 类的过渡时间为 300ms
    - 验证 `prefers-reduced-motion` 媒体查询正确禁用动画
    - _需求: 8.1, 8.2_

- [x] 11. 最终检查点 - 完整功能验证
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 每个任务引用了具体的需求以便追溯
- 检查点用于增量验证功能正确性
- 实现顺序：先全局样式 → 再页面组件 → 最后验证
