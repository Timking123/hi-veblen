# 实现计划：管理系统前端 P0 级别修复

## 概述

本实现计划将设计文档中的修复方案分解为可执行的编码任务，包括暗色主题样式修复、数据显示修复、功能修复和时间格式修复。

## 任务

- [x] 1. 创建时间格式化工具函数
  - [x] 1.1 在 `src/admin/frontend/src/utils/` 目录下创建 `time.ts` 文件
    - 实现 `formatBeijingTime` 函数，将 UTC 时间转换为北京时间
    - 支持自定义格式参数
    - 处理无效时间字符串的边界情况
    - _需求: 14.1, 14.2, 14.3_
  
  - [x] 1.2 编写时间格式化属性测试
    - **Property 6: 时间格式化正确性**
    - **验证: 需求 14.1, 14.2, 14.3**

- [x] 2. 修复内容管理组件暗色主题样式
  - [x] 2.1 修复 `ProfileForm.vue` 组件样式
    - 将 `.form-section` 的 `background: #fff` 改为 `var(--card-bg)`
    - 将 `.section-title` 的 `color: #303133` 改为 `var(--text-primary)`
    - 将 `.section-title` 的 `border-bottom` 颜色改为 `var(--border-color)`
    - 将 `.intention-item` 的背景色改为 `var(--bg-color-page)`
    - 将 `.intention-text` 的颜色改为 `var(--text-primary)`
    - 将 `.avatar-tip` 的颜色改为 `var(--text-secondary)`
    - _需求: 1.1, 1.2_
  
  - [x] 2.2 修复 `SkillTreeEditor.vue` 组件样式
    - 将 `.tree-container` 的 `background: #fff` 改为 `var(--card-bg)`
    - 将 `.node-name` 的 `color: #303133` 改为 `var(--text-primary)`
    - 将 `.node-level` 的 `color: #909399` 改为 `var(--text-secondary)`
    - _需求: 1.3, 1.4_
  
  - [x] 2.3 修复 `CampusList.vue` 组件样式
    - 将 `.list-container` 的 `background: #fff` 改为 `var(--card-bg)`
    - _需求: 1.5_

- [x] 3. 修复留言管理组件暗色主题样式
  - [x] 3.1 修复 `MessageFilter.vue` 组件样式
    - 检查并修复筛选器容器的背景色和边框色
    - 确保所有表单元素使用 CSS 变量
    - _需求: 2.1, 2.2_

- [x] 4. 修复文件管理组件暗色主题样式
  - [x] 4.1 修复 `ResumeManager.vue` 组件样式
    - 将 `.stat-card` 的背景色和边框色改为 CSS 变量
    - 将 `.upload-section` 的背景色改为 `var(--bg-color-page)`
    - 将 `.stat-value` 和 `.stat-label` 的颜色改为 CSS 变量
    - _需求: 3.1_
  
  - [x] 4.2 修复 `ImageManager.vue` 组件样式
    - 将 `.upload-section` 的 `background: #F5F7FA` 改为 `var(--bg-color-page)`
    - 将 `.upload-tip` 的 `color: #909399` 改为 `var(--text-secondary)`
    - 将 `.image-card` 相关样式改为 CSS 变量
    - 将 `.image-name` 的 `color: #303133` 改为 `var(--text-primary)`
    - 将 `.image-size` 的 `color: #909399` 改为 `var(--text-secondary)`
    - _需求: 3.2_
  
  - [x] 4.3 修复 `AudioManager.vue` 组件样式
    - 将 `.upload-section` 的 `background: #F5F7FA` 改为 `var(--bg-color-page)`
    - 将 `.upload-tip` 的 `color: #909399` 改为 `var(--text-secondary)`
    - 将 `.audio-item` 的 `background: #fff` 改为 `var(--card-bg)`
    - 将 `.audio-item` 的 `border` 颜色改为 `var(--border-color)`
    - _需求: 3.3, 3.4_

- [x] 5. 修复通用暗色主题样式
  - [x] 5.1 修复 `ThemeSwitcher.vue` 组件
    - 确保暗色主题下月亮图标清晰可见
    - 检查按钮在暗色背景下的对比度
    - _需求: 4.2_
  
  - [x] 5.2 在 `themes.scss` 中添加缺失的暗色主题样式覆盖
    - 添加 `.form-section` 暗色主题样式
    - 添加 `.upload-section` 暗色主题样式
    - 添加 `.list-container` 暗色主题样式
    - _需求: 4.1, 4.3_

- [x] 6. 检查点 - 暗色主题修复验证
  - 确保所有暗色主题样式修复完成，在浏览器中测试验证，如有问题请提出。

