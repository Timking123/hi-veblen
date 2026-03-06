<!--
  RippleButton 组件
  
  带涟漪效果的按钮组件，点击时从点击位置向外扩散涟漪动画。
  
  功能：
  - 集成 useRipple Composable 管理涟漪效果
  - 支持 slot 插槽用于自定义按钮内容
  - 支持 disabled 属性禁用按钮
  - 支持自定义样式类
  - 涟漪动画在 600ms 内完成并自动清除
  
  验证需求：
  - 需求 2.1: 用户点击按钮时从点击位置向外扩散涟漪动画
  - 需求 2.2: 涟漪效果在 600ms 内完成动画并自动清除
-->
<template>
  <button
    class="ripple-button"
    :class="[buttonClass, { 'ripple-button--disabled': disabled }]"
    :disabled="disabled"
    @click="handleClick"
  >
    <!-- 按钮内容插槽 -->
    <span class="ripple-button__content">
      <slot />
    </span>
    
    <!-- 涟漪效果容器 -->
    <span class="ripple-button__ripple-container">
      <span
        v-for="ripple in ripples"
        :key="ripple.id"
        class="ripple-button__ripple"
        :style="{
          left: `${ripple.x}px`,
          top: `${ripple.y}px`,
          width: `${ripple.size}px`,
          height: `${ripple.size}px`,
        }"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
/**
 * RippleButton 组件
 * 
 * 带涟漪效果的按钮组件，使用 useRipple composable 管理涟漪动画。
 * 
 * @example
 * ```vue
 * <RippleButton @click="handleSubmit">
 *   提交
 * </RippleButton>
 * 
 * <RippleButton disabled>
 *   禁用按钮
 * </RippleButton>
 * 
 * <RippleButton button-class="custom-class">
 *   自定义样式
 * </RippleButton>
 * ```
 */
import { useRipple } from '@/composables/useRipple'

// 定义组件属性
interface Props {
  /** 是否禁用按钮 */
  disabled?: boolean
  /** 自定义按钮样式类 */
  buttonClass?: string | string[] | Record<string, boolean>
}

// 定义组件事件
interface Emits {
  /** 按钮点击事件 */
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  buttonClass: '',
})

const emit = defineEmits<Emits>()

// 使用涟漪效果 composable
const { ripples, createRipple } = useRipple()

/**
 * 处理按钮点击事件
 * 
 * @param event - 鼠标点击事件
 * 
 * 功能：
 * 1. 如果按钮未禁用，创建涟漪效果
 * 2. 触发 click 事件
 */
const handleClick = (event: MouseEvent): void => {
  if (!props.disabled) {
    // 创建涟漪效果
    // 验证: 需求 2.1 - 从点击位置向外扩散涟漪动画
    createRipple(event)
    
    // 触发点击事件
    emit('click', event)
  }
}
</script>

<style scoped>
/**
 * RippleButton 样式
 * 
 * 涟漪动画说明：
 * - 使用 CSS transform: scale() 实现从 0 扩展到 100%
 * - 使用 CSS opacity 实现从 0.5 到 0 的透明度变化
 * - 动画持续时间 600ms，与 useRipple 中的 RIPPLE_DURATION 保持一致
 * 
 * 验证: 需求 2.2 - 涟漪效果在 600ms 内完成动画
 */

.ripple-button {
  /* 基础样式 */
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--color-primary, #3b82f6);
  color: var(--color-text-on-primary, #ffffff);
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  overflow: hidden;
  transition: background-color 0.2s ease, transform 0.1s ease;
  
  /* 确保涟漪效果不会溢出 */
  isolation: isolate;
}

.ripple-button:hover:not(.ripple-button--disabled) {
  background-color: var(--color-primary-dark, #2563eb);
}

.ripple-button:active:not(.ripple-button--disabled) {
  transform: scale(0.98);
}

.ripple-button:focus-visible {
  outline: 2px solid var(--color-primary, #3b82f6);
  outline-offset: 2px;
}

/* 禁用状态 */
.ripple-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 按钮内容 */
.ripple-button__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

/* 涟漪容器 */
.ripple-button__ripple-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* 涟漪效果 */
.ripple-button__ripple {
  position: absolute;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  
  /* 涟漪扩散动画 */
  /* 验证: 需求 2.1 - 从点击位置向外扩散 */
  /* 验证: 需求 2.2 - 600ms 内完成动画 */
  animation: ripple-expand 600ms ease-out forwards;
}

/**
 * 涟漪扩散动画关键帧
 * 
 * 动画效果：
 * - 从 scale(0) 扩展到 scale(1)
 * - 透明度从 0.5 变化到 0
 * - 持续时间 600ms
 * 
 * 验证: 需求 2.1 - 向外扩散涟漪动画
 * 验证: 需求 2.2 - 600ms 内完成动画
 */
@keyframes ripple-expand {
  0% {
    transform: scale(0);
    opacity: 0.5;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

/* 支持减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .ripple-button__ripple {
    animation: none;
    opacity: 0;
  }
}
</style>
