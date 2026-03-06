<template>
  <div class="skeleton" :class="[variant, { animated }]" :style="skeletonStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular'
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '20px',
  variant: 'rectangular',
  animated: true,
})

const skeletonStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
}))
</script>

<style scoped>
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-secondary, #151932) 25%,
    var(--bg-card, rgba(21, 25, 50, 0.8)) 50%,
    var(--bg-secondary, #151932) 75%
  );
  background-size: 200% 100%;
  display: inline-block;
}

.skeleton.animated {
  animation: shimmer 1.5s infinite;
}

.skeleton.text {
  border-radius: 4px;
  transform: scale(1, 0.6);
}

.skeleton.circular {
  border-radius: 50%;
}

.skeleton.rectangular {
  border-radius: 8px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
