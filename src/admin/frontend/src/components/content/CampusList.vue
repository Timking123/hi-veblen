<script setup lang="ts">
/**
 * 校园经历管理组件
 * 支持组织/职位信息 CRUD 操作
 * 
 * 需求: 3.6.1
 */
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { CampusExperience } from '@/types'
import {
  getCampusList,
  createCampus,
  updateCampus,
  deleteCampus
} from '@/api/content'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 校园经历列表
const campusList = ref<CampusExperience[]>([])
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加校园经历')
const isEditing = ref(false)
const saving = ref(false)

// 表单数据
const formData = reactive<Partial<CampusExperience>>({
  id: 0,
  organization: '',
  position: '',
  period: '',
  sortOrder: 0
})

/**
 * 加载校园经历列表
 */
async function loadCampusList() {
  loading.value = true
  try {
    const res = await getCampusList() as any
    campusList.value = res.data || []
  } catch (error) {
    console.error('加载校园经历失败:', error)
    ElMessage.error('加载校园经历失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开添加对话框
 */
function handleAdd() {
  dialogTitle.value = '添加校园经历'
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(row: CampusExperience) {
  dialogTitle.value = '编辑校园经历'
  isEditing.value = true
  Object.assign(formData, {
    id: row.id,
    organization: row.organization,
    position: row.position,
    period: row.period,
    sortOrder: row.sortOrder || 0
  })
  dialogVisible.value = true
}

/**
 * 删除校园经历
 */
async function handleDelete(row: CampusExperience) {
  try {
    await ElMessageBox.confirm(
      `确定要删除在 "${row.organization}" 的校园经历吗？`,
      '删除确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    
    await deleteCampus(row.id)
    ElMessage.success('删除成功')
    loadCampusList()
    emit('saved')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除校园经历失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 保存校园经历
 */
async function handleSave() {
  // 验证必填字段
  if (!formData.organization?.trim()) {
    ElMessage.warning('请输入组织名称')
    return
  }
  if (!formData.position?.trim()) {
    ElMessage.warning('请输入职位名称')
    return
  }
  if (!formData.period?.trim()) {
    ElMessage.warning('请输入任职时间')
    return
  }
  
  saving.value = true
  try {
    const data = {
      organization: formData.organization,
      position: formData.position,
      period: formData.period,
      sort_order: formData.sortOrder
    }
    
    if (isEditing.value && formData.id) {
      await updateCampus(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await createCampus(data as any)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadCampusList()
    emit('saved')
  } catch (error) {
    console.error('保存校园经历失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

/**
 * 重置表单
 */
function resetForm() {
  Object.assign(formData, {
    id: 0,
    organization: '',
    position: '',
    period: '',
    sortOrder: 0
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadCampusList()
})
</script>

<template>
  <div class="campus-list" v-loading="loading">
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加校园经历
      </el-button>
    </div>
    
    <!-- 校园经历列表 -->
    <div class="list-container">
      <el-table :data="campusList" stripe>
        <el-table-column prop="organization" label="组织名称" min-width="200" />
        <el-table-column prop="position" label="职位" min-width="150" />
        <el-table-column prop="period" label="任职时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" size="small" link @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-empty v-if="campusList.length === 0" description="暂无校园经历" />
    </div>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="组织名称" required>
          <el-input v-model="formData.organization" placeholder="如：学生会、社团名称" />
        </el-form-item>
        
        <el-form-item label="职位" required>
          <el-input v-model="formData.position" placeholder="如：主席、部长" />
        </el-form-item>
        
        <el-form-item label="任职时间" required>
          <el-input v-model="formData.period" placeholder="如：2019.09 - 2020.06" />
        </el-form-item>
        
        <el-form-item label="排序">
          <el-input-number v-model="formData.sortOrder" :min="0" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.campus-list {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}

.list-container {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 20px;
}
</style>
