<script setup lang="ts">
/**
 * 成就管理组件
 * 显示成就列表，支持成就 CRUD 操作和条件配置
 * 
 * 需求: 6.2.1 - 显示成就列表（名称、描述、条件、图标）
 * 需求: 6.2.2 - 提供成就 CRUD 操作
 * 需求: 6.2.3 - 提供成就条件配置（类型、目标值）
 */
import { ref, reactive, onMounted, computed } from 'vue'
import {
  ElTable,
  ElTableColumn,
  ElButton,
  ElMessage,
  ElMessageBox,
  ElIcon,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElTag,
  ElEmpty
} from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Refresh,
  Trophy,
  Medal
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  type Achievement,
  type AchievementInput,
  type AchievementConditionType
} from '@/api/game'

// 成就列表数据
const achievementList = ref<Achievement[]>([])
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加成就')
const isEditing = ref(false)
const formRef = ref<FormInstance>()
const submitLoading = ref(false)

// 表单数据
const formData = reactive<AchievementInput>({
  id: '',
  name: '',
  description: '',
  icon: '',
  condition_type: 'score',
  condition_value: 100,
  sort_order: 0
})

// 条件类型选项
const conditionTypeOptions = [
  { value: 'score', label: '分数达到', description: '累计分数达到指定值' },
  { value: 'stage', label: '通关关卡', description: '通关指定关卡数' },
  { value: 'time', label: '游戏时长', description: '单局游戏时长达到指定秒数' },
  { value: 'kills', label: '击杀数', description: '单局击杀敌人数量达到指定值' },
  { value: 'combo', label: '连击数', description: '单次连击数达到指定值' },
  { value: 'noDamage', label: '无伤通关', description: '无伤通过指定关卡数' }
]

// 表单验证规则
const formRules: FormRules = {
  id: [
    { required: true, message: '请输入成就 ID', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: 'ID 只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入成就名称', trigger: 'blur' },
    { max: 50, message: '名称长度不能超过 50 个字符', trigger: 'blur' }
  ],
  condition_type: [
    { required: true, message: '请选择条件类型', trigger: 'change' }
  ],
  condition_value: [
    { required: true, message: '请输入条件值', trigger: 'blur' },
    { type: 'number', min: 1, message: '条件值必须大于 0', trigger: 'blur' }
  ]
}

/**
 * 加载成就列表
 */
