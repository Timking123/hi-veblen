<template>
  <section class="gallery-page sci-section" aria-labelledby="gallery-title">
    <div class="sci-section-heading sci-section-heading--center">
      <p class="sci-eyebrow">VISUAL MEMORY GALLERY</p>
      <h1 id="gallery-title">视觉记忆舱</h1>
      <p>摄影、航拍、视频与数字艺术资产将在这里以电影画廊方式接入；当前先使用自动生成的科幻封面补齐展厅结构。</p>
    </div>

    <div class="gallery-stage sci-panel">
      <div class="gallery-stage__frame cinematic-frame" @click="openLightbox(activeItem)">
        <span class="gallery-stage__code">FRAME_000 / SIGNAL PREVIEW</span>
        <h2>{{ activeItem.title }}</h2>
        <p>{{ activeItem.description }}</p>
      </div>
    </div>

    <div class="sci-grid sci-grid--3">
      <button
        v-for="item in placeholders"
        :key="item.title"
        class="sci-card gallery-card"
        :class="{ active: activeItem.title === item.title }"
        @click="activeItem = item"
        @dblclick="openLightbox(item)"
      >
        <SciFiCover :code="item.code" :label="item.type" :variant="item.variant" />
        <h2>{{ item.title }}</h2>
        <p>{{ item.description }}</p>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="lightboxItem" class="gallery-lightbox" role="dialog" aria-modal="true" @click.self="closeLightbox">
        <button class="gallery-lightbox__close" @click="closeLightbox">×</button>
        <div class="gallery-lightbox__frame">
          <SciFiCover :code="lightboxItem.code" :label="lightboxItem.type" :variant="lightboxItem.variant" />
        </div>
        <aside class="gallery-lightbox__caption">
          <p class="sci-eyebrow">CINEMATIC LIGHTBOX</p>
          <h2>{{ lightboxItem.title }}</h2>
          <p>{{ lightboxItem.description }}</p>
          <span>EXIF: FUTURE_ASSET / LOCATION_UNKNOWN / SIGNAL_READY</span>
        </aside>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SciFiCover from '@/components/system/SciFiCover.vue'

type GalleryVariant = 'ai' | 'web' | 'data' | 'visual' | 'default'
interface GalleryItem {
  code: string
  type: string
  title: string
  description: string
  variant: GalleryVariant
}

const placeholders: GalleryItem[] = [
  { code: 'PHOTO', type: '35MM', title: '全画幅摄影', description: '预留高像素摄影作品入口，支持地点、时间、器材和故事字幕。', variant: 'visual' },
  { code: 'DRONE', type: 'AERIAL', title: '航拍运镜', description: '预留大场景航拍视频，未来支持滚动驱动的镜头推进。', variant: 'data' },
  { code: 'AI-VIS', type: 'GEN', title: '数字艺术实验', description: '预留 WebGL、AI 生成影像和视觉编程作品展示区。', variant: 'ai' },
]

const activeItem = ref<GalleryItem>(placeholders[0])
const lightboxItem = ref<GalleryItem | null>(null)

const openLightbox = (item: GalleryItem) => {
  lightboxItem.value = item
}

const closeLightbox = () => {
  lightboxItem.value = null
}
</script>
