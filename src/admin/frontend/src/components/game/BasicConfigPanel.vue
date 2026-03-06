<script setup lang="ts">
/**
 * 基础配置面板组件
 * 显示和编辑游戏基础参数：生命值、速度、核弹进度、敌人生成速率、关卡敌人总数
 * 扩展功能：分关卡配置、敌我双方参数配置、敌人单体参数配置
 * 
 * 需求: 6.4.1 - 玩家初始生命值配置
 * 需求: 6.4.2 - 玩家初始速度配置
 * 需求: 6.4.3 - 核弹进度条最大值配置
 * 需求: 6.4.4 - 敌人生成速率配置
 * 需求: 6.4.5 - 关卡敌人总数配置
 * 需求: 10.1 - 分关卡配置选项
 * 需求: 10.2 - 敌我双方参数配置选项
 * 需求: 10.3 - 敌人单体参数配置选项
 * 需求: 10.4 - 新增敌人类型的配置入口
 */
import { computed, ref } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElCard,
  ElRow,
  ElCol,
  ElTooltip,
  ElIcon,
  ElCollapse,
  ElCollapseItem,
  ElSlider,
  ElSwitch,
  ElTag,
  ElButton,
  ElDivider
} from 'element-plus'
import { QuestionFilled, Plus } from '@element-plus/icons-vue'
import type { BasicConfig, AdvancedConfig, EnemyType, StageConfig } from '@/api/game'

// Props
const props = defineProps<{
  modelValue: BasicConfig
  defaultConfig: BasicConfig
  advancedConfig?: AdvancedConfig
  defaultAdvancedConfig?: AdvancedConfig
}>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: BasicConfig): void
  (e: 'update:advancedConfig', value: AdvancedConfig): void
  (e: 'addEnemyType'): void
}>()

// 展开的面板
const activeNames = ref<string[]>([])

// 敌人类型名称映射
const enemyTypeNames: Record<string, string> = {
  white: '白色敌人',
  green: '绿色敌人',
  blue: '蓝色敌人',
  purple: '紫色敌人',
  yellow: '黄色敌人',
  orange: '橙色敌人',
  red: '红色敌人'
}

// 计算属性：双向绑定
const config = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/**
 * 更新单个配置项
 */
function updateConfig<K extends keyof BasicConfig>(key: K, value: BasicConfig[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value
  })
}

/**
 * 检查值是否与默认值不同
 */
function isModified(key: keyof BasicConfig): boolean {
  return props.modelValue[key] !== props.defaultConfig[key]
}

/**
 * 获取默认值提示
 */
function getDefaultTip(key: keyof BasicConfig): string {
  return `默认值: ${props.defaultConfig[key]}`
}

/**
 * 安全获取关卡数据
 */
const stagesData = computed(() => {
  return props.advancedConfig?.stages ?? []
})

/**
 * 安全获取敌人类型数据
 */
const enemyTypesEntries = computed(() => {
  return props.advancedConfig?.enemies?.types 
    ? Object.entries(props.advancedConfig.enemies.types) 
    : []
})

/**
 * 更新关卡配置
 */
function updateStageConfig(stageIndex: number, key: keyof StageConfig, value: any) {
  if (!props.advancedConfig) return
  
  const newStages = [...props.advancedConfig.stages]
  newStages[stageIndex] = {
    ...newStages[stageIndex],
    [key]: value
  }
  
  emit('update:advancedConfig', {
    ...props.advancedConfig,
    stages: newStages
  })
}

/**
 * 更新敌人全局配置
 */
function updateEnemyGlobalConfig(key: string, value: number) {
  if (!props.advancedConfig) return
  
  emit('update:advancedConfig', {
    ...props.advancedConfig,
    enemies: {
      ...props.advancedConfig.enemies,
      [key]: value
    }
  })
}

/**
 * 更新敌人类型配置
 */
function updateEnemyTypeConfig(enemyType: string, key: string, value: any) {
  if (!props.advancedConfig?.enemies?.types) return
  
  const currentType = props.advancedConfig.enemies.types[enemyType as EnemyType]
  if (!currentType) return
  
  emit('update:advancedConfig', {
    ...props.advancedConfig,
    enemies: {
      ...props.advancedConfig.enemies,
      types: {
        ...props.advancedConfig.enemies.types,
        [enemyType]: {
          ...currentType,
          [key]: value
        }
      }
    }
  })
}

/**
 * 切换敌人类型启用状态（通过设置 health 为 0 或恢复默认值）
 */
function toggleEnemyType(enemyType: string, enabled: boolean) {
  if (!props.advancedConfig?.enemies?.types || !props.defaultAdvancedConfig?.enemies?.types) return
  
  const defaultType = props.defaultAdvancedConfig.enemies.types[enemyType as EnemyType]
  if (!defaultType) return
  
  const newHealth = enabled ? defaultType.health : 0
  updateEnemyTypeConfig(enemyType, 'health', newHealth)
}

/**
 * 检查敌人类型是否启用
 */
