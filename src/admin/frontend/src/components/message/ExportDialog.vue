<script setup lang="ts">
/**
 * 留言导出对话框组件
 * 支持选择导出格式和时间范围
 * 
 * 需求: 4.4.1, 4.4.2
 */
import { reactive, computed } from 'vue'
import { Download } from '@element-plus/icons-vue'

// 定义 Props
interface Props {
  visible: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  loading: false
})

// 定义事件
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'export', params: { format: 'excel' | 'csv'; startDate?: string; endDate?: string }): void
}>()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 导出表单数据
const exportForm = reactive({
  format: 'excel' as 'excel' | 'csv',
  dateRange: null as [Date, Date] | null
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
  },
  {
    text: '全部',
    value: () => {
      return null
    }
  }
]

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
 * 关闭对话框
 */
function handleClose() {
  dialogVisible.value = false
}

/**
 * 重置表单
 */
function resetForm() {
  exportForm.format = 'excel'
  exportForm.dateRange = null
}

/**
 * 执行导出
 */
function handleExport() {
  const params: { format: 'excel' | 'csv'; startDate?: string; endDate?: string } = {
    format: exportForm.format
  }
  
  if (exportForm.dateRange && exportForm.dateRange[0] && exportForm.dateRange[1]) {
    params.startDate = formatDate(exportForm.dateRange[0])
    params.endDate = formatDate(exportForm.dateRange[1])
  }
  
  emit('export', params)
}

/**
 * 对话框打开时重置表单
 */
function handleOpen() {
  resetForm()
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="导出留言"
    width="500px"
    destroy-on-close
    @open="handleOpen"
    @close="handleClose"
  >
    <el-form :model="exportForm" label-width="100px">
      <!-- 导出格式 -->
      <el-form-item label="导出格式">
        <el-radio-group v-model="exportForm.format">
          <el-radio-button value="excel">
            <span>Excel (.xlsx)</span>
          </el-radio-button>
          <el-radio-button value="csv">
            <span>CSV (.csv)</span>
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      
      <!-- 时间范围 -->
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="exportForm.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
        <div class="form-tip">
          不选择时间范围将导出全部留言
        </div>
      </el-form-item>
      
      <!-- 格式说明 -->
      <el-form-item label="格式说明">
        <el-alert
          :title="exportForm.format === 'excel' ? 'Excel 格式' : 'CSV 格式'"
          :type="exportForm.format === 'excel' ? 'success' : 'info'"
          :closable="false"
        >
          <template #default>
            <div v-if="exportForm.format === 'excel'">
              导出为 Excel 文件（.xlsx），支持多列格式化，适合在 Excel、WPS 等软件中打开查看。
            </div>
            <div v-else>
              导出为 CSV 文件（.csv），纯文本格式，兼容性好，适合数据导入或程序处理。
            </div>
          </template>
        </el-alert>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="props.loading" @click="handleExport">
        <el-icon><Download /></el-icon>
        开始导出
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

:deep(.el-alert) {
  .el-alert__content {
    font-size: 13px;
    line-height: 1.6;
  }
}
</style>
