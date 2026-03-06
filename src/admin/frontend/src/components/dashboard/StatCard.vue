<script setup lang="ts">
/**
 * 统计卡片组件
 * 用于在数据看板页面显示各类统计数据
 * 
 * 需求: 2.1.1-2.1.4
 * - 显示今日/本周/本月访问量（PV/UV）
 * - 显示留言总数和未读留言数
 * - 显示简历下载次数
 * - 显示彩蛋游戏触发次数和通关次数
 */
import { computed } from 'vue'
import type { Component } from 'vue'
import { Top, Bottom } from '@element-plus/icons-vue'

// 定义 Props 类型
export interface StatCardProps {
  /** 卡片标题 */
  title: string
  /** 主要数值 */
  value: number | string
  /** 副标题/描述 */
  subtitle?: string
  /** 图标组件或图标名称 */
  icon?: string | Component
  /** 图标背景颜色 */
  iconColor?: string
  /** 趋势方向：up（上升）、down（下降）、none（无变化） */
  trend?: 'up' | 'down' | 'none'
  /** 趋势数值（百分比或具体数值） */
  trendValue?: string
  /** 额外信息列表，用于显示多个子指标 */
  extraInfo?: Array<{
    label: string
    value: number | string
  }>
  /** 是否显示加载状态 */
  loading?: boolean
}

const props = withDefaults(defineProps<StatCardProps>(), {
  subtitle: '',
  iconColor: '#409EFF',
  trend: 'none',
  trendValue: '',
  loading: false
})

// 计算趋势颜色
const trendColor = computed(() => {
  switch (props.trend) {
    case 'up':
      return '#67C23A' // 绿色（上升）
    case 'down':
      return '#F56C6C' // 红色（下降）
    default:
      return '#909399' // 灰色（无变化）
  }
})

// 格式化数值显示
const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    // 大数字格式化（如：1234 -> 1,234）
    return props.value.toLocaleString()
  }
  return props.value
})
</script>

<template>
  <el-card 
    class="stat-card" 
    :body-style="{ padding: '20px' }"
    shadow="hover"
    v-loading="loading"
  >
    <div class="stat-card__content">
      <!-- 图标区域 -->
      <div 
        v-if="icon" 
        class="stat-card__icon"
        :style="{ backgroundColor: iconColor }"
      >
        <component 
          v-if="typeof icon !== 'string'" 
          :is="icon" 
          class="stat-card__icon-component"
        />
        <el-icon v-else class="stat-card__icon-component">
          <component :is="icon" />
        </el-icon>
      </div>

      <!-- 数据区域 -->
      <div class="stat-card__data">
        <!-- 标题 -->
        <div class="stat-card__title">{{ title }}</div>
        
        <!-- 主要数值 -->
        <div class="stat-card__value">
          {{ formattedValue }}
          <!-- 趋势指示器 -->
          <span 
            v-if="trend !== 'none' && trendValue" 
            class="stat-card__trend"
            :style="{ color: trendColor }"
          >
            <el-icon v-if="trend === 'up'"><Top /></el-icon>
            <el-icon v-else-if="trend === 'down'"><Bottom /></el-icon>
            {{ trendValue }}
          </span>
        </div>

        <!-- 副标题 -->
        <div v-if="subtitle" class="stat-card__subtitle">
          {{ subtitle }}
        </div>

        <!-- 额外信息 -->
        <div v-if="extraInfo && extraInfo.length > 0" class="stat-card__extra">
          <div 
            v-for="(info, index) in extraInfo" 
            :key="index"
            class="stat-card__extra-item"
          >
            <span class="stat-card__extra-label">{{ info.label }}:</span>
            <span class="stat-card__extra-value">
              {{ typeof info.value === 'number' ? info.value.toLocaleString() : info.value }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style lang="scss" scoped>
.stat-card {
  height: 100%;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &__content {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  &__icon {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;

    &-component {
      font-size: 28px;
    }
  }

  &__data {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__value {
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.2;
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__trend {
    font-size: 14px;
    font-weight: 400;
    display: inline-flex;
    align-items: center;
    gap: 2px;

    .el-icon {
      font-size: 12px;
    }
  }

  &__subtitle {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  &__extra {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color-lighter);
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__extra-item {
    font-size: 13px;
    color: var(--text-regular);
  }

  &__extra-label {
    color: var(--text-secondary);
    margin-right: 4px;
  }

  &__extra-value {
    font-weight: 500;
    color: var(--text-primary);
  }
}

// 响应式适配
@media (max-width: 768px) {
  .stat-card {
    &__icon {
      width: 48px;
      height: 48px;

      &-component {
        font-size: 24px;
      }
    }

    &__value {
      font-size: 24px;
    }

    &__extra {
      flex-direction: column;
      gap: 8px;
    }
  }
}
</style>
