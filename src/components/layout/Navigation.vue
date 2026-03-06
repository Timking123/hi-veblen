<template>
  <nav
    :class="[
      'navigation',
      { 'navigation--fixed': fixed, 'navigation--transparent': transparent },
    ]"
    role="navigation"
    aria-label="主导航"
  >
    <div class="navigation__container">
      <!-- Logo/Name -->
      <div class="navigation__brand">
        <router-link to="/" class="navigation__logo" aria-label="返回首页">
          {{ profileData.name }}
        </router-link>
      </div>

      <!-- Desktop Menu -->
      <ul class="navigation__menu navigation__menu--desktop" role="menubar">
        <li v-for="item in menuItems" :key="item.path" class="navigation__item" role="none">
          <router-link
            :to="item.path"
            class="navigation__link"
            :class="{ 'navigation__link--active': isActive(item.path) }"
            role="menuitem"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            @mouseenter="handleLinkHover(item.path)"
            @focus="handleLinkHover(item.path)"
          >
            <span v-if="item.icon" class="navigation__icon" aria-hidden="true">{{ item.icon }}</span>
            <span>{{ item.name }}</span>
          </router-link>
        </li>
      </ul>

      <!-- Theme Switcher & Mobile Menu Toggle -->
      <div class="navigation__actions">
        <!-- Theme Switcher -->
        <ThemeSwitcher class="navigation__theme-switcher" />

        <!-- Mobile Menu Toggle -->
        <button
          class="navigation__toggle"
          :class="{ 'navigation__toggle--active': mobileMenuOpen }"
          @click="toggleMobileMenu"
          :aria-label="mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'"
          :aria-expanded="mobileMenuOpen"
          aria-controls="mobile-menu"
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
      </div>
    </div>

    <!-- Mobile Menu -->
    <transition name="mobile-menu">
      <div 
        v-if="mobileMenuOpen" 
        id="mobile-menu"
        class="navigation__mobile-menu"
        role="dialog"
        aria-modal="false"
      >
        <ul class="navigation__menu navigation__menu--mobile" role="menu">
          <li v-for="item in menuItems" :key="item.path" class="navigation__item" role="none">
            <router-link
              :to="item.path"
              class="navigation__link"
              :class="{ 'navigation__link--active': isActive(item.path) }"
              role="menuitem"
              :aria-current="isActive(item.path) ? 'page' : undefined"
              @click="closeMobileMenu"
              @mouseenter="handleLinkHover(item.path)"
              @focus="handleLinkHover(item.path)"
            >
              <span v-if="item.icon" class="navigation__icon" aria-hidden="true">{{ item.icon }}</span>
              <span>{{ item.name }}</span>
            </router-link>
          </li>
        </ul>
      </div>
    </transition>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { NavigationProps, MenuItem } from '@/types'
import { profileData } from '@/data/profile'
import { ThemeSwitcher } from '@/components/common'

// Props
const props = withDefaults(defineProps<NavigationProps>(), {
  fixed: true,
  transparent: false,
})

// Router
const route = useRoute()

// State
const mobileMenuOpen = ref(false)

// 预加载缓存：记录已预加载的路由，避免重复加载
// 验证: 需求 4.5 - 用户悬停在导航链接上时预加载对应路由的代码块
const preloadedRoutes = new Set<string>()

// 路由组件映射：用于动态导入预加载
// 验证: 需求 4.5 - 预加载对应路由的代码块
const routeComponentMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/views/Home.vue'),
  '/about': () => import('@/views/About.vue'),
  '/education': () => import('@/views/Education.vue'),
  '/experience': () => import('@/views/Experience.vue'),
  '/skills': () => import('@/views/Skills.vue'),
  '/contact': () => import('@/views/Contact.vue'),
}

// Menu items
const menuItems: MenuItem[] = [
  { name: '首页', path: '/', icon: '🏠' },
  { name: '关于我', path: '/about', icon: '👤' },
  { name: '教育经历', path: '/education', icon: '🎓' },
  { name: '工作经历', path: '/experience', icon: '💼' },
  { name: '技能展示', path: '/skills', icon: '⚡' },
  { name: '联系方式', path: '/contact', icon: '📧' },
]

