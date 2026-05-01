<template>
  <div id="app" class="sci-fi-app">
    <a href="#main-content" class="skip-to-main">跳转到主要内容</a>
    <BrowserCompatibilityWarning />

    <CinematicBackground />
    <ShaderBackground />
    <BootSequence v-if="showBoot" @finished="showBoot = false" />
    <CustomCursor />
    <RouteDistortionCanvas />
    <RouteTransitionOverlay />
    <PostProcessingLayer />
    <MuseumMap />
    <TelemetryWatermark />
    <ExperienceSettings />

    <PageCollapseAnimation />
    <CMDWindow />
    <GameRulesDisplay />
    <GameContainer />
    <CelebrationPage />

    <SystemHUD />
    <main id="main-content" class="main-content" role="main" tabindex="-1">
      <PageTransition mode="fade" :duration="420">
        <RouterView :key="$route.path" />
      </PageTransition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'
import { BrowserCompatibilityWarning } from '@/components/common'
import PageTransition from '@/components/layout/PageTransition.vue'
import CinematicBackground from '@/components/system/CinematicBackground.vue'
import ShaderBackground from '@/components/system/ShaderBackground.vue'
import BootSequence from '@/components/system/BootSequence.vue'
import SystemHUD from '@/components/system/SystemHUD.vue'
import CustomCursor from '@/components/system/CustomCursor.vue'
import RouteDistortionCanvas from '@/components/system/RouteDistortionCanvas.vue'
import RouteTransitionOverlay from '@/components/system/RouteTransitionOverlay.vue'
import ExperienceSettings from '@/components/system/ExperienceSettings.vue'
import PostProcessingLayer from '@/components/system/PostProcessingLayer.vue'
import MuseumMap from '@/components/system/MuseumMap.vue'
import TelemetryWatermark from '@/components/system/TelemetryWatermark.vue'
import PageCollapseAnimation from '@/components/game/PageCollapseAnimation.vue'
import CMDWindow from '@/components/game/CMDWindow.vue'
import GameRulesDisplay from '@/components/game/GameRulesDisplay.vue'
import GameContainer from '@/components/game/GameContainer.vue'
import CelebrationPage from '@/components/game/CelebrationPage.vue'
import { profileData } from '@/data/profile'
import { generatePersonSchema, injectStructuredData } from '@/utils/structuredData'

const appStore = useAppStore()
const { initTheme } = useTheme()
const showBoot = ref(!sessionStorage.getItem('hyj-boot-complete'))

onMounted(() => {
  initTheme()

  const checkMobile = () => {
    appStore.setIsMobile(window.innerWidth < 768)
  }

  checkMobile()
  window.addEventListener('resize', checkMobile)

  const personSchema = generatePersonSchema(profileData)
  injectStructuredData(personSchema)

  if (showBoot.value) {
    sessionStorage.setItem('hyj-boot-complete', 'true')
  }
})
</script>

<style scoped>
.sci-fi-app {
  width: 100%;
  min-height: 100vh;
  background: #02030a;
  color: #eaf7ff;
  isolation: isolate;
}

.skip-to-main {
  position: fixed;
  top: -48px;
  left: 1rem;
  z-index: 10000;
  padding: 0.75rem 1rem;
  background: #00e5ff;
  color: #02030a;
  border-radius: 0 0 0.75rem 0.75rem;
  font-weight: 800;
  text-decoration: none;
}

.skip-to-main:focus {
  top: 0;
}

.main-content {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  padding-top: 5.25rem;
  outline: none;
}

@media (max-width: 768px) {
  .main-content {
    padding-top: 4.5rem;
  }
}
</style>
