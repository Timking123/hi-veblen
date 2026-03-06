# 需求文档

## 简介

本文档定义了 Vue 3 个人求职网站的第二版增强功能需求。该增强计划分为三个阶段，涵盖主题系统、微交互动画、移动端优化、性能优化、项目展示、技能可视化、彩蛋游戏增强以及个性化体验等功能模块。

## 术语表

- **Theme_System**（主题系统）：管理网站视觉主题（深色/浅色/跟随系统）的模块
- **Theme_Switcher**（主题切换器）：用于切换主题的 UI 组件
- **Ripple_Effect**（涟漪效果）：按钮点击时产生的水波纹动画效果
- **Card_3D_Effect**（卡片 3D 效果）：卡片悬停时的三维透视变换效果
- **Page_Transition**（页面过渡）：路由切换时的动画过渡效果
- **Scroll_Animation**（滚动动画）：元素进入视口时触发的动画效果
- **Gesture_Handler**（手势处理器）：处理移动端触摸手势的模块
- **Safe_Area**（安全区域）：移动设备屏幕的可用显示区域（排除刘海、底部指示条等）
- **PWA**（渐进式 Web 应用）：可安装到设备主屏幕的 Web 应用
- **Lazy_Loading**（懒加载）：延迟加载非关键资源的技术
- **Code_Splitting**（代码分割）：将代码拆分为按需加载的块
- **Project_Detail_Page**（项目详情页）：展示单个项目详细信息的页面
- **Image_Carousel**（图片轮播）：循环展示多张图片的组件
- **Skill_Tree**（技能树）：以树状图形式展示技能层级关系的可视化组件
- **Radar_Chart**（雷达图）：以多边形形式展示多维数据的图表
- **Leaderboard**（排行榜）：展示游戏最高分记录的列表
- **Achievement_System**（成就系统）：记录和展示用户达成的游戏成就
- **Greeting_Message**（问候语）：根据时间显示的个性化欢迎信息
- **Reading_Progress**（阅读进度）：显示页面滚动阅读进度的指示器
- **Keyboard_Navigation**（键盘导航）：使用键盘快捷键进行页面导航

## 需求

### 需求 1：主题系统增强

**用户故事：** 作为网站访客，我希望能够切换网站主题（深色/浅色/跟随系统），以便在不同环境下获得舒适的浏览体验。

#### 验收标准

1. THE Theme_System SHALL 提供三种主题模式：深色（dark）、浅色（light）、跟随系统（system）
2. WHEN 用户点击 Theme_Switcher THEN THE Theme_System SHALL 在三种模式之间循环切换
3. WHEN 主题切换发生时 THEN THE Theme_System SHALL 应用平滑的过渡动画（持续时间 300ms）
4. WHEN 用户选择主题后 THEN THE Theme_System SHALL 将用户偏好持久化存储到 localStorage
5. WHEN 页面加载时 THEN THE Theme_System SHALL 从 localStorage 读取并应用用户之前选择的主题
6. WHEN 用户选择"跟随系统"模式 THEN THE Theme_System SHALL 监听系统主题变化并自动切换
7. THE Theme_System SHALL 定义完整的 CSS 变量集，包括背景色、文字色、边框色、主题色等
8. WHEN 浅色主题激活时 THEN THE Theme_System SHALL 确保所有组件的对比度符合 WCAG AA 标准

### 需求 2：微交互动画

**用户故事：** 作为网站访客，我希望在与页面元素交互时获得视觉反馈，以便获得更流畅、更有趣的浏览体验。

#### 验收标准

1. WHEN 用户点击按钮时 THEN THE Ripple_Effect SHALL 从点击位置向外扩散涟漪动画
2. THE Ripple_Effect SHALL 在 600ms 内完成动画并自动清除
3. WHEN 用户将鼠标悬停在卡片上时 THEN THE Card_3D_Effect SHALL 应用透视变换效果
4. THE Card_3D_Effect SHALL 根据鼠标位置动态调整旋转角度（最大 ±10 度）
5. WHEN 路由切换时 THEN THE Page_Transition SHALL 应用滑动或淡入淡出动画
6. THE Page_Transition SHALL 支持前进和后退两种方向的不同动画效果
7. WHEN 元素进入视口时 THEN THE Scroll_Animation SHALL 触发入场动画
8. THE Scroll_Animation SHALL 支持配置动画类型（淡入、滑入、缩放等）和延迟时间
9. WHEN 用户启用"减少动画"系统设置时 THEN 所有动画 SHALL 被禁用或简化

### 需求 3：移动端优化

**用户故事：** 作为移动设备用户，我希望网站针对触控操作进行优化，以便获得流畅的移动端浏览体验。