// Methods
const isActive = (path: string): boolean => {
  return route.path === path
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

/**
 * 处理导航链接悬停事件，预加载对应路由组件
 * 验证: 需求 4.5 - 用户悬停在导航链接上时预加载对应路由的代码块
 * @param path - 路由路径
 */
const handleLinkHover = (path: string): void => {
  // 如果已经预加载过或者是当前路由，则跳过
  if (preloadedRoutes.has(path) || route.path === path) {
    return
  }
  
  // 获取对应的组件加载函数
  const loadComponent = routeComponentMap[path]
  
  if (loadComponent) {
    // 标记为已预加载
    preloadedRoutes.add(path)
    
    // 执行预加载（动态导入）
    // 使用 requestIdleCallback 在浏览器空闲时执行，避免影响用户交互
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loadComponent().catch(() => {
          // 预加载失败时从缓存中移除，允许下次重试
          preloadedRoutes.delete(path)
        })
      }, { timeout: 2000 })
    } else {
      // 降级方案：使用 setTimeout
      setTimeout(() => {
        loadComponent().catch(() => {
          preloadedRoutes.delete(path)
        })
      }, 100)
    }
  }
}
</script>

<style scoped>
.navigation {
  width: 100%;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  z-index: 1000;
  transition: all 0.3s ease;
}

.navigation--fixed {
  position: fixed;
  top: 0;
  left: 0;
  /* 安全区域适配：固定导航栏需要考虑顶部安全区域 */
  padding-top: var(--safe-area-inset-top);
}

.navigation--transparent {
  background: rgba(21, 25, 50, 0.8);
  backdrop-filter: blur(10px);
}

.navigation__container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1rem 2rem;
  /* 安全区域适配：左右内边距考虑安全区域 */
  padding-left: max(2rem, calc(var(--safe-area-inset-left) + 1rem));
  padding-right: max(2rem, calc(var(--safe-area-inset-right) + 1rem));
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.navigation__brand {
  flex-shrink: 0;
}

.navigation__logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.navigation__logo:hover {
  color: var(--secondary);
}

.navigation__menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 0.5rem;
}

.navigation__menu--desktop {
  display: none;
}

.navigation__menu--mobile {
  flex-direction: column;
  gap: 0;
}

.navigation__item {
  margin: 0;
}

.navigation__link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.navigation__link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.navigation__link--active {
  color: var(--primary);
  background: rgba(0, 217, 255, 0.1);
}

.navigation__icon {
  font-size: 1.2rem;
}

/* 操作按钮容器（主题切换器 + 移动端菜单按钮） */
.navigation__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 主题切换器在导航栏中的样式 */
.navigation__theme-switcher {
  flex-shrink: 0;
}

.navigation__toggle {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 2rem;
  height: 2rem;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 10;
}

.navigation__toggle span {
  width: 2rem;
  height: 0.2rem;
  background: var(--text-primary);
  border-radius: 10px;
  transition: all 0.3s ease;
  transform-origin: 1px;
}

.navigation__toggle--active span:nth-child(1) {
  transform: rotate(45deg);
}

.navigation__toggle--active span:nth-child(2) {
  opacity: 0;
  transform: translateX(20px);
}

.navigation__toggle--active span:nth-child(3) {
  transform: rotate(-45deg);
}

.navigation__mobile-menu {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  padding: 1rem 0;
  /* 安全区域适配：移动端菜单底部内边距 */
  padding-bottom: max(1rem, var(--safe-area-inset-bottom));
}

/* Mobile menu transitions */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Tablet and Desktop */
@media (min-width: 768px) {
  .navigation__menu--desktop {
    display: flex;
  }

  .navigation__toggle {
    display: none;
  }

  .navigation__mobile-menu {
    display: none;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .navigation__container {
    padding: 1.25rem 2rem;
  }

  .navigation__menu {
    gap: 1rem;
  }

  .navigation__link {
    padding: 0.75rem 1.25rem;
  }
}
</style>
