# 需求文档 - Website V3 大版本更新

## 项目信息

| 属性 | 值 |
|-----|-----|
| 功能名称 | website-v3-major-update |
| 优先级 | P0（最高优先级） |
| 项目类型 | 重大版本更新 |
| 影响范围 | 前端展示网站 + 彩蛋游戏 |

## 简介

这是一个 P0 级别的重要更新项目，针对基于 Vue 3 的个人作品集网站进行全面优化和功能增强。本次更新包含四个主要功能模块：背景显示修复、亮色主题适配、彩蛋游戏优化、移动端和平板端适配。

项目背景：
- 技术栈：Vue 3 + TypeScript + Vite + TailwindCSS + Express.js
- 包含前端展示网站（首页、关于我、技能展示、项目展示、联系方式）
- 包含隐藏的像素艺术风格飞行射击游戏（彩蛋）
- 包含后台管理系统

## 术语表

- **System**: 整个 Vue 3 个人作品集网站系统
- **Background_Renderer**: 背景渲染组件，负责显示动态粒子特效背景
- **Theme_Manager**: 主题管理器，负责管理深色和亮色主题切换
- **Game_Engine**: 游戏引擎，负责管理彩蛋游戏的核心逻辑
- **Player_Aircraft**: 玩家飞机实体
- **Missile_System**: 导弹系统，包括发射、爆炸和伤害计算
- **Mobile_Controller**: 移动端控制器，提供触摸操作界面
- **Virtual_Joystick**: 虚拟摇杆组件，用于移动端飞机移动控制
- **Touch_Button**: 触摸按钮组件，用于移动端游戏操作
- **Game_Intro_Page**: 游戏介绍页面
- **Drop_Item**: 敌人掉落物品
- **Explosion_Effect**: 爆炸特效系统
- **Responsive_Layout**: 响应式布局系统

---

## 需求

### 需求 1: 背景显示修复

**用户故事**: 作为网站访问者，我希望在教育经历、工作经历、技能展示板块看到动态背景，以便获得与首页一致的视觉体验。

#### 验收标准

1. WHEN 用户访问教育经历板块时，THE Background_Renderer SHALL 显示与首页相同的动态粒子特效背景
2. WHEN 用户访问工作经历板块时，THE Background_Renderer SHALL 显示与首页相同的动态粒子特效背景
3. WHEN 用户访问技能展示板块时，THE Background_Renderer SHALL 显示与首页相同的动态粒子特效背景
4. THE Background_Renderer SHALL 移除覆盖在背景上的纯色遮罩层
5. THE Background_Renderer SHALL 保持背景动画的流畅性，帧率不低于 30 FPS

---

### 需求 2: 亮色主题适配

**用户故事**: 作为网站访问者，我希望切换到亮色主题时所有元素都能正确显示，以便在不同光线环境下获得最佳阅读体验。

#### 验收标准

1. WHEN 用户切换到亮色主题时，THE Background_Renderer SHALL 将动态背景调整为适合亮色主题的配色方案
2. WHEN 用户切换到亮色主题时，THE Theme_Manager SHALL 将所有文字颜色调整为深色以确保可读性
3. WHEN 用户切换到亮色主题时，THE Theme_Manager SHALL 将所有 UI 元素的颜色调整为适配亮色背景的配色
4. THE Theme_Manager SHALL 确保亮色主题下文字与背景的对比度符合 WCAG AA 标准（对比度至少为 4.5:1）
5. WHEN 用户在亮色主题下浏览任意页面时，THE System SHALL 保持视觉一致性和良好的可读性
6. THE Theme_Manager SHALL 保存用户的主题选择偏好到本地存储

---

### 需求 3: 彩蛋游戏性能优化

**用户故事**: 作为游戏玩家，我希望游戏操作更流畅、武器更强大，以便获得更好的游戏体验。

#### 验收标准

1. THE Player_Aircraft SHALL 将移动速度增加到原速度的 2 倍
2. WHEN 导弹爆炸时，THE Missile_System SHALL 将攻击范围增加到原范围的 1.5 倍
3. WHEN 导弹爆炸时，THE Missile_System SHALL 将攻击伤害增加到原伤害的 1.5 倍
4. WHEN 导弹爆炸时，THE Explosion_Effect SHALL 将爆炸特效的显示大小增加到原大小的 1.5 倍
5. THE Missile_System SHALL 确保爆炸范围内的所有敌人都能正确受到伤害
6. THE Game_Engine SHALL 保持游戏帧率稳定在 60 FPS

---

### 需求 4: 彩蛋游戏 Bug 修复

**用户故事**: 作为游戏玩家，我希望游戏界面干净整洁且掉落物正常工作，以便获得完整的游戏体验。

#### 验收标准