#### 验收标准

1. WHEN 用户在移动端左右滑动时 THEN THE Gesture_Handler SHALL 切换到上一页或下一页
2. THE Gesture_Handler SHALL 要求滑动距离超过 50px 且速度超过阈值才触发页面切换
3. WHEN 用户触摸交互元素时 THEN THE Gesture_Handler SHALL 提供触觉反馈（如果设备支持）
4. THE Theme_System SHALL 适配 Safe_Area，确保内容不被刘海屏或底部指示条遮挡
5. THE PWA SHALL 支持添加到主屏幕功能，包含应用图标和启动画面
6. THE PWA SHALL 配置 Service Worker 实现基本的离线缓存功能
7. THE PWA SHALL 在 manifest.json 中定义应用名称、图标、主题色等元数据

### 需求 4：性能优化

**用户故事：** 作为网站访客，我希望页面加载速度快，以便快速获取所需信息。

#### 验收标准

1. THE Lazy_Loading SHALL 使用 Intersection Observer API 延迟加载视口外的图片
2. WHEN 图片进入视口前 THEN THE Lazy_Loading SHALL 显示占位符或骨架屏
3. THE Code_Splitting SHALL 将路由组件拆分为独立的代码块，实现按需加载
4. THE Code_Splitting SHALL 对大型第三方库（如 ECharts）进行单独分包
5. WHEN 用户悬停在导航链接上时 THEN THE 系统 SHALL 预加载对应路由的代码块
6. THE 系统 SHALL 对关键 CSS 和字体资源进行预加载

### 需求 5：项目展示模块

**用户故事：** 作为招聘者，我希望查看候选人的项目详情，以便评估其技术能力和项目经验。

#### 验收标准

1. WHEN 用户点击项目卡片时 THEN THE 系统 SHALL 导航到 Project_Detail_Page
2. THE Project_Detail_Page SHALL 展示项目名称、时间段、角色、描述、技术栈和亮点
3. THE Image_Carousel SHALL 支持左右滑动或点击箭头切换项目截图
4. THE Image_Carousel SHALL 支持自动播放和手动控制两种模式
5. WHEN 用户点击技术栈标签时 THEN THE 系统 SHALL 筛选显示使用该技术的所有项目
6. THE Project_Detail_Page SHALL 支持返回项目列表页的导航

### 需求 6：技能可视化增强

**用户故事：** 作为招聘者，我希望直观地了解候选人的技能分布和层级关系，以便快速评估其技术栈。

#### 验收标准

1. THE Skill_Tree SHALL 以径向树状图形式展示技能的层级关系
2. THE Skill_Tree SHALL 支持展开和折叠子节点
3. WHEN 用户悬停在技能节点上时 THEN THE Skill_Tree SHALL 显示技能详情（熟练度、使用年限等）
4. THE Skill_Tree SHALL 根据技能熟练度动态调整节点大小
5. THE Radar_Chart SHALL 在数据加载时播放绘制动画
6. THE Radar_Chart SHALL 支持悬停显示具体数值

### 需求 7：彩蛋游戏增强

**用户故事：** 作为网站访客，我希望在彩蛋游戏中获得更丰富的体验，包括查看排行榜和解锁成就。

#### 验收标准

1. THE Leaderboard SHALL 存储最多 10 条最高分记录到 localStorage
2. THE Leaderboard SHALL 按分数降序排列，显示排名、玩家名、分数和关卡
3. WHEN 玩家达成新的高分时 THEN THE Leaderboard SHALL 高亮显示新记录
4. THE Achievement_System SHALL 定义至少 5 种可解锁的成就
5. WHEN 玩家满足成就条件时 THEN THE Achievement_System SHALL 显示成就解锁通知
6. THE Achievement_System SHALL 将已解锁的成就持久化存储到 localStorage
7. THE Achievement_System SHALL 在游戏界面显示成就列表和解锁状态

### 需求 8：个性化体验

**用户故事：** 作为网站访客，我希望获得个性化的浏览体验，以便感受到网站的用心设计。

#### 验收标准

1. WHEN 页面加载时 THEN THE Greeting_Message SHALL 根据当前时间显示不同的问候语（早上好/下午好/晚上好）
2. THE Reading_Progress SHALL 在页面顶部显示一个进度条，反映当前滚动位置
3. THE Reading_Progress SHALL 使用平滑动画更新进度
4. THE Keyboard_Navigation SHALL 支持使用方向键或数字键切换页面
5. THE Keyboard_Navigation SHALL 支持使用 Escape 键关闭弹窗或返回上一页
6. WHEN 用户按下快捷键时 THEN THE 系统 SHALL 显示简短的操作提示
