<script setup lang="ts">
/**
 * 技能树编辑器组件
 * 支持技能树结构可视化编辑
 * 
 * 需求: 3.4.2
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, FolderAdd } from '@element-plus/icons-vue'
import type { SkillTreeNode } from '@/types'
import {
  getSkillTree,
  createSkillTreeNode,
  updateSkillTreeNode,
  deleteSkillTreeNode
} from '@/api/content'

// 定义事件
const emit = defineEmits<{
  (e: 'saved'): void
}>()

// 技能树数据
const treeData = ref<SkillTreeNode[]>([])
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('添加节点')
const isEditing = ref(false)
const saving = ref(false)

// 表单数据
const formData = reactive<Partial<SkillTreeNode>>({
  id: '',
  parentId: null,
  name: '',
  level: 0,
  experience: '',
  sortOrder: 0
})

// 当前选中的父节点
const selectedParentId = ref<string | null>(null)

// 树形控件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

/**
 * 扁平化树数据，用于父节点选择
 */
const flattenedNodes = computed(() => {
  const result: Array<{ id: string; name: string; level: number }> = []
  
  function flatten(nodes: SkillTreeNode[], depth = 0) {
    for (const node of nodes) {
      result.push({
        id: node.id,
        name: '　'.repeat(depth) + node.name,
        level: depth
      })
      if (node.children?.length) {
        flatten(node.children, depth + 1)
      }
    }
  }
  
  flatten(treeData.value)
  return result
})

/**
 * 加载技能树
 */
async function loadSkillTree() {
  loading.value = true
  try {
    const res = await getSkillTree() as any
    treeData.value = res.data || []
  } catch (error) {
    console.error('加载技能树失败:', error)
    ElMessage.error('加载技能树失败')
  } finally {
    loading.value = false
  }
}

/**
 * 打开添加根节点对话框
 */
function handleAddRoot() {
  dialogTitle.value = '添加根节点'
  isEditing.value = false
  selectedParentId.value = null
  resetForm()
  dialogVisible.value = true
}

/**
 * 打开添加子节点对话框
 */
function handleAddChild(parentNode: SkillTreeNode) {
  dialogTitle.value = `添加子节点 - ${parentNode.name}`
  isEditing.value = false
  selectedParentId.value = parentNode.id
  resetForm()
  formData.parentId = parentNode.id
  dialogVisible.value = true
}

/**
 * 打开编辑对话框
 */
function handleEdit(node: SkillTreeNode) {
  dialogTitle.value = '编辑节点'
  isEditing.value = true
  Object.assign(formData, {
    id: node.id,
    parentId: node.parentId,
    name: node.name,
    level: node.level || 0,
    experience: node.experience || '',
    sortOrder: node.sortOrder || 0
  })
  selectedParentId.value = node.parentId
  dialogVisible.value = true
}

/**
 * 删除节点
 */
async function handleDelete(node: SkillTreeNode) {
  const hasChildren = node.children && node.children.length > 0
  const message = hasChildren
    ? `确定要删除 "${node.name}" 及其所有子节点吗？`
    : `确定要删除 "${node.name}" 吗？`
  
  try {
    await ElMessageBox.confirm(message, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await deleteSkillTreeNode(node.id)
    ElMessage.success('删除成功')
    loadSkillTree()
    emit('saved')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除节点失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 保存节点
 */
async function handleSave() {
  // 验证必填字段
  if (!formData.name?.trim()) {
    ElMessage.warning('请输入节点名称')
    return
  }
  
  saving.value = true
  try {
    const data = {
      parent_id: formData.parentId || null,
      name: formData.name,
      level: formData.level || 0,
      experience: formData.experience,
      sort_order: formData.sortOrder
    }
    
    if (isEditing.value && formData.id) {
      await updateSkillTreeNode(formData.id, data)
      ElMessage.success('更新成功')
    } else {
      await createSkillTreeNode(data as any)
      ElMessage.success('添加成功')
    }
    
    dialogVisible.value = false
    loadSkillTree()
    emit('saved')
  } catch (error) {
    console.error('保存节点失败:', error)
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
    id: '',
    parentId: null,
    name: '',
    level: 0,
    experience: '',
    sortOrder: 0
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadSkillTree()
})
</script>

<template>
  <div class="skill-tree-editor" v-loading="loading">
    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" @click="handleAddRoot">
        <el-icon><Plus /></el-icon>
        添加根节点
      </el-button>
    </div>
    
    <!-- 技能树 -->
    <div class="tree-container">
      <el-tree
        v-if="treeData.length > 0"
        :data="treeData"
        :props="treeProps"
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
      >
        <template #default="{ data }">
          <div class="tree-node">
            <div class="node-content">
              <span class="node-name">{{ data.name }}</span>
              <el-progress
                v-if="data.level > 0"
                :percentage="data.level"
                :stroke-width="6"
                :show-text="false"
                style="width: 80px; margin-left: 10px;"
              />
              <span v-if="data.level > 0" class="node-level">{{ data.level }}%</span>
            </div>
            <div class="node-actions">
              <el-button type="primary" size="small" link @click.stop="handleAddChild(data)">
                <el-icon><FolderAdd /></el-icon>
              </el-button>
              <el-button type="primary" size="small" link @click.stop="handleEdit(data)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button type="danger" size="small" link @click.stop="handleDelete(data)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </template>
      </el-tree>
      
      <el-empty v-else description="暂无技能树数据，点击上方按钮添加" />
    </div>
    
    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      destroy-on-close
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="父节点">
          <el-select
            v-model="formData.parentId"
            placeholder="无（作为根节点）"
            clearable
            style="width: 100%;"
            :disabled="!isEditing && selectedParentId !== null"
          >
            <el-option
              v-for="node in flattenedNodes"
              :key="node.id"
              :label="node.name"
              :value="node.id"
              :disabled="isEditing && node.id === formData.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="节点名称" required>
          <el-input v-model="formData.name" placeholder="请输入节点名称" />
        </el-form-item>
        
        <el-form-item label="熟练度">
          <el-slider v-model="formData.level" :min="0" :max="100" show-input />
        </el-form-item>
        
        <el-form-item label="经验描述">
          <el-input
            v-model="formData.experience"
            type="textarea"
            :rows="3"
            placeholder="描述相关经验"
          />
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
.skill-tree-editor {
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
}

.tree-container {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 20px;
  min-height: 300px;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 0;
  
  .node-content {
    display: flex;
    align-items: center;
    
    .node-name {
      font-size: 14px;
      color: var(--text-primary);
    }
    
    .node-level {
      margin-left: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    }
  }
  
  .node-actions {
    display: flex;
    gap: 5px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover .node-actions {
    opacity: 1;
  }
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 5px 0;
}
</style>