async function loadAchievements() {
  loading.value = true
  try {
    const res = await getAchievements() as any
    achievementList.value = res.data || []
  } catch (error) {
    console.error('加载成就列表失败:', error)
    ElMessage.error('加载成就列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取条件类型标签
 */
function getConditionTypeLabel(type: AchievementConditionType): string {
  const option = conditionTypeOptions.find(opt => opt.value === type)
  return option?.label || type
}

/**
 * 获取条件类型标签颜色
 */
function getConditionTypeColor(type: AchievementConditionType): string {
  const colorMap: Record<string, string> = {
    score: '',
    stage: 'success',
    time: 'info',
    kills: 'danger',
    combo: 'warning',
    noDamage: ''
  }
  return colorMap[type] || ''
}

/**
 * 格式化条件值显示
 */
function formatConditionValue(type: AchievementConditionType, value: number): string {
  switch (type) {
    case 'score':
      return `${value.toLocaleString()} 分`
    case 'stage':
      return `第 ${value} 关`
    case 'time':
      const minutes = Math.floor(value / 60)
      const seconds = value % 60
      if (minutes === 0) return `${seconds} 秒`
      if (seconds === 0) return `${minutes} 分钟`
      return `${minutes} 分 ${seconds} 秒`
    case 'kills':
      return `${value} 个`
    case 'combo':
      return `${value} 连击`
    case 'noDamage':
      return `${value} 关`
    default:
      return String(value)
  }
}

/**
 * 重置表单
 */
function resetForm() {
  formData.id = ''
  formData.name = ''
  formData.description = ''
  formData.icon = ''
  formData.condition_type = 'score'
  formData.condition_value = 100
  formData.sort_order = 0
}

/**
 * 打开添加对话框
 */
function handleAdd() {
  resetForm()
  isEditing.value = false
  dialogTitle.value = '添加成就'
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(row: Achievement) {
  isEditing.value = true
  dialogTitle.value = '编辑成就'
  
  formData.id = row.id
  formData.name = row.name
  formData.description = row.description || ''
  formData.icon = row.icon || ''
  formData.condition_type = row.condition_type
  formData.condition_value = row.condition_value
  formData.sort_order = row.sort_order
  
  dialogVisible.value = true
}

/**
 * 提交表单
 */
async function handleSubmit() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  submitLoading.value = true
  try {
    if (isEditing.value) {
      // 更新成就
      await updateAchievement(formData.id, {
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon || null,
        condition_type: formData.condition_type,
        condition_value: formData.condition_value,
        sort_order: formData.sort_order
      })
      ElMessage.success('成就更新成功')
    } else {
      // 创建成就
      await createAchievement({
        ...formData,
        description: formData.description || null,
        icon: formData.icon || null
      })
      ElMessage.success('成就创建成功')
    }
    
    dialogVisible.value = false
    await loadAchievements()
  } catch (error: any) {
    console.error('保存成就失败:', error)
    ElMessage.error(error.message || '保存失败')
  } finally {
    submitLoading.value = false
  }
}

/**
 * 删除成就
 */
async function handleDelete(row: Achievement) {
  try {
    await ElMessageBox.confirm(
      `确定要删除成就 "${row.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteAchievement(row.id)
    ElMessage.success('删除成功')
    await loadAchievements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadAchievements()
})
</script>

<template>
  <div class="achievement-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        添加成就
      </el-button>
      <el-button @click="loadAchievements" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
    
    <!-- 成就列表 -->
    <el-table
      :data="achievementList"
      v-loading="loading"
      stripe
      style="width: 100%"
      empty-text="暂无成就数据"
    >
      <!-- 图标 -->
      <el-table-column label="图标" width="80" align="center">
        <template #default="{ row }">
          <div class="achievement-icon">
            <el-icon v-if="!row.icon" class="default-icon"><Trophy /></el-icon>
            <img v-else :src="row.icon" :alt="row.name" class="icon-img" />
          </div>
        </template>
      </el-table-column>
      
      <!-- ID -->
      <el-table-column prop="id" label="ID" width="120">
        <template #default="{ row }">
          <code class="achievement-id">{{ row.id }}</code>
        </template>
      </el-table-column>
      
      <!-- 名称 -->
      <el-table-column prop="name" label="名称" min-width="120">
        <template #default="{ row }">
          <span class="achievement-name">{{ row.name }}</span>
        </template>
      </el-table-column>
      
      <!-- 描述 -->
      <el-table-column prop="description" label="描述" min-width="180">
        <template #default="{ row }">
          <span v-if="row.description" class="achievement-desc">{{ row.description }}</span>
          <span v-else class="text-muted">-</span>
        </template>
      </el-table-column>
      
      <!-- 条件类型 -->
      <el-table-column label="条件类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getConditionTypeColor(row.condition_type)" size="small">
            {{ getConditionTypeLabel(row.condition_type) }}
          </el-tag>
        </template>
      </el-table-column>
      
      <!-- 条件值 -->
      <el-table-column label="目标值" width="120" align="center">
        <template #default="{ row }">
          <span class="condition-value">
            {{ formatConditionValue(row.condition_type, row.condition_value) }}
          </span>
        </template>
      </el-table-column>
      
      <!-- 排序 -->
      <el-table-column prop="sort_order" label="排序" width="80" align="center">
        <template #default="{ row }">
          <span class="text-muted">{{ row.sort_order }}</span>
        </template>
      </el-table-column>
      
      <!-- 操作 -->
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click="handleEdit(row)">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <el-button type="danger" size="small" text @click="handleDelete(row)">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="成就 ID" prop="id">
          <el-input
            v-model="formData.id"
            placeholder="请输入成就 ID（如：first_blood）"
            :disabled="isEditing"
          />
        </el-form-item>
        
        <el-form-item label="成就名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入成就名称"
          />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="2"
            placeholder="请输入成就描述（可选）"
          />
        </el-form-item>
        
        <el-form-item label="图标 URL" prop="icon">
          <el-input
            v-model="formData.icon"
            placeholder="请输入图标 URL（可选）"
          />
        </el-form-item>
        
        <el-form-item label="条件类型" prop="condition_type">
          <el-select v-model="formData.condition_type" style="width: 100%">
            <el-option
              v-for="option in conditionTypeOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            >
              <div class="condition-option">
                <span class="option-label">{{ option.label }}</span>
                <span class="option-desc">{{ option.description }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="目标值" prop="condition_value">
          <el-input-number
            v-model="formData.condition_value"
            :min="1"
            :max="999999"
            style="width: 100%"
          />
          <div class="form-tip">
            {{ formatConditionValue(formData.condition_type, formData.condition_value) }}
          </div>
        </el-form-item>
        
        <el-form-item label="排序" prop="sort_order">
          <el-input-number
            v-model="formData.sort_order"
            :min="0"
            :max="9999"
            style="width: 100%"
          />
          <div class="form-tip">数值越小越靠前</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ isEditing ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.achievement-container {
  padding: 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
}

.achievement-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 0 auto;
  
  .default-icon {
    font-size: 24px;
    color: #E6A23C;
  }
  
  .icon-img {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }
}

.achievement-id {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--bg-color-page);
  border-radius: 4px;
  color: var(--text-regular);
}

.achievement-name {
  font-weight: 500;
  color: var(--text-primary);
}

.achievement-desc {
  color: var(--text-regular);
  font-size: 13px;
}

.condition-value {
  font-weight: 500;
  color: var(--primary-color);
}

.text-muted {
  color: var(--text-secondary);
}

.condition-option {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
  
  .option-label {
    font-weight: 500;
  }
  
  .option-desc {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.form-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>
