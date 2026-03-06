<script setup lang="ts">
/**
 * 整体布局容器
 * 包含侧边栏、顶部栏和主内容区
 * 支持响应式布局（桌面端和平板端）
 */
import { ref, computed } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

// 侧边栏折叠状态
const isCollapsed = ref(false)

// 切换侧边栏折叠状态
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

// 计算侧边栏宽度
const sidebarWidth = computed(() => {
  return isCollapsed.value ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)'
})
</script>

<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <aside 
      class="layout-sidebar"
      :style="{ width: sidebarWidth }"
    >
      <Sidebar :collapsed="isCollapsed" />
    </aside>
    
    <!-- 主区域 -->
    <div 
      class="layout-main"
      :style="{ marginLeft: sidebarWidth }"
    >
      <!-- 顶部栏 -->
      <header class="layout-header">
        <Header 
          :collapsed="isCollapsed" 
          @toggle-sidebar="toggleSidebar" 
        />
      </header>
      
      <!-- 内容区 -->
      <main class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.layout-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
}

.layout-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  background: var(--sidebar-bg);
  transition: width 0.3s ease;
  z-index: 1001;
  overflow: hidden;
}

.layout-main {
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

.layout-header {
  position: sticky;
  top: 0;
  height: var(--header-height);
  background: var(--header-bg);
  box-shadow: var(--shadow-sm);
  z-index: 1000;
}

.layout-content {
  flex: 1;
  padding: 20px;
  background: var(--bg-color-page);
  overflow-y: auto;
}

/* 响应式适配 - 平板端 */
@media screen and (max-width: 1199px) {
  .layout-content {
    padding: 16px;
  }
}

/* 响应式适配 - 移动端（基础支持） */
@media screen and (max-width: 767px) {
  .layout-sidebar {
    transform: translateX(-100%);
    
    &.is-visible {
      transform: translateX(0);
    }
  }
  
  .layout-main {
    margin-left: 0 !important;
  }
  
  .layout-content {
    padding: 12px;
  }
}

/* 页面切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
