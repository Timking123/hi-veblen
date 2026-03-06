<template>
  <div class="achievement-list">
    <!-- 标题区域 -->
    <div class="achievement-header">
      <h2 class="achievement-title">🏅 成就系统</h2>
      <div class="achievement-progress">
        <span class="progress-text">{{ unlockedCount }}/{{ totalCount }}</span>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 成就列表 -->
    <div class="achievement-content">
      <!-- 空状态 -->
      <div v-if="achievements.length === 0" class="achievement-empty">
        <span class="empty-icon">🎯</span>
        <p class="empty-text">暂无成就</p>
      </div>

      <!-- 成就网格 -->
      <div v-else class="achievement-grid">
        <div
          v-for="achievement in achievements"
          :key="achievement.id"
          class="achievement-item"
          :class="{
            'is-unlocked': isUnlocked(achievement.id),
            'is-locked': !isUnlocked(achievement.id)
          }"
        >
          <!-- 成就图标 -->
          <div class="item-icon">
            <span class="icon-emoji">{{ achievement.icon }}</span>
            <div v-if="!isUnlocked(achievement.id)" class="lock-overlay">
              🔒
            </div>
          </div>

          <!-- 成就信息 -->
          <div class="item-info">
            <h3 class="item-name">{{ achievement.name }}</h3>
            <p class="item-description">{{ achievement.description }}</p>
            
            <!-- 解锁时间 -->
            <p v-if="isUnlocked(achievement.id)" class="item-unlock-time">
              <span class="unlock-icon">✓</span>
              {{ formatUnlockTime(achievement.unlockedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div v-if="showResetButton && unlockedCount > 0" class="achievement-footer">
      <button class="reset-button" @click="handleReset">
        重置成就
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 成就列表组件
 * 
 * 功能：
 * - 显示所有成就（已解锁和未解锁）
 * - 已解锁的成就显示解锁时间
 * - 未解锁的成就显示灰色/锁定状态
 * - 显示成就进度（已解锁/总数）
 * 
 * 需求: 7.7
 * - 7.7: 在游戏界面显示成就列表和解锁状态
 */
import { ref, computed, onMounted, watch } from 'vue'
import { AchievementSystem, DEFAULT_ACHIEVEMENTS, type Achievement } from '@/game/AchievementSystem'

// Props 定义
interface Props {
  /** 是否显示重置按钮 */
  showResetButton?: boolean
  /** 自定义 AchievementSystem 实例（用于测试） */
  system?: AchievementSystem
}

const props = withDefaults(defineProps<Props>(), {
  showResetButton: false,
  system: undefined
})

// Emits 定义
const emit = defineEmits<{
  /** 重置成就事件 */
  (e: 'reset'): void
}>()

// 成就系统实例
const achievementSystem = props.system || new AchievementSystem(DEFAULT_ACHIEVEMENTS)

// 成就列表
const achievements = ref<Achievement[]>([])

// 已解锁的成就 ID 列表
const unlockedIds = ref<string[]>([])

/**
 * 计算已解锁成就数量
 */
const unlockedCount = computed(() => unlockedIds.value.length)

/**
 * 计算总成就数量
 */
const totalCount = computed(() => achievements.value.length)

/**
 * 计算进度百分比
 */
const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((unlockedCount.value / totalCount.value) * 100)
})

/**
 * 检查成就是否已解锁
 * @param id 成就 ID
 * @returns 是否已解锁
 */
const isUnlocked = (id: string): boolean => {
  return unlockedIds.value.includes(id)
}

/**
 * 格式化解锁时间
 * @param timestamp 时间戳
 * @returns 格式化后的时间字符串
 */
const formatUnlockTime = (timestamp?: number): string => {
  if (!timestamp) return '已解锁'
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天解锁'
  } else if (diffDays === 1) {
    return '昨天解锁'
  } else if (diffDays < 7) {
    return `${diffDays} 天前解锁`
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    }) + ' 解锁'
  }
}

/**
 * 加载成就数据
 */
const loadAchievements = (): void => {
  achievements.value = achievementSystem.getAllAchievements()
  unlockedIds.value = achievementSystem.getUnlockedAchievements()
}

/**
 * 处理重置成就
 */
const handleReset = (): void => {
  achievementSystem.resetAchievements()
  loadAchievements()
  emit('reset')
}

/**
 * 刷新成就数据（供外部调用）
 */
const refresh = (): void => {
  loadAchievements()
}

// 监听 system prop 变化
watch(() => props.system, () => {
  loadAchievements()
})

// 组件挂载时加载数据
onMounted(() => {
  loadAchievements()
})

// 暴露方法供外部调用
defineExpose({
  refresh,
  achievements,
  unlockedCount,
  totalCount
})
</script>