function isEnemyTypeEnabled(enemyType: string): boolean {
  const typeConfig = props.advancedConfig?.enemies?.types?.[enemyType as EnemyType]
  return typeConfig ? typeConfig.health > 0 : false
}

// 配置项定义
const configItems = [
  {
    key: 'playerInitialHealth' as const,
    label: '玩家初始生命值',
    description: '玩家开始游戏时的生命值',
    min: 1,
    max: 100,
    step: 1,
    unit: ''
  },
  {
    key: 'playerInitialSpeed' as const,
    label: '玩家初始速度',
    description: '玩家移动的基础速度',
    min: 1,
    max: 20,
    step: 1,
    unit: ''
  },
  {
    key: 'nukeMaxProgress' as const,
    label: '核弹进度条最大值',
    description: '核弹技能充能所需的进度值',
    min: 10,
    max: 500,
    step: 10,
    unit: ''
  },
  {
    key: 'enemySpawnRate' as const,
    label: '敌人生成速率',
    description: '敌人生成的时间间隔',
    min: 500,
    max: 10000,
    step: 100,
    unit: '毫秒'
  },
  {
    key: 'stageTotalEnemies' as const,
    label: '关卡敌人总数',
    description: '每个关卡需要击败的敌人数量',
    min: 10,
    max: 200,
    step: 5,
    unit: '个'
  }
]
</script>

<template>
  <div class="basic-config-panel">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span class="title">基础参数配置</span>
          <span class="subtitle">调整游戏的核心参数</span>
        </div>
      </template>
      
      <el-form label-position="top">
        <el-row :gutter="24">
          <el-col
            v-for="item in configItems"
            :key="item.key"
            :span="12"
          >
            <el-form-item>
              <template #label>
                <div class="form-label">
                  <span :class="{ modified: isModified(item.key) }">
                    {{ item.label }}
                  </span>
                  <el-tooltip :content="item.description" placement="top">
                    <el-icon class="help-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </div>
              </template>
              
              <div class="input-wrapper">
                <el-input-number
                  :model-value="config[item.key]"
                  @update:model-value="(val) => updateConfig(item.key, val as number)"
                  :min="item.min"
                  :max="item.max"
                  :step="item.step"
                  :class="{ modified: isModified(item.key) }"
                  style="width: 100%"
                />
                <span v-if="item.unit" class="unit">{{ item.unit }}</span>
              </div>
              
              <div class="default-tip" v-if="isModified(item.key)">
                {{ getDefaultTip(item.key) }}
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
    
    <!-- 扩展配置区域 -->
    <el-collapse v-model="activeNames" class="extended-config">
      <!-- 分关卡配置 - 需求 10.1 -->
      <el-collapse-item title="分关卡配置" name="stages" v-if="stagesData.length > 0">
        <template #title>
          <span class="collapse-title">分关卡配置</span>
          <span class="collapse-desc">调整各关卡的敌人数量和生成速率</span>
        </template>
        <div class="stage-config-list">
          <div v-for="(stage, index) in stagesData" :key="stage.id" class="stage-config-item">
            <div class="stage-header">
              <el-tag type="info" size="small">第 {{ stage.id }} 关</el-tag>
              <span class="stage-name">{{ stage.name }}</span>
            </div>
            <el-row :gutter="16">
              <el-col :span="8">
                <el-form-item label="敌人总数">
                  <el-input-number
                    :model-value="stage.totalEnemies"
                    @update:model-value="(v) => updateStageConfig(index, 'totalEnemies', v)"
                    :min="5" :max="200" :step="5"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="生成速率 (ms)">
                  <el-input-number
                    :model-value="stage.spawnRate"
                    @update:model-value="(v) => updateStageConfig(index, 'spawnRate', v)"
                    :min="500" :max="10000" :step="100"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="Boss 类型">
                  <el-tag type="danger" size="small">
                    {{ enemyTypeNames[stage.bossType] || stage.bossType }}
                  </el-tag>
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-collapse-item>
      
      <!-- 敌我双方参数配置 - 需求 10.2 -->
      <el-collapse-item title="敌我双方参数" name="multipliers" v-if="advancedConfig?.enemies">
        <template #title>
          <span class="collapse-title">敌我双方参数</span>
          <span class="collapse-desc">调整敌人全局倍率</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="精英怪倍率">
              <el-slider
                :model-value="advancedConfig?.enemies?.eliteMultiplier ?? 1.5"
                @update:model-value="(v) => updateEnemyGlobalConfig('eliteMultiplier', v as number)"
                :min="1" :max="5" :step="0.1"
                show-input
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Boss 倍率">
              <el-slider
                :model-value="advancedConfig?.enemies?.bossMultiplier ?? 3"
                @update:model-value="(v) => updateEnemyGlobalConfig('bossMultiplier', v as number)"
                :min="1" :max="10" :step="0.5"
                show-input
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最终 Boss 倍率">
              <el-slider
                :model-value="advancedConfig?.enemies?.finalBossMultiplier ?? 5"
                @update:model-value="(v) => updateEnemyGlobalConfig('finalBossMultiplier', v as number)"
                :min="1" :max="20" :step="1"
                show-input
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-collapse-item>
      
      <!-- 敌人单体参数配置 - 需求 10.3 -->
      <el-collapse-item title="敌人单体参数" name="enemyTypes" v-if="enemyTypesEntries.length > 0">
        <template #title>
          <span class="collapse-title">敌人单体参数</span>
          <span class="collapse-desc">调整各类型敌人的属性</span>
        </template>
        <div class="enemy-type-list">
          <div v-for="[type, config] in enemyTypesEntries" :key="type" class="enemy-type-item">
            <div class="enemy-type-header">
              <el-switch
                :model-value="isEnemyTypeEnabled(type)"
                @update:model-value="(v) => toggleEnemyType(type, v as boolean)"
                size="small"
              />
              <el-tag 
                :type="type === 'red' ? 'danger' : type === 'green' ? 'success' : type === 'blue' ? 'primary' : 'warning'" 
                size="small"
              >
                {{ enemyTypeNames[type] || type }}
              </el-tag>
            </div>
            <el-row :gutter="12" v-if="isEnemyTypeEnabled(type)">
              <el-col :span="6">
                <el-form-item label="血量" size="small">
                  <el-input-number
                    :model-value="config.health"
                    @update:model-value="(v) => updateEnemyTypeConfig(type, 'health', v)"
                    :min="1" :max="100" :step="1"
                    size="small"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="速度" size="small">
                  <el-input-number
                    :model-value="config.speed"
                    @update:model-value="(v) => updateEnemyTypeConfig(type, 'speed', v)"
                    :min="1" :max="10" :step="1"
                    size="small"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="攻击力" size="small">
                  <el-input-number
                    :model-value="config.attackPower"
                    @update:model-value="(v) => updateEnemyTypeConfig(type, 'attackPower', v)"
                    :min="1" :max="50" :step="1"
                    size="small"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <div class="enemy-weapons">
                  <el-tag v-if="config.machineGun" type="success" size="small">机炮</el-tag>
                  <el-tag v-if="config.missileLauncher" type="danger" size="small">导弹</el-tag>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
        
        <!-- 新增敌人类型入口 - 需求 10.4 -->
        <el-divider />
        <div class="add-enemy-type">
          <el-button type="primary" plain @click="emit('addEnemyType')">
            <el-icon><Plus /></el-icon>
            新增敌人类型
          </el-button>
          <span class="add-tip">在高级配置中添加新的敌人类型</span>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style lang="scss" scoped>
