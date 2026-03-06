<template>
  <span
    :class="tagClasses"
    @click="handleClick"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    data-testid="tag"
  >
    <!-- Icon slot -->
    <span v-if="$slots.icon" class="tag-icon">
      <slot name="icon"></slot>
    </span>

    <!-- Content -->
    <span class="tag-content">
      <slot></slot>
    </span>

    <!-- Close button -->
    <button
      v-if="closable"
      class="tag-close"
      @click.stop="handleClose"
      aria-label="Close"
      data-testid="tag-close"
    >
      ×
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface TagProps {
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  closable?: boolean
  clickable?: boolean
  outlined?: boolean
}

const props = withDefaults(defineProps<TagProps>(), {
  variant: 'default',
  size: 'md',
  closable: false,
  clickable: false,
  outlined: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  close: []
  hover: [isHovered: boolean]
}>()

const isHovered = ref(false)

const tagClasses = computed(() => {
  return [
    'tag',
    `tag-${props.variant}`,
    `tag-${props.size}`,
    {
      'tag-clickable': props.clickable,
      'tag-outlined': props.outlined,
      'tag-hovered': isHovered.value,
    },
  ]
})

const handleClick = (event: MouseEvent) => {
  if (props.clickable) {
    emit('click', event)
  }
}

const handleClose = () => {
  emit('close')
}

const handleMouseEnter = () => {
  isHovered.value = true
  emit('hover', true)
}

const handleMouseLeave = () => {
  isHovered.value = false
  emit('hover', false)
}
</script>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: all var(--transition-base);
  white-space: nowrap;
  border: 1px solid transparent;
}

/* Sizes */
.tag-sm {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.75rem;
}

.tag-md {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 0.875rem;
}

.tag-lg {
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: 1rem;
}

/* Variants - Filled */
.tag-default {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.tag-primary {
  background: rgba(0, 217, 255, 0.2);
  color: var(--primary);
}

.tag-secondary {
  background: rgba(123, 97, 255, 0.2);
  color: var(--secondary);
}

.tag-accent {
  background: rgba(255, 107, 157, 0.2);
  color: var(--accent);
}

.tag-success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.tag-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
}

.tag-error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Outlined variants */
.tag-outlined {
  background: transparent;
}

.tag-outlined.tag-default {
  border-color: var(--border);
  color: var(--text-secondary);
}

.tag-outlined.tag-primary {
  border-color: var(--primary);
  color: var(--primary);
}

.tag-outlined.tag-secondary {
  border-color: var(--secondary);
  color: var(--secondary);
}

.tag-outlined.tag-accent {
  border-color: var(--accent);
  color: var(--accent);
}

.tag-outlined.tag-success {
  border-color: #10b981;
  color: #10b981;
}

.tag-outlined.tag-warning {
  border-color: #f59e0b;
  color: #f59e0b;
}

.tag-outlined.tag-error {
  border-color: #ef4444;
  color: #ef4444;
}

/* Clickable state */
.tag-clickable {
  cursor: pointer;
}

.tag-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.tag-clickable:active {
  transform: translateY(0);
}

/* Hover effects for filled tags */
.tag-clickable.tag-primary:hover {
  background: rgba(0, 217, 255, 0.3);
  box-shadow: 0 0 12px rgba(0, 217, 255, 0.4);
}

.tag-clickable.tag-secondary:hover {
  background: rgba(123, 97, 255, 0.3);
  box-shadow: 0 0 12px rgba(123, 97, 255, 0.4);
}

.tag-clickable.tag-accent:hover {
  background: rgba(255, 107, 157, 0.3);
  box-shadow: 0 0 12px rgba(255, 107, 157, 0.4);
}

/* Hover effects for outlined tags */
.tag-clickable.tag-outlined:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Icon */
.tag-icon {
  display: flex;
  align-items: center;
  font-size: 1em;
}

/* Content */
.tag-content {
  line-height: 1;
}

/* Close button */
.tag-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: var(--spacing-xs);
  background: transparent;
  border: none;
  border-radius: 50%;
  color: currentColor;
  font-size: 1.25em;
  line-height: 1;
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
}

.tag-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.tag-sm .tag-close {
  width: 14px;
  height: 14px;
  font-size: 1.1em;
}

.tag-lg .tag-close {
  width: 18px;
  height: 18px;
  font-size: 1.4em;
}

/* Pulse animation on hover */
.tag-hovered {
  animation: tagPulse 0.6s ease-in-out;
}

@keyframes tagPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
</style>
