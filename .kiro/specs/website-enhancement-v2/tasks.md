# 实施计划：网站增强 V2

## 概述

本实施计划将网站增强功能分为三个阶段实施，每个阶段包含多个可独立完成的任务。所有任务使用 Vue 3 + TypeScript 技术栈实现。

## 任务

### 第一阶段：基础优化

- [x] 1. 主题系统增强
  - [x] 1.1 创建主题 CSS 变量文件
    - 创建 `src/styles/themes/dark.css` 和 `src/styles/themes/light.css`
    - 定义完整的 CSS 变量集（背景色、文字色、边框色、主题色等）
    - 添加主题过渡动画样式
    - _需求: 1.7, 1.3_

  - [x] 1.2 实现 useTheme Composable
    - 创建 `src/composables/useTheme.ts`
    - 实现三种主题模式（dark/light/system）
    - 实现主题循环切换逻辑
    - 实现 localStorage 持久化存储
    - 实现系统主题监听
    - _需求: 1.1, 1.2, 1.4, 1.5, 1.6_

  - [x] 1.3 编写 useTheme 属性测试
    - **属性 1: 主题模式循环切换**
    - **属性 2: 主题偏好往返持久化**
    - **属性 3: 系统主题跟随**
    - **属性 4: 主题配置完整性**
    - **验证: 需求 1.2, 1.4, 1.5, 1.6, 1.7**

  - [x] 1.4 创建 ThemeSwitcher 组件
    - 创建 `src/components/common/ThemeSwitcher.vue`
    - 实现主题切换按钮 UI
    - 添加主题图标（太阳/月亮/系统）
    - 集成到导航栏
    - _需求: 1.2, 1.8_

- [x] 2. 微交互动画系统
  - [x] 2.1 实现 useRipple Composable
    - 创建 `src/composables/useRipple.ts`
    - 实现涟漪效果位置计算
    - 实现涟漪动画生命周期管理（600ms 后自动清除）
    - _需求: 2.1, 2.2_

  - [x] 2.2 编写 useRipple 属性测试
    - **属性 5: 涟漪效果位置计算**
    - **验证: 需求 2.1**

  - [x] 2.3 创建 RippleButton 组件
    - 创建 `src/components/common/RippleButton.vue`
    - 集成 useRipple Composable
    - 添加涟漪动画 CSS
    - _需求: 2.1, 2.2_

  - [x] 2.4 实现 useCard3D Composable
    - 创建 `src/composables/useCard3D.ts`
    - 实现鼠标位置追踪
    - 实现 3D 变换计算（旋转角度限制在 ±10 度）
    - _需求: 2.3, 2.4_

  - [x] 2.5 编写 useCard3D 属性测试
    - **属性 6: 卡片 3D 变换计算**
    - **验证: 需求 2.3, 2.4**

  - [x] 2.6 实现 useScrollAnimation Composable
    - 创建 `src/composables/useScrollAnimation.ts`
    - 使用 Intersection Observer API
    - 支持多种动画类型配置
    - 支持 prefers-reduced-motion 媒体查询
    - _需求: 2.7, 2.8, 2.9_

  - [x] 2.7 编写 useScrollAnimation 属性测试
    - **属性 8: 滚动动画配置**
    - **验证: 需求 2.8**

  - [x] 2.8 增强页面过渡动画
    - 更新 `src/components/layout/PageTransition.vue`
    - 实现前进/后退方向判断
    - 添加滑动和淡入淡出动画
    - _需求: 2.5, 2.6_

  - [x] 2.9 编写路由方向判断属性测试
    - **属性 7: 路由方向判断**
    - **验证: 需求 2.6**

- [x] 3. 检查点 - 确保所有测试通过
  - 运行所有测试，确保通过
  - 如有问题请询问用户

