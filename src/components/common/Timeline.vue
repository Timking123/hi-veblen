<template>
  <div :class="['timeline', `timeline-${layout}`]">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      :class="['timeline-item', { expanded: item.expanded }]"
      :style="{ animationDelay: `${index * 0.1}s` }"
    >
      <div class="timeline-marker">
        <div class="timeline-dot"></div>
        <div v-if="index < items.length - 1" class="timeline-line"></div>
      </div>
      <div class="timeline-content">
        <div class="timeline-header">
          <h3 class="timeline-title">{{ item.title }}</h3>
          <span class="timeline-period">{{ item.period }}</span>
        </div>
        <p class="timeline-subtitle">{{ item.subtitle }}</p>
        <p class="timeline-description">{{ item.description }}</p>
        <ul v-if="item.details && item.details.length > 0" class="timeline-details">
          <li v-for="(detail, idx) in item.details" :key="idx">{{ detail }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimelineProps } from '@/types'

withDefaults(defineProps<TimelineProps>(), {
  layout: 'vertical',
})
</script>

<style scoped>
.timeline {
  position: relative;
  width: 100%;
}

.timeline-vertical {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.timeline-horizontal {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  overflow-x: auto;
}

.timeline-item {
  display: flex;
  gap: 1.5rem;
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-marker {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #00d9ff), var(--secondary, #7b61ff));
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
  transition: all 0.3s ease;
  z-index: 2;
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.3);
  box-shadow: 0 0 30px rgba(0, 217, 255, 0.8);
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 60px;
  background: linear-gradient(
    to bottom,
    rgba(0, 217, 255, 0.5),
    rgba(123, 97, 255, 0.3)
  );
  margin-top: 0.5rem;
}

.timeline-content {
  flex: 1;
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.08), rgba(123, 97, 255, 0.08));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.timeline-content:hover {
  background: linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(123, 97, 255, 0.15));
  border-color: rgba(0, 217, 255, 0.4);
  transform: translateX(8px);
  box-shadow: 0 8px 32px rgba(0, 217, 255, 0.2);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.timeline-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0;
}

.timeline-period {
  font-size: 0.875rem;
  color: var(--primary, #00d9ff);
  font-weight: 500;
  white-space: nowrap;
}

.timeline-subtitle {
  font-size: 1rem;
  color: var(--text-secondary, #a0aec0);
  margin: 0.5rem 0;
}

.timeline-description {
  font-size: 0.95rem;
  color: var(--text-secondary, #a0aec0);
  line-height: 1.6;
  margin: 0.75rem 0;
}

.timeline-details {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0 0;
}

.timeline-details li {
  font-size: 0.9rem;
  color: var(--text-secondary, #a0aec0);
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.timeline-details li::before {
  content: '▹';
  position: absolute;
  left: 0;
  color: var(--primary, #00d9ff);
  font-weight: bold;
}

@media (max-width: 768px) {
  .timeline-item {
    gap: 1rem;
  }

  .timeline-content {
    padding: 1rem;
  }

  .timeline-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .timeline-title {
    font-size: 1.1rem;
  }

  .timeline-content:hover {
    transform: translateX(4px);
  }
}
</style>
