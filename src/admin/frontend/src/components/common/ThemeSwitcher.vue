<template>
  <el-tooltip :content="tooltipText" placement="bottom">
    <el-button
      class="theme-switcher"
      :icon="currentIcon"
      circle
      @click="handleClick"
    />
  </el-tooltip>
</template>

<script setup lang="ts">
/**
 * ThemeSwitcher 组件
 * 
 * 管理系统主题切换按钮组件
 */
import { computed, shallowRef, watch } from 'vue'
import { Sunny, Moon, Monitor } from '@element-plus/icons-vue'
import { useTheme } from '@/composables/useTheme'

const { mode, cycleTheme } = useTheme()

/**
 * 当前图标
 */
const currentIcon = shallowRef(Sunny)

watch(mode, (newMode) => {
  switch (newMode) {
    case 'light':
      currentIcon.value = Sunny
      break
    case 'dark':
      currentIcon.value = Moon
      break
    case 'system':
      currentIcon.value = Monitor
      break
  }
}, { immediate: true })

/**
 * 工具提示文字
 */
const tooltipText = computed(() => {
  const tips: Record<string, string> = {
    light: '当前：浅色主题 | 点击切换到深色主题',
    dark: '当前：深色主题 | 点击切换到跟随系统',
    system: '当前：跟随系统 | 点击切换到浅色主题',
  }
  return tips[mode.value] || '切换主题'
})

/**
 * 处理点击事件
 */
const handleClick = () => {
  cycleTheme()
}
</script>

<style lang="scss" scoped>
.theme-switcher {
  margin-right: 12px;
  
  // 确保暗色主题下图标清晰可见
  :deep(.el-icon) {
    color: var(--text-primary);
  }
}
</style>
