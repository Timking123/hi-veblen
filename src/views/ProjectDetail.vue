<template>
  <section class="project-detail-page sci-section" aria-labelledby="project-title">
    <div v-if="!project" class="sci-panel archive-empty">
      <p class="sci-eyebrow">404 / FILE MISSING</p>
      <h1>项目档案未找到</h1>
      <p>目标卷宗不存在或已被移动至离线档案库。</p>
      <button class="sci-button" @click="goBack">RETURN</button>
    </div>

    <article v-else class="deep-file-viewer">
      <button class="sci-button deep-file-viewer__back" @click="goBack">← BACK</button>

      <header class="deep-file-viewer__hero sci-panel">
        <div>
          <p class="sci-eyebrow">DEEP FILE / {{ categoryLabel }}</p>
          <h1 id="project-title">{{ project.name }}</h1>
          <p>{{ project.description }}</p>
        </div>
        <aside class="deep-file-viewer__meta">
          <span>PERIOD: {{ project.period }}</span>
          <span>ROLE: {{ project.role }}</span>
          <span>STATUS: CLASSIFIED</span>
        </aside>
      </header>

      <section class="deep-file-viewer__grid">
        <div class="sci-card deep-file-viewer__visual">
          <ImageCarousel
            v-if="project.screenshots && project.screenshots.length > 0"
            :images="project.screenshots"
            :auto-play="true"
            :interval="5000"
            :show-indicators="true"
            :show-arrows="true"
            @change="onCarouselChange"
          />
          <SciFiCover v-else :code="project.name.slice(0, 2).toUpperCase()" :variant="coverVariant(project.technologies)" label="DEEP FILE" />
        </div>

        <aside class="sci-card deep-file-viewer__stack">
          <p class="sci-eyebrow">TECH STACK</p>
          <RouterLink v-for="tech in project.technologies" :key="tech" :to="{ path: '/projects', query: { tech } }" class="sci-chip">
            {{ tech }}
          </RouterLink>
        </aside>
      </section>

      <section class="sci-card">
        <p class="sci-eyebrow">KEY HIGHLIGHTS</p>
        <ul class="sci-list">
          <li v-for="highlight in project.highlights" :key="highlight">{{ highlight }}</li>
        </ul>
      </section>

      <section v-if="project.demoUrl || project.sourceUrl" class="deep-file-viewer__links">
        <a v-if="project.demoUrl" :href="project.demoUrl" target="_blank" rel="noopener noreferrer" class="sci-button sci-button--primary">LIVE DEMO</a>
        <a v-if="project.sourceUrl" :href="project.sourceUrl" target="_blank" rel="noopener noreferrer" class="sci-button">SOURCE CODE</a>
      </section>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsData } from '@/data/profile'
import { PROJECT_CATEGORY_LABELS } from '@/types/project'
import ImageCarousel from '@/components/common/ImageCarousel.vue'
import SciFiCover from '@/components/system/SciFiCover.vue'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => route.params.id as string)
const project = computed(() => projectsData.find((item) => item.id === projectId.value))
const categoryLabel = computed(() => project.value ? PROJECT_CATEGORY_LABELS[project.value.category] : '')

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/projects')
}

const onCarouselChange = (_index: number) => {}

const coverVariant = (technologies: string[]) => {
  if (technologies.some((tech) => /AI|OpenAI|LangChain|Stable/i.test(tech))) return 'ai'
  if (technologies.some((tech) => /ECharts|数据|WebSocket/i.test(tech))) return 'data'
  if (technologies.some((tech) => /Vue|TypeScript|Vite|PWA/i.test(tech))) return 'web'
  return 'default'
}
</script>
