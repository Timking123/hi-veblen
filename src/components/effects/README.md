# 背景特效组件

## ParticleBackground（粒子背景）

高性能粒子背景组件，支持渐变动画和视差滚动效果。

### 功能特性

1. **动态粒子系统**
   - 基于 Canvas 的粒子渲染
   - 可配置粒子数量、大小、速度和颜色
   - 基于距离的粒子连线效果
   - 平滑的粒子运动和边界反弹

2. **渐变流动动画**
   - 动态渐变背景
   - 15 秒动画周期
   - 平滑的颜色过渡

3. **视差滚动**
   - Canvas 以 0.3 倍滚动速度移动
   - 创造深度感知效果
   - 增强视觉吸引力

4. **性能优化**
   - 使用 `requestAnimationFrame` 实现流畅的 60 FPS 动画
   - `will-change` CSS 属性启用 GPU 加速
   - 遵循 `prefers-reduced-motion` 无障碍设置
   - 高效的粒子更新和渲染算法

### 使用方法

```vue
<template>
  <ParticleBackground
    :count="80"
    color="#00D9FF"
    :speed="0.5"
    :size="2"
    :connectionDistance="150"
  />
</template>

<script setup>
import { ParticleBackground } from '@/components/effects'
</script>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `count` | `number` | `80` | 渲染的粒子数量 |
| `color` | `string` | `#00D9FF` | 粒子和连线颜色（十六进制） |
| `speed` | `number` | `0.5` | 粒子移动速度倍数 |
| `size` | `number` | `2` | 最大粒子尺寸（像素） |
| `connectionDistance` | `number` | `150` | 粒子连线的距离阈值 |

### 需求验证

本组件满足以下需求：

- **需求 7.4**: 当背景渲染时，系统应当展示动态粒子效果或几何图形动画
  - ✅ 使用 Canvas 实现动态粒子效果
  - ✅ 粒子平滑移动并在接近时连线
  
- **需求 7.5**: 当用户滚动页面时，系统应当触发视差滚动效果以增强空间层次感
  - ✅ 在 Canvas 元素上实现视差滚动
  - ✅ 根据滚动位置计算视差偏移

### 性能注意事项

- 固定定位配合 `z-index: -1` 确保不干扰内容
- `pointer-events: none` 防止交互开销
- 可根据设备性能调整粒子数量
- 组件卸载时自动停止动画
- 遵循用户的动画偏好设置以确保无障碍访问
