<template>
  <div
    :class="cardClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    data-testid="card"
  >
    <!-- Header slot -->
    <div v-if="$slots.header" class="card-header">
      <slot name="header"></slot>
    </div>

    <!-- Main content -->
    <div class="card-body">
      <slot></slot>
    </div>

    <!-- Footer slot -->
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface CardProps {
  variant?: 'default' | 'glass' | 'bordered' | 'elevated'
  hoverable?: boolean
  clickable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'default',
  hoverable: false,
  clickable: false,
  padding: 'md',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  hover: [isHovered: boolean]
}>()

const isHovered = ref(false)

const cardClasses = computed(() => {
  return [
    'card',
    `card-${props.variant}`,
    `card-padding-${props.padding}`,
    {
      'card-hoverable': props.hoverable,
      'card-clickable': props.clickable,
      'card-hovered': isHovered.value,
    },
  ]
})

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}

const handleMouseEnter = () => {
  isHovered.value = true
  if (props.hoverable) {
    emit('hover', true)
  }
}

const handleMouseLeave = () => {
  isHovered.value = false
  if (props.hoverable) {
    emit('hover', false)
  }
}
</script>

<style scoped>
.card {
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}

/* Variants */
.card-default {
  background: var(--bg-card);
  border: 1px solid var(--border);
}

.card-glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-bordered {
  background: transparent;
  border: 2px solid var(--border);
}

.card-elevated {
  background: var(--bg-card);
  box-shadow: var(--shadow-lg);
  border: none;
}

/* Padding */
.card-padding-none {
  padding: 0;
}

.card-padding-sm .card-body {
  padding: var(--spacing-md);
}

.card-padding-md .card-body {
  padding: var(--spacing-lg);
}

.card-padding-lg .card-body {
  padding: var(--spacing-xl);
}

/* Header and Footer */
.card-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.card-footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border);
}

.card-padding-sm .card-header,
.card-padding-sm .card-footer {
  padding: var(--spacing-md);
}

.card-padding-lg .card-header,
.card-padding-lg .card-footer {
  padding: var(--spacing-xl);
}

/* Hoverable state */
.card-hoverable {
  cursor: default;
}

.card-hoverable:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.card-hoverable.card-glass:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.card-hoverable.card-bordered:hover {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.2);
}

/* Clickable state */
.card-clickable {
  cursor: pointer;
}

.card-clickable:active {
  transform: scale(0.98);
}

/* Glow effect on hover for elevated cards */
.card-elevated.card-hoverable:hover {
  box-shadow: 0 12px 40px rgba(0, 217, 255, 0.3);
}

/* Animation for hover state */
.card-hovered::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  transition: left 0.5s;
}

.card-hoverable.card-hovered::before {
  left: 100%;
}
</style>