- [x] 4. 移动端优化
  - [x] 4.1 实现 useGesture Composable
    - 创建 `src/composables/useGesture.ts`
    - 实现触摸事件处理
    - 实现滑动方向和速度检测
    - 实现触觉反馈（navigator.vibrate）
    - _需求: 3.1, 3.2, 3.3_

  - [x] 4.2 编写 useGesture 属性测试
    - **属性 9: 手势识别与阈值判断**
    - **验证: 需求 3.1, 3.2**

  - [x] 4.3 添加安全区域适配
    - 更新全局样式，使用 env(safe-area-inset-*) CSS 变量
    - 适配 iPhone 刘海屏和底部指示条
    - _需求: 3.4_

  - [x] 4.4 配置 PWA 支持
    - 安装 vite-plugin-pwa
    - 配置 manifest.json（应用名称、图标、主题色）
    - 配置 Service Worker 基本缓存策略
    - 创建 PWA 图标资源
    - _需求: 3.5, 3.6, 3.7_

- [x] 5. 性能优化
  - [x] 5.1 优化图片懒加载
    - 更新 `src/components/common/LazyImage.vue`
    - 使用 Intersection Observer API
    - 添加骨架屏占位符
    - _需求: 4.1, 4.2_

  - [x] 5.2 优化代码分割
    - 更新 vite.config.ts 配置
    - 配置 ECharts 单独分包
    - 配置路由组件按需加载
    - _需求: 4.3, 4.4_

  - [x] 5.3 添加资源预加载
    - 实现导航链接悬停预加载
    - 配置关键 CSS 和字体预加载
    - _需求: 4.5, 4.6_

- [x] 6. 检查点 - 第一阶段完成
  - 运行所有测试，确保通过
  - 验证主题切换、动画效果、移动端体验
  - 如有问题请询问用户

### 第二阶段：功能增强

- [x] 7. 项目展示模块
  - [x] 7.1 扩展项目数据模型
    - 创建 `src/types/project.ts`
    - 定义 Project 接口（包含截图、演示链接等）
    - 更新 `src/data/profile.ts` 添加项目数据
    - _需求: 5.2_

  - [x] 7.2 创建 ImageCarousel 组件
    - 创建 `src/components/common/ImageCarousel.vue`
    - 实现左右切换功能
    - 实现自动播放模式
    - 添加指示器和箭头控件
    - _需求: 5.3, 5.4_

  - [x] 7.3 编写 ImageCarousel 属性测试
    - **属性 11: 轮播索引计算**
    - **验证: 需求 5.3**

  - [x] 7.4 创建项目详情页
    - 创建 `src/views/ProjectDetail.vue`
    - 添加路由配置 `/projects/:id`
    - 展示项目完整信息
    - 集成 ImageCarousel 组件
    - _需求: 5.1, 5.2, 5.6_

  - [x] 7.5 实现技术栈筛选功能
    - 创建 `src/composables/useProjectFilter.ts`
    - 实现按技术栈筛选项目
    - 添加筛选 UI 组件
    - _需求: 5.5_

  - [x] 7.6 编写项目筛选属性测试
    - **属性 12: 项目筛选逻辑**
    - **验证: 需求 5.5**

- [x] 8. 技能可视化增强
  - [x] 8.1 创建技能树数据结构
    - 创建 `src/types/skillTree.ts`
    - 定义 SkillTreeNode 接口
    - 更新 `src/data/profile.ts` 添加技能树数据
    - _需求: 6.1_

  - [x] 8.2 创建 SkillTree 组件
    - 创建 `src/components/common/SkillTree.vue`
    - 使用 ECharts 树图
    - 实现径向布局
    - 实现展开/折叠功能
    - 实现节点大小动态计算
    - _需求: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.3 编写技能树属性测试
    - **属性 13: 技能树节点展开折叠**
    - **属性 14: 技能节点大小计算**
    - **验证: 需求 6.2, 6.4**

  - [x] 8.4 优化雷达图动画
    - 更新 `src/components/common/SkillChart.vue`
    - 添加数据加载动画
    - 优化悬停交互
    - _需求: 6.5, 6.6_