<style scoped>
.achievement-list {
  background: var(--bg-card, rgba(21, 25, 50, 0.8));
  border: 2px solid var(--secondary, #7b61ff);
  border-radius: var(--radius-lg, 16px);
  padding: var(--spacing-lg, 24px);
  min-width: 320px;
  max-width: 500px;
  box-shadow: var(--shadow-glow-secondary, 0 0 20px rgba(123, 97, 255, 0.3));
  font-family: 'Press Start 2P', 'Courier New', monospace;
}

/* 标题区域 */
.achievement-header {
  text-align: center;
  margin-bottom: var(--spacing-lg, 24px);
  padding-bottom: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.achievement-title {
  font-size: var(--text-xl, 1.25rem);
  color: var(--secondary, #7b61ff);
  margin: 0 0 var(--spacing-md, 16px) 0;
  text-shadow: 0 0 10px rgba(123, 97, 255, 0.5);
  letter-spacing: 2px;
}

/* 进度条 */
.achievement-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.progress-text {
  font-size: var(--text-sm, 0.875rem);
  color: var(--text-secondary, #a0aec0);
}

.progress-bar {
  width: 100%;
  max-width: 200px;
  height: 8px;
  background: var(--bg-secondary, #151932);
  border-radius: var(--radius-full, 50%);
  overflow: hidden;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.progress-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--secondary, #7b61ff),
    var(--secondary-light, #9580ff)
  );
  border-radius: var(--radius-full, 50%);
  transition: width var(--transition-base, 300ms ease);
  box-shadow: 0 0 10px rgba(123, 97, 255, 0.5);
}

/* 内容区域 */
.achievement-content {
  min-height: 200px;
}

/* 空状态 */
.achievement-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2xl, 48px) var(--spacing-md, 16px);
  color: var(--text-muted, #718096);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-md, 16px);
  opacity: 0.5;
}

.empty-text {
  font-size: var(--text-sm, 0.875rem);
  margin: 0;
  color: var(--text-secondary, #a0aec0);
}

/* 成就网格 */
.achievement-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
}

/* 成就条目 */
.achievement-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-md, 16px);
  background: var(--bg-secondary, #151932);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  transition: all var(--transition-base, 300ms ease);
  position: relative;
}

/* 已解锁状态 */
.achievement-item.is-unlocked {
  border-color: var(--secondary, #7b61ff);
  background: linear-gradient(
    135deg,
    var(--bg-secondary, #151932) 0%,
    rgba(123, 97, 255, 0.15) 100%
  );
}

.achievement-item.is-unlocked:hover {
  transform: translateX(4px);
  box-shadow: 0 0 15px rgba(123, 97, 255, 0.3);
}

/* 锁定状态 */
.achievement-item.is-locked {
  opacity: 0.6;
  filter: grayscale(0.5);
}

.achievement-item.is-locked:hover {
  opacity: 0.8;
  filter: grayscale(0.3);
}

/* 成就图标 */
.item-icon {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-tertiary, #1a1f3a);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.is-unlocked .item-icon {
  border-color: var(--secondary, #7b61ff);
  box-shadow: 0 0 10px rgba(123, 97, 255, 0.3);
}

.icon-emoji {
  font-size: 24px;
  line-height: 1;
}

.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-md, 8px);
  font-size: 16px;
}

/* 成就信息 */
.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--text-sm, 0.875rem);
  color: var(--text-primary, #ffffff);
  margin: 0 0 var(--spacing-xs, 4px) 0;
  line-height: var(--leading-tight, 1.25);
}

.is-unlocked .item-name {
  color: var(--secondary-light, #9580ff);
}

.item-description {
  font-size: var(--text-xs, 0.75rem);
  color: var(--text-muted, #718096);
  margin: 0;
  line-height: var(--leading-normal, 1.5);
}

.item-unlock-time {
  font-size: 10px;
  color: var(--secondary, #7b61ff);
  margin: var(--spacing-sm, 8px) 0 0 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
}

.unlock-icon {
  font-size: 12px;
}

/* 底部操作区域 */
.achievement-footer {
  margin-top: var(--spacing-lg, 24px);
  padding-top: var(--spacing-md, 16px);
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  text-align: center;
}

.reset-button {
  font-family: 'Press Start 2P', 'Courier New', monospace;
  font-size: var(--text-xs, 0.75rem);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  background: transparent;
  color: var(--text-muted, #718096);
  border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all var(--transition-base, 300ms ease);
}

.reset-button:hover {
  color: var(--accent, #ff6b9d);
  border-color: var(--accent, #ff6b9d);
  background: rgba(255, 107, 157, 0.1);
}

.reset-button:active {
  transform: scale(0.98);
}

/* 响应式适配 */
@media (max-width: 480px) {
  .achievement-list {
    min-width: 280px;
    padding: var(--spacing-md, 16px);
  }

  .achievement-title {
    font-size: var(--text-lg, 1.125rem);
  }

  .achievement-item {
    padding: var(--spacing-sm, 8px);
    gap: var(--spacing-sm, 8px);
  }

  .item-icon {
    width: 40px;
    height: 40px;
  }

  .icon-emoji {
    font-size: 20px;
  }

  .item-name {
    font-size: var(--text-xs, 0.75rem);
  }

  .item-description {
    font-size: 10px;
  }
}
</style>
