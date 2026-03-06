<script setup lang="ts">
/**
 * 最近访问记录组件
 * 使用 Element Plus Table 渲染访问记录列表
 * 
 * 需求: 3.3, 3.4, 3.5
 */
import { computed } from 'vue'
import type { RecentVisit } from '@/types'

// 定义 Props
interface Props {
  /** 访问记录数据 */
  data: RecentVisit[]
  /** 是否加载中 */
  loading?: boolean
  /** 显示记录数量限制 */
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  limit: 10
})

// 定义 Emits
const emit = defineEmits<{
  (e: 'retry'): void
}>()

// 显示的数据（限制数量）
const displayData = computed(() => {
  return props.data.slice(0, props.limit)
})

/**
 * 格式化访问时间
 * 后端已经将时间转换为北京时间格式（YYYY-MM-DD HH:mm:ss）
 * 前端直接显示，不再进行时区转换
 */
const formatVisitTime = (timeStr: string | undefined): string => {
  if (!timeStr) return '-'
  return timeStr
}

// 处理重试
const handleRetry = () => {
  emit('retry')
}
</script>

<template>
  <el-card class="recent-visits" shadow="hover">
    <template #header>
      <div class="recent-visits__header">
        <span class="recent-visits__title">最近访问记录</span>
      </div>
    </template>
    
    <div class="recent-visits__container">
      <!-- 加载中状态 -->
      <div v-if="loading" class="recent-visits__loading">
        <el-skeleton :rows="5" animated />
      </div>
      
      <!-- 数据表格 -->
      <el-table 
        v-else-if="displayData.length > 0"
        :data="displayData" 
        size="small"
        max-height="400"
        stripe
      >
        <el-table-column prop="page" label="页面" min-width="120" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP 地址" width="130">
          <template #default="{ row }">
            {{ row.ip || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="设备类型" width="100">
          <template #default="{ row }">
            {{ row.deviceType || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="浏览器" width="100">
          <template #default="{ row }">
            {{ row.browser || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="访问时间" width="160">
          <template #default="{ row }">
            {{ formatVisitTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 空状态 -->
      <el-empty 
        v-else
        description="暂无访问记录"
        :image-size="100"
      >
        <el-button type="primary" @click="handleRetry">
          重新加载
        </el-button>
      </el-empty>
    </div>
  </el-card>
</template>

<style lang="scss" scoped>
.recent-visits {
  height: 100%;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  &__container {
    min-height: 200px;
  }

  &__loading {
    padding: 20px 0;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .recent-visits {
    :deep(.el-table) {
      font-size: 12px;
    }
  }
}
</style>