- [x] 9. 检查点 - 第二阶段完成
  - 运行所有测试，确保通过
  - 验证项目展示和技能可视化功能
  - 如有问题请询问用户

### 第三阶段：创意功能

- [x] 10. 彩蛋游戏增强
  - [x] 10.1 实现 LeaderboardManager
    - 创建 `src/game/LeaderboardManager.ts`
    - 实现分数存储（最多 10 条）
    - 实现分数排序（降序）
    - 实现高分判断
    - _需求: 7.1, 7.2, 7.3_

  - [x] 10.2 编写 LeaderboardManager 属性测试
    - **属性 15: 排行榜存储限制**
    - **属性 16: 排行榜排序**
    - **属性 17: 高分判断**
    - **验证: 需求 7.1, 7.2, 7.3**

  - [x] 10.3 创建 Leaderboard 组件
    - 创建 `src/components/game/Leaderboard.vue`
    - 显示排行榜列表
    - 高亮显示新记录
    - 添加排名图标（金银铜牌）
    - _需求: 7.2, 7.3_

  - [x] 10.4 实现 AchievementSystem
    - 创建 `src/game/AchievementSystem.ts`
    - 定义至少 5 种成就
    - 实现成就条件检查
    - 实现成就持久化存储
    - _需求: 7.4, 7.5, 7.6_

  - [x] 10.5 编写 AchievementSystem 属性测试
    - **属性 18: 成就系统状态管理**
    - **验证: 需求 7.5, 7.6, 7.7**

  - [x] 10.6 创建成就展示组件
    - 创建 `src/components/game/AchievementList.vue`
    - 显示成就列表和解锁状态
    - 创建成就解锁通知组件
    - _需求: 7.7_

  - [x] 10.7 集成排行榜和成就到游戏
    - 更新 `src/components/game/GameContainer.vue`
    - 在游戏结束时保存分数
    - 在游戏过程中检查成就
    - 显示成就解锁通知
    - _需求: 7.1-7.7_

- [x] 11. 个性化体验
  - [x] 11.1 实现 useGreeting Composable
    - 创建 `src/composables/useGreeting.ts`
    - 根据时间返回不同问候语
    - _需求: 8.1_

  - [x] 11.2 编写 useGreeting 属性测试
    - **属性 19: 问候语时间判断**
    - **验证: 需求 8.1**

  - [x] 11.3 实现 useReadingProgress Composable
    - 创建 `src/composables/useReadingProgress.ts`
    - 计算滚动进度百分比
    - _需求: 8.2_

  - [x] 11.4 编写 useReadingProgress 属性测试
    - **属性 20: 阅读进度计算**
    - **验证: 需求 8.2**

  - [x] 11.5 创建 ReadingProgress 组件
    - 创建 `src/components/common/ReadingProgress.vue`
    - 显示页面顶部进度条
    - 添加平滑动画
    - _需求: 8.2, 8.3_

  - [x] 11.6 实现 useKeyboardNavigation Composable
    - 创建 `src/composables/useKeyboardNavigation.ts`
    - 支持数字键导航
    - 支持方向键导航
    - 支持 Escape 键返回
    - _需求: 8.4, 8.5_

  - [x] 11.7 编写 useKeyboardNavigation 属性测试
    - **属性 21: 键盘导航**
    - **验证: 需求 8.4, 8.5**

  - [x] 11.8 集成个性化功能到首页
    - 更新 `src/views/Home.vue`
    - 添加问候语显示
    - 集成阅读进度条
    - 启用键盘导航
    - _需求: 8.1-8.6_

- [x] 12. 最终检查点 - 所有功能完成
  - 运行所有测试，确保通过
  - 验证所有功能正常工作
  - 如有问题请询问用户

## 备注

- 每个任务都引用了具体的需求编号，确保可追溯性
- 检查点任务用于阶段性验证，确保增量开发的稳定性
- 属性测试使用 Vitest + fast-check，每个测试至少运行 100 次迭代
- 所有任务（包括测试任务）均为必需任务，确保代码质量