1. THE Game_Intro_Page SHALL 隐藏页面右侧的滚动条
2. WHEN 敌人被摧毁时，THE Game_Engine SHALL 正确生成掉落物
3. WHEN 玩家飞机接触掉落物时，THE Drop_Item SHALL 正确触发拾取效果
4. WHEN 玩家拾取生命值掉落物时，THE Player_Aircraft SHALL 增加生命值
5. WHEN 玩家拾取武器掉落物时，THE Player_Aircraft SHALL 获得对应的武器强化效果
6. THE Drop_Item SHALL 在屏幕范围内正确显示和移动

---

### 需求 5: 移动端开局选择界面

**用户故事**: 作为移动设备用户，我希望在游戏开局时能通过触摸按钮进行选择，以便在移动设备上正常游玩。

#### 验收标准

1. WHEN 用户在移动设备或平板设备上触发游戏开局选择时，THE Mobile_Controller SHALL 显示按钮式选择界面
2. THE Mobile_Controller SHALL 显示一个红色按钮，按钮上显示文字 "Y"
3. THE Mobile_Controller SHALL 显示一个蓝色按钮，按钮上显示文字 "N"
4. THE Touch_Button SHALL 使用复古方形条纹样式设计
5. WHEN 用户按下按钮时，THE Touch_Button SHALL 显示视觉反馈效果（如按下动画或颜色变化）
6. WHEN 用户点击 Y 按钮时，THE Game_Engine SHALL 开始游戏
7. WHEN 用户点击 N 按钮时，THE Game_Engine SHALL 取消游戏并返回网站
8. WHEN 用户在桌面设备上触发游戏时，THE System SHALL 保持原有的键盘输入方式

---

### 需求 6: 移动端游戏操作界面

**用户故事**: 作为移动设备用户，我希望通过虚拟摇杆和按钮控制游戏，以便在触摸屏设备上流畅操作。

#### 验收标准

1. WHEN 用户在移动设备或平板设备上进入游戏时，THE Mobile_Controller SHALL 在屏幕左侧显示半透明虚拟摇杆
2. WHEN 用户触摸并拖动虚拟摇杆时，THE Virtual_Joystick SHALL 控制玩家飞机向对应方向移动
3. THE Mobile_Controller SHALL 在屏幕右侧显示三个半透明触摸按钮
4. THE Mobile_Controller SHALL 显示开火键按钮，用于控制机炮射击
5. THE Mobile_Controller SHALL 显示导弹键按钮，用于发射导弹
6. THE Mobile_Controller SHALL 显示核弹键按钮，用于释放核弹
7. WHEN 用户按下任意触摸按钮时，THE Touch_Button SHALL 显示视觉反馈效果
8. WHEN 用户按住开火键时，THE Player_Aircraft SHALL 持续发射机炮子弹
9. WHEN 用户点击导弹键时，THE Player_Aircraft SHALL 发射一枚导弹
10. WHEN 用户点击核弹键时，THE Player_Aircraft SHALL 释放核弹攻击
11. THE Virtual_Joystick SHALL 在用户松开触摸时返回中心位置
12. THE Mobile_Controller SHALL 确保所有触摸控制的响应延迟不超过 50 毫秒

---

### 需求 7: 移动端游戏界面优化

**用户故事**: 作为移动设备用户，我希望游戏界面能适配我的设备屏幕，以便获得最佳的游戏体验。

#### 验收标准

1. WHEN 用户在不同尺寸的移动设备上打开游戏时，THE Responsive_Layout SHALL 自动调整游戏画布大小以适配屏幕
2. WHEN 用户在竖屏模式下打开游戏时，THE Responsive_Layout SHALL 优化游戏界面布局以适应竖屏显示
3. WHEN 用户在横屏模式下打开游戏时，THE Responsive_Layout SHALL 优化游戏界面布局以适应横屏显示
4. THE Mobile_Controller SHALL 根据屏幕尺寸自动调整虚拟摇杆和按钮的大小
5. THE Mobile_Controller SHALL 确保虚拟摇杆和按钮不会遮挡重要的游戏画面
6. THE Responsive_Layout SHALL 调整游戏 UI 元素（生命值、分数、武器状态）的位置和大小以适配移动设备
7. WHEN 用户在小屏幕设备（屏幕宽度小于 375px）上游玩时，THE System SHALL 保持所有 UI 元素可见且可操作
8. THE Responsive_Layout SHALL 确保触摸目标的最小尺寸为 44x44 像素以符合可访问性标准

---

### 需求 8: 移动端触摸体验优化

**用户故事**: 作为移动设备用户，我希望触摸操作流畅自然，以便获得接近原生应用的体验。

#### 验收标准

