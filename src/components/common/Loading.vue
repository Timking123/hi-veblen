<template>
  <div :class="loadingClasses" data-testid="loading">
    <!-- Spinner type -->
    <div v-if="type === 'spinner'" class="spinner" :style="spinnerStyle"></div>

    <!-- Dots type -->
    <div v-else-if="type === 'dots'" class="dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>

    <!-- Pulse type -->
    <div v-else-if="type === 'pulse'" class="pulse" :style="pulseStyle"></div>

    <!-- Bars type -->
    <div v-else-if="type === 'bars'" class="bars">
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </div>

    <!-- Text -->
    <p v-if="text" class="loading-text">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface LoadingProps {
  type?: 'spinner' | 'dots' | 'pulse' | 'bars'
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
  fullscreen?: boolean
}

const props = withDefaults(defineProps<LoadingProps>(), {
  type: 'spinner',
  size: 'md',
  color: '',
  text: '',
  fullscreen: false,
})

const loadingClasses = computed(() => {
  return [
    'loading',
    `loading-${props.size}`,
    {
      'loading-fullscreen': props.fullscreen,
    },
  ]
})

const spinnerStyle = computed(() => {
  if (props.color) {
    return {
      borderTopColor: props.color,
      borderRightColor: props.color,
    }
  }
  return {}
})

const pulseStyle = computed(() => {
  if (props.color) {
    return {
      backgroundColor: props.color,
    }
  }
  return {}
})
</script>

<style scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
}

.loading-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 14, 39, 0.9);
  backdrop-filter: blur(4px);
  z-index: 9999;
}

/* Spinner */
.spinner {
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary);
  border-right-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-sm .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.loading-md .spinner {
  width: 40px;
  height: 40px;
  border-width: 3px;
}

.loading-lg .spinner {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dots */
.dots {
  display: flex;
  gap: var(--spacing-sm);
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-sm .dot {
  width: 6px;
  height: 6px;
}

.loading-lg .dot {
  width: 12px;
  height: 12px;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Pulse */
.pulse {
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-sm .pulse {
  width: 20px;
  height: 20px;
}

.loading-md .pulse {
  width: 40px;
  height: 40px;
}

.loading-lg .pulse {
  width: 60px;
  height: 60px;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

/* Bars */
.bars {
  display: flex;
  gap: var(--spacing-xs);
  align-items: flex-end;
  height: 40px;
}

.loading-sm .bars {
  height: 24px;
}

.loading-lg .bars {
  height: 60px;
}

.bar {
  width: 4px;
  background: var(--primary);
  border-radius: 2px;
  animation: bars 1.2s ease-in-out infinite;
}

.loading-sm .bar {
  width: 3px;
}

.loading-lg .bar {
  width: 6px;
}

.bar:nth-child(1) {
  animation-delay: -0.9s;
}

.bar:nth-child(2) {
  animation-delay: -0.6s;
}

.bar:nth-child(3) {
  animation-delay: -0.3s;
}

@keyframes bars {
  0%,
  100% {
    height: 20%;
  }
  50% {
    height: 100%;
  }
}

/* Loading text */
.loading-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.loading-lg .loading-text {
  font-size: 1rem;
}
</style>