.basic-config-panel {
  .config-card {
    :deep(.el-card__header) {
      padding: 16px 20px;
      background: var(--bg-color-page);
    }
  }
  
  .card-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .subtitle {
      font-size: 13px;
      color: var(--text-secondary);
    }
  }
  
  .form-label {
    display: flex;
    align-items: center;
    gap: 6px;
    
    .modified {
      color: #E6A23C;
      font-weight: 500;
      
      &::after {
        content: '*';
        margin-left: 2px;
      }
    }
    
    .help-icon {
      font-size: 14px;
      color: var(--text-secondary);
      cursor: help;
    }
  }
  
  .input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .unit {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
    }
  }
  
  .default-tip {
    font-size: 12px;
    color: #E6A23C;
    margin-top: 4px;
  }
  
  :deep(.el-input-number) {
    &.modified {
      .el-input__wrapper {
        box-shadow: 0 0 0 1px #E6A23C inset;
      }
    }
  }
  
  // 扩展配置区域样式
  .extended-config {
    margin-top: 20px;
    
    :deep(.el-collapse-item__header) {
      height: 48px;
      line-height: 48px;
      padding: 0 16px;
      background: var(--bg-color-page);
      
      &:hover {
        background: var(--table-row-hover-bg);
      }
    }
    
    :deep(.el-collapse-item__content) {
      padding: 16px;
    }
    
    .collapse-title {
      font-weight: 600;
      color: var(--text-primary);
      margin-right: 12px;
    }
    
    .collapse-desc {
      font-size: 13px;
      color: var(--text-secondary);
    }
  }
  
  // 分关卡配置样式
  .stage-config-list {
    .stage-config-item {
      padding: 12px;
      margin-bottom: 12px;
      background: var(--bg-color-page);
      border-radius: 6px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .stage-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        
        .stage-name {
          font-weight: 500;
          color: var(--text-primary);
        }
      }
    }
  }
  
  // 敌人类型配置样式
  .enemy-type-list {
    .enemy-type-item {
      padding: 12px;
      margin-bottom: 12px;
      background: var(--bg-color-page);
      border-radius: 6px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .enemy-type-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .enemy-weapons {
        display: flex;
        gap: 4px;
        align-items: center;
        height: 100%;
        padding-top: 24px;
      }
    }
  }
  
  // 新增敌人类型入口样式
  .add-enemy-type {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .add-tip {
      font-size: 13px;
      color: var(--text-secondary);
    }
  }
}
</style>
