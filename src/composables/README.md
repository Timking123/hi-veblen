# Composables

Vue 3 组合式函数集合，提供可复用的响应式逻辑。

## useScroll

滚动动画系统，提供元素进入视口检测、滚动触发动画和视差滚动效果。

### 功能

1. **基础滚动追踪** - 追踪滚动位置、方向和状态
2. **元素进入视口检测** - 使用 IntersectionObserver 检测元素可见性
3. **滚动触发动画** - 元素进入视口时自动添加动画类
4. **视差滚动效果** - 创建深度感和动态效果
5. **交错动画** - 为多个元素添加延迟动画效果

### 使用示例

#### 1. 基础滚动追踪

```vue
<script setup lang="ts">
import { useScroll } from '@/composables/useScroll'

const { scrollY, scrollDirection, isScrolling } = useScroll()
</script>

<template>
  <div>
    <p>当前滚动位置: {{ scrollY }}px</p>
    <p>滚动方向: {{ scrollDirection }}</p>
    <p>是否正在滚动: {{ isScrolling }}</p>
  </div>
</template>
```

#### 2. 元素进入视口动画

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useScrollAnimation } from '@/composables/useScroll'

const element = ref<HTMLElement | null>(null)

// 使用默认的 fadeInUp 动画
useScrollAnimation(element)

// 或自定义选项
useScrollAnimation(element, {
  animationClass: 'animate-fadeInScale',
  threshold: 0.2,
  once: true,
  rootMargin: '0px'
})
</script>

<template>
  <div ref="element" style="opacity: 0">
    滚动到此处触发动画
  </div>
</template>
```

#### 3. 视差滚动效果

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useParallax } from '@/composables/useScroll'

const parallaxElement = ref<HTMLElement | null>(null)

useParallax(parallaxElement, {
  speed: 0.5,        // 视差速度 (0-1)
  direction: 'vertical'  // 或 'horizontal'
})
</script>

<template>
  <div ref="parallaxElement">
    此元素会产生视差效果
  </div>
</template>
```

#### 4. 交错动画

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStaggeredAnimation } from '@/composables/useScroll'

const items = ref([1, 2, 3, 4, 5])
const elements = ref<HTMLElement[]>([])

const setRef = (el: HTMLElement, index: number) => {
  if (el) elements.value[index] = el
}

onMounted(() => {
  useStaggeredAnimation(elements, {
    threshold: 0.1,
    staggerDelay: 100  // 每个元素延迟 100ms
  })
})
</script>

<template>
  <div
    v-for="(item, index) in items"
    :key="index"
    :ref="(el) => setRef(el as HTMLElement, index)"
    style="opacity: 0"
  >
    Item {{ item }}
  </div>
</template>
```

### API 参考

#### useScroll()

返回值:
- `scrollY`: 当前滚动位置 (number)
- `scrollDirection`: 滚动方向 ('up' | 'down')
- `isScrolling`: 是否正在滚动 (boolean)

#### useScrollAnimation(elementRef, options)

参数:
- `elementRef`: 要观察的元素引用
- `options`: 配置选项
  - `threshold`: 触发阈值 (0-1, 默认 0.1)
  - `rootMargin`: 视口边距 (默认 '0px')
  - `once`: 是否只触发一次 (默认 true)
  - `animationClass`: 动画类名 (默认 'animate-fadeInUp')

返回值:
- `isVisible`: 元素是否可见 (boolean)
- `hasAnimated`: 是否已触发动画 (boolean)

#### useParallax(elementRef, options)

参数:
- `elementRef`: 要应用视差效果的元素引用
- `options`: 配置选项
  - `speed`: 视差速度 (0-1, 默认 0.5)
  - `direction`: 视差方向 ('vertical' | 'horizontal', 默认 'vertical')

返回值:
- `parallaxOffset`: 当前视差偏移量 (number)

#### useStaggeredAnimation(elementsRef, options)

参数:
- `elementsRef`: 元素数组引用
- `options`: 配置选项
  - `threshold`: 触发阈值 (默认 0.1)
  - `rootMargin`: 视口边距 (默认 '0px')
  - `staggerDelay`: 交错延迟时间 (ms, 默认 100)

返回值:
- `visibleElements`: 可见元素索引集合 (Set<number>)

### 可用动画类

在 `src/styles/animations.css` 中定义:

- `animate-fadeIn` - 淡入
- `animate-fadeInUp` - 淡入上移
- `animate-fadeInScale` - 淡入缩放
- `animate-slideInLeft` - 从左滑入
- `animate-slideInRight` - 从右滑入

### 性能优化

1. 使用 `passive: true` 监听滚动事件
2. IntersectionObserver 自动处理性能优化
3. 使用 `transform` 和 `opacity` 实现动画（GPU 加速）
4. 支持 `once` 选项减少不必要的观察

### 浏览器兼容性

- IntersectionObserver: 现代浏览器支持
- 对于旧浏览器，可以使用 polyfill

## useResponsive

响应式断点检测，根据屏幕尺寸判断设备类型。

### 使用示例

```vue
<script setup lang="ts">
import { useResponsive } from '@/composables/useResponsive'

const { isMobile, isTablet, isDesktop, windowWidth } = useResponsive()
</script>

<template>
  <div>
    <p v-if="isMobile">移动端视图</p>
    <p v-else-if="isTablet">平板视图</p>
    <p v-else>桌面端视图</p>
  </div>
</template>
```
