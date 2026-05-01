<template>
  <section class="archive-page sci-section" aria-labelledby="archive-title">
    <div class="sci-section-heading sci-section-heading--center">
      <p class="sci-eyebrow">CLASSIFIED ARCHIVE</p>
      <h1 id="archive-title">机密项目档案库</h1>
      <p>所有项目以卷宗方式归档。图片素材缺失时将显示全息占位舱，不影响整体框架。</p>
    </div>

    <div class="archive-filters sci-panel" aria-label="项目筛选">
      <button :class="['sci-chip', { active: !filter.category && !filter.technology }]" @click="clearFilter">ALL FILES</button>
      <button v-for="category in availableCategories" :key="category" :class="['sci-chip', { active: filter.category === category }]" @click="filterByCategory(category)">
        {{ getCategoryLabel(category) }}
      </button>
    </div>

    <div class="sci-grid sci-grid--3 archive-grid">
      <article v-for="(project, index) in filteredProjects" :key="project.id" class="sci-card dossier-card" @click="goToProject(project.id)">
        <div class="dossier-card__visual">
          <img v-if="project.screenshots?.length" :src="project.screenshots[0]" :alt="project.name" @error="handleImageError" />
          <SciFiCover :code="project.name.slice(0, 2).toUpperCase()" :variant="coverVariant(project.technologies)" label="PROJECT WORK" />
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
        </div>
        <div class="dossier-card__body">
          <p class="sci-eyebrow">{{ getCategoryLabel(project.category) }} / {{ project.period }}</p>
          <h2>{{ project.name }}</h2>
          <p>{{ project.description }}</p>
          <div class="dossier-card__tech">
            <button v-for="tech in project.technologies.slice(0, 5)" :key="tech" class="sci-chip" @click.stop="filterByTechnology(tech)">
              {{ tech }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <div v-if="filteredProjects.length === 0" class="sci-panel archive-empty">
      <h2>NO FILE MATCHED</h2>
      <p>当前筛选条件没有命中项目档案。</p>
      <button class="sci-button" @click="clearFilter">RESET FILTER</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectsData } from '@/data/profile'
import { PROJECT_CATEGORY_LABELS, type Project } from '@/types/project'
import { useProjectFilter } from '@/composables/useProjectFilter'
import SciFiCover from '@/components/system/SciFiCover.vue'

const router = useRouter()
const route = useRoute()

const {
  filteredProjects,
  filter,
  filterByTechnology,
  filterByCategory,
  clearFilter,
  availableCategories,
} = useProjectFilter(projectsData)

const getCategoryLabel = (category: Project['category']) => PROJECT_CATEGORY_LABELS[category]
const goToProject = (projectId: string) => router.push(`/projects/${projectId}`)
const handleImageError = (event: Event) => {
  ;(event.target as HTMLImageElement).style.display = 'none'
}

const coverVariant = (technologies: string[]) => {
  if (technologies.some((tech) => /AI|OpenAI|LangChain|Stable/i.test(tech))) return 'ai'
  if (technologies.some((tech) => /ECharts|数据|WebSocket/i.test(tech))) return 'data'
  if (technologies.some((tech) => /Vue|TypeScript|Vite|PWA/i.test(tech))) return 'web'
  return 'default'
}

onMounted(() => {
  const techParam = route.query.tech as string | undefined
  const categoryParam = route.query.category as Project['category'] | undefined
  if (techParam) filterByTechnology(techParam)
  if (categoryParam) filterByCategory(categoryParam)
})

watch(filter, (newFilter) => {
  const query: Record<string, string> = {}
  if (newFilter.technology) query.tech = newFilter.technology
  if (newFilter.category) query.category = newFilter.category
  router.replace({ query })
}, { deep: true })
</script>
