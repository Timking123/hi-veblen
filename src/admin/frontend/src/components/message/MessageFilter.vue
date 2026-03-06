<script setup lang="ts">
/**
 * 留言筛选器组件
 * 支持时间范围、状态、关键词筛选
 * 
 * 需求: 4.1.2, 4.1.3, 4.1.4
 */
import { reactive, watch } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import type { MessageFilter } from '@/types'

// 定义 Props
interface Props {
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// 定义事件
const emit = defineEmits<{
  (e: 'search', filter: MessageFilter): void
  (e: 'reset'): void
  (e: 'export'): void
}>()

// 筛选表单数据
const filterForm = reactive<MessageFilter>({
  status: 'all',
  startDate: '',
  endDate: '',
  keyword: ''
})

// 日期范围快捷选项
const dateShortcuts = [
  {
    text: '今天',
    value: () => {
      const today = new Date()
      return [today, today]
    }
  },
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    }
  }
]

// 日期范围
const dateRange = reactive<[Date | null, Date | null]>([null, null])

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date: Date | null): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 监听日期范围变化
 */
watch(dateRange, (newRange) => {
  if (newRange && newRange[0] && newRange[1]) {
    filterForm.startDate = formatDate(newRange[0])
    filterForm.endDate = formatDate(newRange[1])
  } else {
    filterForm.startDate = ''
    filterForm.endDate = ''
  }
})

/**
 * 执行搜索
 */
function handleSearch() {
  emit('search', { ...filterForm })
}

/**
 * 重置筛选条件
 */
function handleReset() {
  filterForm.status = 'all'
  filterForm.startDate = ''
  filterForm.endDate = ''
  filterForm.keyword = ''
  dateRange[0] = null
  dateRange[1] = null
  emit('reset')
}

/**
 * 导出留言
 */
function handleExport() {
  emit('export')
}
</script>

<template>
  <div class="message-filter">
    <el-form :model="filterForm" inline>
      <!-- 状态筛选 -->
      <el-form-item label="状态">
        <el-select
          v-model="filterForm.status"
          placeholder="选择状态"
          style="width: 120px"
          @change="handleSearch"
        >
          <el-option label="全部" value="all" />
          <el-option label="未读" value="unread" />
          <el-option label="已读" value="read" />
        </el-select>
      </el-form-item>
      
      <!-- 时间范围筛选 -->
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          value-format="YYYY-MM-DD"
          style="width: 280px"
          @change="handleSearch"
        />
      </el-form-item>
      
      <!-- 关键词搜索 -->
      <el-form-item label="关键词">
        <el-input
          v-model="filterForm.keyword"
          placeholder="搜索称呼、联系方式、内容"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </el-form-item>
      
      <!-- 操作按钮 -->
      <el-form-item>
        <el-button type="primary" :loading="props.loading" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button @click="handleReset">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style lang="scss" scoped>
.message-filter {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  
  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 16px;
  }
}
</style>
