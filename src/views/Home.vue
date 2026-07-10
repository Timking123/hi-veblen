<template>
  <section class="signal-page" :style="scrollStyle" aria-labelledby="signal-title">
    <div class="signal-page__hero sci-section">
      <div class="signal-page__status sci-panel">
        <span>LIVE SIGNAL</span>
        <strong>HYJ-{{ sessionCode }}</strong>
      </div>

      <div class="signal-page__content">
        <p class="sci-eyebrow">PERSONAL DIGITAL ART MUSEUM</p>
        <h1 id="signal-title" class="signal-page__title">
          {{ profile.name }}
          <span>沉浸式科幻终端与数字艺术展厅</span>
        </h1>
        <p class="signal-page__summary">这里是一个以个人叙事、技术实验、影像记忆和交互彩蛋构成的数字艺术展厅。履历只是背景噪声，真正的核心是一个持续生长的个人世界。</p>

        <div class="signal-page__actions">
          <RouterLink to="/gallery" class="sci-button sci-button--primary">ENTER GALLERY</RouterLink>
          <RouterLink to="/projects" class="sci-button">OPEN ARCHIVE</RouterLink>
          <RouterLink to="/os" class="sci-button">BOOT LEGACY OS</RouterLink>
          <a :href="lingxiUrl" class="sci-button">ENTER LINGXI</a>
        </div>
      </div>

      <div class="signal-page__radar sci-panel" aria-label="能力信号概览">
        <div class="radar-core">
          <span></span>
        </div>
        <ul>
          <li v-for="item in telemetry" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </li>
        </ul>
      </div>
    </div>

    <section class="sci-section museum-corridor" aria-labelledby="corridor-title">
      <div class="museum-corridor__space">
        <div class="museum-corridor__vanish"></div>
        <div v-for="panel in corridorPanels" :key="panel" class="museum-corridor__panel">{{ panel }}</div>
      </div>
      <div class="sci-section-heading">
        <p class="sci-eyebrow">SPATIAL ENTRANCE</p>
        <h2 id="corridor-title">进入个人展厅走廊</h2>
      </div>
    </section>

    <section class="sci-section signal-page__modules" aria-labelledby="modules-title">
      <div class="sci-section-heading">
        <p class="sci-eyebrow">MISSION MODULES</p>
        <h2 id="modules-title">可探索的个人系统</h2>
      </div>
      <div class="sci-grid sci-grid--3">
        <RouterLink v-for="module in modules" :key="module.path" :to="module.path" class="sci-card module-card">
          <span class="module-card__index">{{ module.index }}</span>
          <h3>{{ module.title }}</h3>
          <p>{{ module.description }}</p>
        </RouterLink>
      </div>
    </section>

    <section class="sci-section signal-page__timeline" aria-labelledby="timeline-title">
      <div class="sci-section-heading">
        <p class="sci-eyebrow">PERSONAL SIGNALS</p>
        <h2 id="timeline-title">创作与经历的底层信号</h2>
      </div>
      <div class="sci-grid sci-grid--2">
        <article v-for="exp in profile.experience" :key="exp.id" class="sci-card log-card">
          <p class="log-card__period">{{ exp.period }}</p>
          <h3>{{ exp.company }}</h3>
          <strong>{{ exp.position }}</strong>
          <p>{{ exp.responsibilities[0] }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { profileData } from '@/data/profile'

const profile = profileData
const lingxiUrl = import.meta.env.VITE_LINGXI_URL || '/lingxi/'
const sessionCode = computed(() => Math.floor(1000 + Math.random() * 8999))
const scrollProgress = ref(0)
const corridorPanels = ['VISUAL', 'ARCHIVE', 'SIGNAL', 'LEGACY']
const scrollStyle = computed(() => ({ '--scroll-progress': scrollProgress.value.toFixed(3) }))

const updateScroll = () => {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  scrollProgress.value = Math.min(1, window.scrollY / max)
}

onMounted(() => {
  updateScroll()
  window.addEventListener('scroll', updateScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateScroll)
})

const telemetry = [
  { label: 'Creative Code', value: '∞' },
  { label: 'Visual System', value: 'LIVE' },
  { label: 'Interactive OS', value: 'ON' },
  { label: 'Research', value: '20+' },
]

const modules = [
  { index: '01', title: 'Identity Archive', description: '以档案方式拆解自我、创作动机、技术趣味和世界观。', path: '/about' },
  { index: '02', title: 'Capability Matrix', description: '展示支撑这个展厅运行的工程、视觉、数据和研究能力。', path: '/skills' },
  { index: '03', title: 'Classified Works', description: '项目不只是履历条目，而是一次次系统实验和作品原型。', path: '/projects' },
  { index: '04', title: 'Visual Memory', description: '摄影、航拍、AI 视觉和数字艺术实验的沉浸式展厅入口。', path: '/gallery' },
  { index: '05', title: 'Transmission Console', description: '如果这个世界与你产生共振，可以从这里建立通讯。', path: '/contact' },
  { index: '99', title: 'Legacy OS', description: '隐藏复古桌面系统，承载小游戏、终端命令与探索彩蛋。', path: '/os' },
]
</script>

<style scoped>
@media (max-width: 640px) {
  .signal-page__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .signal-page__actions .sci-button {
    min-width: 0;
    padding-inline: 0.6rem;
    font-size: 0.75rem;
    letter-spacing: 0;
  }
}
</style>
