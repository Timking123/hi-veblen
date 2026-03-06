<script setup lang="ts">
/**
 * 留言详情组件
 * 显示留言详细信息，支持标记已读/未读和删除操作
 * 
 * 需求: 4.2.1, 4.2.2, 4.2.3, 4.2.4
 */
import { computed } from 'vue'
import { Check, Message as MessageIcon, Delete, Close } from '@element-plus/icons-vue'
import type { Message } from '@/types'
import { formatBeijingTime } from '@/utils/time'

// 定义 Props
interface Props {
  visible: boolean
  message: Message | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  message: null,
  loading: false
})

// 定义事件
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'mark-read', message: Message): void
  (e: 'mark-unread', message: Message): void
  (e: 'delete', message: Message): void
}>()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

/**
 * 格式化时间
 * 使用北京时间格式化 - 需求 14.1
 */
function formatTime(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  return formatBeijingTime(dateStr, 'YYYY-MM-DD HH:mm:ss')
}

/**
 * 关闭对话框
 */
function handleClose() {
  dialogVisible.value = false
}

/**
 * 标记已读
 */
function handleMarkRead() {
  if (props.message) {
    emit('mark-read', props.message)
  }
}

/**
 * 标记未读
 */
function handleMarkUnread() {
  if (props.message) {
    emit('mark-unread', props.message)
  }
}

/**
 * 删除留言
 */
function handleDelete() {
  if (props.message) {
    emit('delete', props.message)
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="留言详情"
    width="600px"
    destroy-on-close
    @close="handleClose"
  >
    <div class="message-detail" v-loading="props.loading">
      <template v-if="props.message">
        <!-- 基本信息 -->
        <div class="info-section">
          <div class="info-row">
            <span class="label">称呼：</span>
            <span class="value">{{ props.message.nickname }}</span>
            <el-tag
              :type="props.message.status === 'unread' ? 'danger' : 'success'"
              size="small"
              class="status-tag"
            >
              {{ props.message.status === 'unread' ? '未读' : '已读' }}
            </el-tag>
          </div>
          
          <div class="info-row">
            <span class="label">联系方式：</span>
            <span class="value">{{ props.message.contact }}</span>
          </div>
          
          <div class="info-row">
            <span class="label">提交时间：</span>
            <span class="value">{{ formatTime(props.message.createdAt) }}</span>
          </div>
          
          <div class="info-row" v-if="props.message.readAt">
            <span class="label">阅读时间：</span>
            <span class="value">{{ formatTime(props.message.readAt) }}</span>
          </div>
        </div>
        
        <!-- 留言内容 -->
        <div class="content-section">
          <div class="section-title">留言内容</div>
          <div class="content-box">
            {{ props.message.content }}
          </div>
        </div>
        
        <!-- 文件路径（如果有） -->
        <div class="file-section" v-if="props.message.filePath">
          <div class="info-row">
            <span class="label">存储路径：</span>
            <span class="value file-path">{{ props.message.filePath }}</span>
          </div>
        </div>
      </template>
      
      <el-empty v-else description="暂无留言数据" />
    </div>
    
    <template #footer>
      <div class="dialog-footer">
        <div class="left-actions">
          <el-button
            v-if="props.message?.status === 'unread'"
            type="success"
            @click="handleMarkRead"
          >
            <el-icon><Check /></el-icon>
            标记已读
          </el-button>
          <el-button
            v-else-if="props.message?.status === 'read'"
            type="warning"
            @click="handleMarkUnread"
          >
            <el-icon><MessageIcon /></el-icon>
            标记未读
          </el-button>
          <el-button type="danger" @click="handleDelete">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
        <el-button @click="handleClose">
          <el-icon><Close /></el-icon>
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.message-detail {
  min-height: 200px;
}

.info-section {
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  
  .label {
    width: 80px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  
  .value {
    color: var(--text-primary);
    flex: 1;
  }
  
  .status-tag {
    margin-left: 12px;
  }
  
  .file-path {
    font-family: monospace;
    font-size: 12px;
    color: var(--text-regular);
    background: var(--bg-color-page);
    padding: 2px 8px;
    border-radius: 4px;
  }
}

.content-section {
  .section-title {
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .content-box {
    background: var(--bg-color-page);
    padding: 16px;
    border-radius: 8px;
    line-height: 1.8;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
  }
}

.file-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .left-actions {
    display: flex;
    gap: 8px;
  }
}
</style>
