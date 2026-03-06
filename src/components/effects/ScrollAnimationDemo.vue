<template>
  <div class="scroll-animation-demo">
    <!-- 基础滚动信息 -->
    <div class="scroll-info" :class="{ scrolling: isScrolling }">
      <p>Scroll Y: {{ scrollY }}px</p>
      <p>Direction: {{ scrollDirection }}</p>
      <p>Scrolling: {{ isScrolling }}</p>
    </div>

    <!-- 淡入上移动画示例 -->
    <div ref="fadeInUpElement" class="demo-box" style="opacity: 0">
      <h3>淡入上移动画</h3>
      <p>滚动到此处触发 fadeInUp 动画</p>
    </div>

    <!-- 淡入缩放动画示例 -->
    <div ref="fadeInScaleElement" class="demo-box" style="opacity: 0">
      <h3>淡入缩放动画</h3>
      <p>滚动到此处触发 fadeInScale 动画</p>
    </div>

    <!-- 从左滑入动画示例 -->
    <div ref="slideInLeftElement" class="demo-box" style="opacity: 0">
      <h3>从左滑入动画</h3>
      <p>滚动到此处触发 slideInLeft 动画</p>
    </div>

    <!-- 视差滚动示例 -->
    <div class="parallax-container">
      <div ref="parallaxElement" class="parallax-box">
        <h3>视差滚动效果</h3>
        <p>此元素会随滚动产生视差效果</p>
      </div>
    </div>

    <!-- 交错动画示例 -->
    <div class="stagger-container">
      <h3>交错动画效果</h3>
      <div
        v-for="index in staggerItems"
        :key="index"
        :ref="(el) => setStaggerRef(el as HTMLElement, index - 1)"
        class="stagger-item"
        style="opacity: 0"
      >
        Item {{ index }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useScroll, useScrollAnimation, useParallax, useStaggeredAnimation } from '@/composables/useScroll'

// 基础滚动追踪
const { scrollY, scrollDirection, isScrolling } = useScroll()

// 淡入上移动画
const fadeInUpElement = ref<HTMLElement | null>(null)
useScrollAnimation(fadeInUpElement, {
  animationClass: 'animate-fadeInUp',
  threshold: 0.2,
})

// 淡入缩放动画
const fadeInScaleElement = ref<HTMLElement | null>(null)
useScrollAnimation(fadeInScaleElement, {
  animationClass: 'animate-fadeInScale',
  threshold: 0.2,
})

// 从左滑入动画
const slideInLeftElement = ref<HTMLElement | null>(null)
useScrollAnimation(slideInLeftElement, {
  animationClass: 'animate-slideInLeft',
  threshold: 0.2,
})

// 视差滚动
const parallaxElement = ref<HTMLElement | null>(null)
useParallax(parallaxElement, {
  speed: 0.3,
  direction: 'vertical',
})

// 交错动画
const staggerItems = ref(5) // Just the count
const staggerElements = ref<HTMLElement[]>([])

const setStaggerRef = (el: HTMLElement, index: number) => {
  if (el) {
    staggerElements.value[index] = el
  }
}

onMounted(() => {
  // 确保所有元素都已收集
  setTimeout(() => {
    useStaggeredAnimation(staggerElements, {
      threshold: 0.1,
      staggerDelay: 100,
    })
  }, 100)
})
</script>

<style scoped>
.scroll-animation-demo {
  padding: 2rem;
  min-height: 300vh;
}

.scroll-info {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  z-index: 1000;
  transition: all 0.3s ease;
}

.scroll-info.scrolling {
  background: rgba(0, 217, 255, 0.2);
  border: 1px solid var(--primary, #00d9ff);
}

.demo-box {
  margin: 4rem auto;
  padding: 2rem;
  max-width: 600px;
  background: var(--bg-card, rgba(21, 25, 50, 0.8));
  border-radius: 12px;
  text-align: center;
}

.demo-box h3 {
  color: var(--primary, #00d9ff);
  margin-bottom: 1rem;
}

.parallax-container {
  margin: 8rem auto;
  height: 400px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
}

.parallax-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  text-align: center;
  color: white;
}

.stagger-container {
  margin: 4rem auto;
  max-width: 600px;
  text-align: center;
}

.stagger-container h3 {
  color: var(--primary, #00d9ff);
  margin-bottom: 2rem;
}

.stagger-item {
  padding: 1.5rem;
  margin: 1rem 0;
  background: var(--bg-card, rgba(21, 25, 50, 0.8));
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