1. THE Mobile_Controller SHALL 支持多点触控，允许用户同时操作虚拟摇杆和按钮
2. THE Virtual_Joystick SHALL 在用户触摸时立即响应，无明显延迟
3. THE Touch_Button SHALL 提供触觉反馈（如果设备支持振动 API）
4. WHEN 用户快速连续点击按钮时，THE Mobile_Controller SHALL 正确处理所有输入事件
5. THE Mobile_Controller SHALL 防止触摸操作触发浏览器的默认行为（如页面滚动、缩放）
6. THE Virtual_Joystick SHALL 在用户手指移出摇杆区域时继续保持最后的方向输入
7. THE Mobile_Controller SHALL 在游戏暂停时禁用所有触摸控制
8. THE System SHALL 在移动设备上禁用文本选择和长按菜单以避免干扰游戏操作

---

### 需求 9: 跨平台兼容性测试

**用户故事**: 作为项目负责人，我希望所有功能在不同设备和浏览器上都能正常工作，以便确保用户获得一致的体验。

#### 验收标准

1. THE System SHALL 在桌面端（Chrome、Firefox、Safari、Edge）上正确显示所有功能
2. THE System SHALL 在移动端（iOS Safari、Android Chrome）上正确显示所有功能
3. THE System SHALL 在平板设备（iPad、Android 平板）上正确显示所有功能
4. WHEN 完成所有功能开发后，THE System SHALL 通过完整的回归测试，确保没有引入新的 Bug
5. THE System SHALL 在所有支持的平台上保持一致的视觉效果和交互体验
6. WHEN 测试完成且所有问题修复后，THE System SHALL 准备好上传到 GitHub 仓库

---

### 需求 10: 性能和质量保证

**用户故事**: 作为项目负责人，我希望更新后的系统性能稳定且质量可靠，以便为用户提供优质的体验。

#### 验收标准

1. THE System SHALL 在桌面端保持首屏加载时间不超过 3 秒
2. THE System SHALL 在移动端保持首屏加载时间不超过 5 秒
3. THE Game_Engine SHALL 在桌面端保持游戏帧率稳定在 60 FPS
4. THE Game_Engine SHALL 在移动端保持游戏帧率稳定在 30 FPS 以上
5. THE System SHALL 确保所有新增代码通过 ESLint 和 TypeScript 类型检查
6. THE System SHALL 确保所有关键功能都有对应的单元测试或 E2E 测试
7. THE System SHALL 在生产构建后的总体积不超过原体积的 120%
8. WHEN 用户在低端移动设备上使用时，THE System SHALL 保持基本功能可用且无崩溃

---

## 非功能性需求

### 性能要求

- 背景动画帧率：≥ 30 FPS（桌面端）、≥ 24 FPS（移动端）
- 游戏帧率：60 FPS（桌面端）、≥ 30 FPS（移动端）
- 触摸响应延迟：≤ 50ms
- 首屏加载时间：≤ 3s（桌面端）、≤ 5s（移动端）

### 兼容性要求

- 桌面浏览器：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+
- 移动浏览器：iOS Safari 14+、Android Chrome 90+
- 屏幕尺寸：320px - 3840px 宽度
- 触摸设备：支持单点和多点触控

### 可访问性要求

- 触摸目标最小尺寸：44x44 像素
- 颜色对比度：符合 WCAG AA 标准（4.5:1）
- 键盘导航：桌面端保持完整的键盘操作支持

### 质量要求

- 代码质量：通过 ESLint 检查，无 TypeScript 类型错误
- 测试覆盖：关键功能有对应的测试用例
- 无回归：不引入新的 Bug，不破坏现有功能
- 文档完整：更新相关的技术文档和用户文档

---

## 验收条件

本项目的验收必须满足以下所有条件：

1. ✅ 所有 10 个需求的验收标准全部通过
2. ✅ 在至少 3 种桌面浏览器上测试通过
3. ✅ 在至少 2 种移动设备（iOS 和 Android）上测试通过
4. ✅ 在至少 1 种平板设备上测试通过
5. ✅ 完整的回归测试，确认无新增 Bug
6. ✅ 代码通过 ESLint 和 TypeScript 检查
7. ✅ 性能指标达到要求
8. ✅ 更新相关文档
9. ✅ 代码审查通过
10. ✅ 准备好部署到生产环境

---

## 项目优先级说明

本项目为 P0 级别（最高优先级），原因如下：

1. **用户体验关键问题**：背景显示问题和主题适配问题直接影响网站的视觉体验
2. **功能完整性**：游戏掉落物 Bug 影响核心游戏玩法
3. **市场覆盖**：移动端适配是扩大用户覆盖面的关键
4. **品牌形象**：作为个人作品集网站，需要展示高质量的技术实现

因此，本项目需要：
- 优先分配开发资源
- 严格的质量控制
- 完整的测试覆盖
- 及时的问题修复

---

**文档版本**: 1.0.0  
**创建日期**: 2026-03-05  
**最后更新**: 2026-03-05  
**状态**: 待审核
