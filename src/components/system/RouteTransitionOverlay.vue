<template>
  <Transition name="route-warp">
    <div v-if="active" class="route-transition-overlay" aria-hidden="true">
      <div class="route-transition-overlay__beam"></div>
      <div class="route-transition-overlay__label">{{ label }}</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = ref(false)
let timer = 0

const label = computed(() => {
  const transition = route.meta.transition
  return typeof transition === 'string' ? transition.toUpperCase() : 'WARP'
})

watch(
  () => route.fullPath,
  () => {
    window.clearTimeout(timer)
    active.value = true
    timer = window.setTimeout(() => {
      active.value = false
    }, 520)
  },
)
</script>