- [x] 7. 修复 AdvancedConfigPanel 组件错误
  - [x] 7.1 修复 `AdvancedConfigPanel.vue` 中的 TypeError 错误
    - 为 `modelValue.enemies.types` 添加防御性检查
    - 使用计算属性处理可能为 undefined 的数据
    - 为所有 ElSlider 组件添加默认值处理
    - _需求: 9.1, 9.2, 9.3, 9.4_
  
  - [x] 7.2 编写配置数据防御性处理属性测试
    - **Property 5: 配置数据防御性处理**
    - **验证: 需求 9.2, 9.4**

- [x] 8. 扩展基础参数配置面板
  - [x] 8.1 扩展 `BasicConfigPanel.vue` 组件
    - 添加分关卡配置选项（关卡敌人数量、生成速率、难度）
    - 添加敌我双方参数配置选项（玩家/敌人全局倍率）
    - 添加敌人单体参数配置选项（各类型敌人的启用/禁用、属性调整）
    - 添加新增敌人类型的配置入口
    - _需求: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 8.2 更新 `src/admin/frontend/src/api/game.ts` 类型定义
    - 添加扩展的基础配置接口类型
    - _需求: 10.1, 10.2, 10.3, 10.4_

- [x] 9. 修复文件浏览器功能
  - [x] 9.1 扩展 `FileTree.vue` 组件功能
    - 实现文件打开/预览功能
    - 实现文件定位功能
    - 完善文件删除和修改功能
    - 添加详细的错误信息显示
    - _需求: 11.1, 11.2, 11.3, 11.4_

- [x] 10. 修复简历管理功能
  - [x] 10.1 修复简历上传中文名称乱码问题
    - 在前端使用 `encodeURIComponent` 编码文件名
    - 在显示时使用 `decodeURIComponent` 解码文件名
    - _需求: 12.1, 12.2_
  
  - [x] 10.2 修复简历下载版本问题
    - 在下载请求中添加时间戳参数防止缓存
    - 确保下载的是当前设置为"使用中"的版本
    - _需求: 13.1_
  
  - [x] 10.3 编写中文文件名编码属性测试
    - **Property 7: 中文文件名编码往返一致性**
    - **验证: 需求 12.1, 12.2**

- [x] 11. 修复时间显示为北京时间
  - [x] 11.1 更新 `LeaderboardTable.vue` 中的时间格式化
    - 导入并使用 `formatBeijingTime` 函数
    - 替换现有的 `formatDateTime` 函数调用
    - _需求: 14.1_
  
  - [x] 11.2 更新 `ResumeManager.vue` 中的时间格式化
    - 导入并使用 `formatBeijingTime` 函数
    - 替换现有的 `formatTime` 函数调用
    - _需求: 14.1_
  
  - [x] 11.3 更新 `AudioManager.vue` 中的时间格式化
    - 导入并使用 `formatBeijingTime` 函数
    - 替换现有的 `formatTime` 函数调用
    - _需求: 14.1_
  
  - [x] 11.4 更新 `FileTree.vue` 中的时间格式化
    - 导入并使用 `formatBeijingTime` 函数
    - 替换现有的 `formatTime` 函数调用
    - _需求: 14.1_
  
  - [x] 11.5 更新其他组件中的时间格式化
    - 检查并更新 `MessageTable.vue`、`MessageDetail.vue` 等组件
    - 确保所有时间显示都使用北京时间
    - _需求: 14.1_

- [x] 12. 检查点 - 功能修复验证
  - 确保所有功能修复完成，在浏览器中测试验证，如有问题请提出。

- [x] 13. 修复游戏数据显示问题
  - [x] 13.1 检查并修复排行榜数据显示
    - 验证 API 调用是否正确
    - 验证数据解析和渲染逻辑
    - 确保空状态正确显示
    - _需求: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3_
  
  - [x] 13.2 检查并修复成就数据显示
    - 验证 API 调用是否正确
    - 验证数据解析和渲染逻辑
    - 确保空状态正确显示
    - _需求: 7.1, 7.2, 7.3_
  
  - [x] 13.3 检查并修复游戏配置保存功能
    - 验证配置保存 API 调用
    - 验证保存成功后的数据刷新
    - 确保错误提示正确显示
    - _需求: 8.1, 8.2, 8.4_

- [x] 14. 最终检查点 - 全面验证
  - 确保所有修复完成，进行全面测试验证，如有问题请提出。

## 备注

- 每个任务都引用了具体的需求以便追溯
- 检查点任务用于确保增量验证
- 属性测试验证通用的正确性属性
