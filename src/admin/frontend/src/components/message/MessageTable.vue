<script setup lang="ts">
/**
 * 留言表格组件
 * 以表格形式展示留言列表
 * 
 * 需求: 4.1.1
 */
import { ref, computed } from 'vue'
import { View, Delete, Message as MessageIcon, Check } from '@element-plus/icons-vue'
import type { Message } from '@/types'
import { formatBeijingTime } from '@/utils/time'

// 定义 Props
interface Props {
  data: Message[]
  loading?: boolean
  total?: number
  page?: number
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  total: 0,
  page: 1,
  pageSize: 20
})

// 定义事件
const emit = defineEmits<{
  (e: 'view', message: Message): void
  (e: 'mark-read', message: Message): void
  (e: 'mark-unread', message: Message): void
  (e: 'delete', message: Message): void
  (e: 'batch-delete', ids: number[]): void
  (e: 'selection-change', selection: Message[]): void
  (e: 'page-change', page: number): void
  (e: 'size-change', size: number): void
}>()

// 选中的留言
const selectedMessages = ref<Message[]>([])

// 是否有选中的留言
const hasSelection = computed(() => selectedMessages.value.length > 0)

// 选中的留言数量
const selectionCount = computed(() => selectedMessages.value.length)

/**
 * 截取内容摘要
 */
function truncateContent(content: string, maxLength: number = 50): string {
  if (!content) return ''
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

/**
 * 格式化时间
 * 使用北京时间格式化 - 需求 14.1
 */
function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  return formatBeijingTime(dateStr, 'YYYY-MM-DD HH:mm')
}

/**
 * 处理选择变化
 */
function handleSelectionChange(selection: Message[]) {
  selectedMessages.value = selection
  emit('selection-change', selection)
}

/**
 * 查看留言详情
 */
function handleView(message: Message) {
  emit('view', message)
}

/**
 * 标记已读
 */
function handleMarkRead(message: Message) {
  emit('mark-read', message)
}

/**
 * 标记未读
 */
function handleMarkUnread(message: Message) {
  emit('mark-unread', message)
}

/**
 * 删除留言
 */
function handleDelete(message: Message) {
  emit('delete', message)
}

/**
 * 批量删除
 */
function handleBatchDelete() {
  const ids = selectedMessages.value.map(m => m.id)
  emit('batch-delete', ids)
}

/**
 * 页码变化
 */
function handlePageChange(page: number) {
  emit('page-change', page)
}

/**
 * 每页数量变化
 */
function handleSizeChange(size: number) {
  emit('size-change', size)
}
</script>

<template>
  <div class="message-table">
    <!-- 批量操作栏 -->
    <div class="batch-actions" v-if="hasSelection">
      <span class="selection-info">
        已选择 <strong>{{ selectionCount }}</strong> 条留言
      </span>
      <el-button type="danger" size="small" @click="handleBatchDelete">
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
    </div>
    
    <!-- 留言表格 -->
    <el-table
      :data="props.data"
      v-loading="props.loading"
      stripe
      @selection-change="handleSelectionChange"
    >
      <!-- 选择列 -->
      <el-table-column type="selection" width="50" />
      
      <!-- 称呼 -->
      <el-table-column prop="nickname" label="称呼" width="120">
        <template #default="{ row }">
          <div class="nickname-cell">
            <el-badge v-if="row.status === 'unread'" is-dot class="unread-badge">
              <span>{{ row.nickname }}</span>
            </el-badge>
            <span v-else>{{ row.nickname }}</span>
          </div>
        </template>
      </el-table-column>
      
      <!-- 联系方式 -->
      <el-table-column prop="contact" label="联系方式" width="180" />
      
      <!-- 内容摘要 -->
      <el-table-column prop="content" label="内容摘要" min-width="200">
        <template #default="{ row }">
          <span class="content-summary">{{ truncateContent(row.content) }}</span>
        </template>
      </el-table-column>
      
      <!-- 时间 -->
      <el-table-column prop="createdAt" label="时间" width="160">
        <template #default="{ row }">
          {{ formatTime(row.createdAt) }}
        </template>
      </el-table-column>
      
      <!-- 状态 -->
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'unread' ? 'danger' : 'success'" size="small">
            {{ row.status === 'unread' ? '未读' : '已读' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <!-- 操作 -->
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="handleView(row)">
            <el-icon><View /></el-icon>
            查看
          </el-button>
          <el-button
            v-if="row.status === 'unread'"
            type="success"
            size="small"
            link
            @click="handleMarkRead(row)"
          >
            <el-icon><Check /></el-icon>
            已读
          </el-button>
          <el-button
            v-else
            type="warning"
            size="small"
            link
            @click="handleMarkUnread(row)"
          >
            <el-icon><MessageIcon /></el-icon>
            未读
          </el-button>
          <el-button type="danger" size="small" link @click="handleDelete(row)">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="props.page"
        v-model:page-size="props.pageSize"
        :total="props.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.message-table {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 20px;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
  
  .selection-info {
    color: var(--text-regular);
    
    strong {
      color: var(--primary-color);
    }
  }
}

.nickname-cell {
  .unread-badge {
    :deep(.el-badge__content) {
      top: 4px;
      right: -4px;
    }
  }
}

.content-summary {
  color: var(--text-regular);
  line-height: 1.5;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
