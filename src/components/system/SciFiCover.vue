<template>
  <div class="sci-fi-cover" :class="`sci-fi-cover--${variant}`">
    <div class="sci-fi-cover__orb"></div>
    <div class="sci-fi-cover__grid"></div>
    <span>{{ code }}</span>
    <strong>{{ label }}</strong>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  code: string
  label?: string
  variant?: 'ai' | 'web' | 'data' | 'visual' | 'default'
}>(), {
  label: 'GENERATIVE COVER',
  variant: 'default',
})
</script>
