<script setup lang="ts">
/**
 * 留言管理页面
 * 组合表格、筛选器、详情、导出功能
 * 
 * 需求: 4.1.1-4.4.2
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Message, MessageFilter as MessageFilterType } from '@/types'
import {
  MessageFilter,
  MessageTable,
  MessageDetail,
  ExportDialog
} from '@/components/message'
import {
  getMessageList,
  getMessageDetail,
  markAsRead,
  markAsUnread,
  deleteMessage,
  batchDeleteMessages,
  exportMessages
} from '@/api/message'

// 留言列表数据
const messageList = ref<Message[]>([])
const loading = ref(false)

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0
})

// 当前筛选条件
const currentFilter = reactive<MessageFilterType>({
  status: 'all',
  startDate: '',
  endDate: '',
  keyword: ''
})

// 详情对话框
const detailVisible = ref(false)
const detailLoading = ref(false)
const currentMessage = ref<Message | null>(null)

// 导出对话框
const exportVisible = ref(false)
const exportLoading = ref(false)

/**
 * 加载留言列表
 */
async function loadMessageList() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    
    // 添加筛选条件
    if (currentFilter.status && currentFilter.status !== 'all') {
      params.status = currentFilter.status
    }
    if (currentFilter.startDate) {
      params.startDate = currentFilter.startDate
    }
    if (currentFilter.endDate) {
      params.endDate = currentFilter.endDate
    }
    if (currentFilter.keyword) {
      params.keyword = currentFilter.keyword
    }
    
    const res = await getMessageList(params) as any
    messageList.value = res.data || []
    pagination.total = res.total || 0
    pagination.totalPages = res.totalPages || 0
  } catch (error) {
    console.error('加载留言列表失败:', error)
    ElMessage.error('加载留言列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理搜索
 */
function handleSearch(filter: MessageFilterType) {
  Object.assign(currentFilter, filter)
  pagination.page = 1
  loadMessageList()
}

/**
 * 处理重置
 */
function handleReset() {
  currentFilter.status = 'all'
  currentFilter.startDate = ''
  currentFilter.endDate = ''
  currentFilter.keyword = ''
  pagination.page = 1
  loadMessageList()
}

/**
 * 处理页码变化
 */
function handlePageChange(page: number) {
  pagination.page = page
  loadMessageList()
}

/**
 * 处理每页数量变化
 */
function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadMessageList()
}

/**
 * 查看留言详情
 */
async function handleView(message: Message) {
  detailVisible.value = true
  detailLoading.value = true
  
  try {
    const res = await getMessageDetail(message.id) as any
    currentMessage.value = res.message
    
    // 如果是未读状态，自动标记为已读
    if (res.message.status === 'unread') {
      await markAsRead(message.id)
      // 更新列表中的状态
      const index = messageList.value.findIndex(m => m.id === message.id)
      if (index !== -1) {
        messageList.value[index].status = 'read'
        messageList.value[index].readAt = new Date().toISOString()
      }
      // 更新当前详情的状态
      if (currentMessage.value) {
        currentMessage.value.status = 'read'
        currentMessage.value.readAt = new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('获取留言详情失败:', error)
    ElMessage.error('获取留言详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

/**
 * 标记已读
 */
async function handleMarkRead(message: Message) {
  try {
    await markAsRead(message.id)
    ElMessage.success('已标记为已读')
    
    // 更新列表中的状态
    const index = messageList.value.findIndex(m => m.id === message.id)
    if (index !== -1) {
      messageList.value[index].status = 'read'
      messageList.value[index].readAt = new Date().toISOString()
    }
    
    // 更新当前详情的状态
    if (currentMessage.value && currentMessage.value.id === message.id) {
      currentMessage.value.status = 'read'
      currentMessage.value.readAt = new Date().toISOString()
    }
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('标记已读失败')
  }
}

/**
 * 标记未读
 */
async function handleMarkUnread(message: Message) {
  try {
    await markAsUnread(message.id)
    ElMessage.success('已标记为未读')
    
    // 更新列表中的状态
    const index = messageList.value.findIndex(m => m.id === message.id)
    if (index !== -1) {
      messageList.value[index].status = 'unread'
      messageList.value[index].readAt = undefined
    }
    
    // 更新当前详情的状态
    if (currentMessage.value && currentMessage.value.id === message.id) {
      currentMessage.value.status = 'unread'
      currentMessage.value.readAt = undefined
    }
  } catch (error) {
    console.error('标记未读失败:', error)
    ElMessage.error('标记未读失败')
  }
}

/**
 * 删除留言
 * 需求: 4.2.4 - 删除前显示确认对话框
 */
async function handleDelete(message: Message) {
  try {
    await ElMessageBox.confirm(
      `确定要删除来自 "${message.nickname}" 的留言吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteMessage(message.id)
    ElMessage.success('删除成功')
    
    // 关闭详情对话框
    if (detailVisible.value && currentMessage.value?.id === message.id) {
      detailVisible.value = false
      currentMessage.value = null
    }
    
    // 重新加载列表
    loadMessageList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除留言失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 批量删除留言
 * 需求: 4.2.3, 4.2.4
 */
async function handleBatchDelete(ids: number[]) {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条留言吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await batchDeleteMessages(ids) as any
    ElMessage.success(`成功删除 ${res.count} 条留言`)
    
    // 重新加载列表
    loadMessageList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

/**
 * 打开导出对话框
 */
function handleOpenExport() {
  exportVisible.value = true
}

/**
 * 执行导出
 * 需求: 4.4.1, 4.4.2
 */
async function handleExport(params: {
  format: 'excel' | 'csv'
  startDate?: string
  endDate?: string
}) {
  exportLoading.value = true
  
  try {
    const response = await exportMessages(params) as any
    
    // 创建下载链接
    const blob = new Blob([response], {
      type: params.format === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv;charset=utf-8'
    })
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const dateStr = `${y}${m}${d}`
    const ext = params.format === 'excel' ? 'xlsx' : 'csv'
    link.download = `留言导出_${dateStr}.${ext}`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
    exportVisible.value = false
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadMessageList()
})
</script>

<template>
  <div class="message-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>留言管理</h2>
      <p class="page-desc">查看和管理访客留言</p>
    </div>
    
    <!-- 筛选器 -->
    <MessageFilter
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
      @export="handleOpenExport"
    />
    
    <!-- 留言表格 -->
    <MessageTable
      :data="messageList"
      :loading="loading"
      :total="pagination.total"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      @view="handleView"
      @mark-read="handleMarkRead"
      @mark-unread="handleMarkUnread"
      @delete="handleDelete"
      @batch-delete="handleBatchDelete"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    />
    
    <!-- 留言详情对话框 -->
    <MessageDetail
      v-model:visible="detailVisible"
      :message="currentMessage"
      :loading="detailLoading"
      @mark-read="handleMarkRead"
      @mark-unread="handleMarkUnread"
      @delete="handleDelete"
    />
    
    <!-- 导出对话框 -->
    <ExportDialog
      v-model:visible="exportVisible"
      :loading="exportLoading"
      @export="handleExport"
    />
  </div>
</template>

<style lang="scss" scoped>
.message-container {
  padding: 20px;
  background-color: var(--bg-color-page);
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
  
  h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .page-desc {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
}
</style>
