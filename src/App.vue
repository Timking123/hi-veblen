<template>
  <div id="app">
    <!-- Skip to main content link for keyboard navigation -->
    <a href="#main-content" class="skip-to-main">跳转到主要内容</a>
    
    <!-- Browser Compatibility Warning -->
    <BrowserCompatibilityWarning />
    
    <!-- Easter Egg Components -->
    <PageCollapseAnimation />
    <CMDWindow />
    <GameRulesDisplay />
    <GameContainer />
    <CelebrationPage />
    
    <!-- Background effects with aria-hidden -->
    <div aria-hidden="true" class="background-effects">
      <ParticleBackground
        :count="80"
        color="#00D9FF"
        :speed="0.5"
        :size="2"
        :connectionDistance="150"
      />
    </div>
    
    <Navigation :fixed="true" :transparent="false" />
    <main id="main-content" class="main-content" role="main" tabindex="-1">
      <PageTransition mode="slide" :duration="300">
        <RouterView :key="$route.path" />
      </PageTransition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, defineAsyncComponent } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import Navigation from '@/components/layout/Navigation.vue'
import PageTransition from '@/components/layout/PageTransition.vue'
import { BrowserCompatibilityWarning } from '@/components/common'
import PageCollapseAnimation from '@/components/game/PageCollapseAnimation.vue'
import CMDWindow from '@/components/game/CMDWindow.vue'
import GameRulesDisplay from '@/components/game/GameRulesDisplay.vue'
import GameContainer from '@/components/game/GameContainer.vue'
import CelebrationPage from '@/components/game/CelebrationPage.vue'
import { profileData } from '@/data/profile'
import { generatePersonSchema, injectStructuredData } from '@/utils/structuredData'

// Lazy load heavy particle background effect
const ParticleBackground = defineAsyncComponent(() => 
  import('@/components/effects/ParticleBackground.vue')
)

const appStore = useAppStore()
const { initTheme } = useTheme()

onMounted(() => {
  // 初始化主题系统
  initTheme()
  
  // 检测设备类型
  const checkMobile = () => {
    appStore.setIsMobile(window.innerWidth < 768)
  }

  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Inject structured data for SEO
  const personSchema = generatePersonSchema(profileData)
  injectStructuredData(personSchema)
})
</script>

<style scoped>
#app {
  width: 100%;
  min-height: 100vh;
}

/* Skip to main content link for accessibility */
.skip-to-main {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: var(--bg-primary);
  padding: 8px 16px;
  text-decoration: none;
  border-radius: 0 0 4px 0;
  z-index: 10000;
  font-weight: 600;
}

.skip-to-main:focus {
  top: 0;
}

.background-effects {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.main-content {
  /* 安全区域适配：顶部内边距需要考虑导航栏高度和安全区域 */
  padding-top: calc(4rem + var(--safe-area-inset-top));
  /* 安全区域适配：底部内边距考虑底部指示条 */
  padding-bottom: var(--safe-area-inset-bottom);
  min-height: calc(100vh - 4rem);
  position: relative;
  z-index: 1;
}

.main-content:focus {
  outline: none;
}
</style>
