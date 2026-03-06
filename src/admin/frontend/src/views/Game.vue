<script setup lang="ts">
/**
 * 游戏管理页面
 * 使用 Tab 组织排行榜、成就、配置
 * 
 * 需求: 6.1.1-6.6.4
 */
import { ref, reactive } from 'vue'
import {
  ElTabs,
  ElTabPane,
  ElMessage,
  ElMessageBox,
  ElButton,
  ElIcon,
  ElSwitch,
  ElCard,
  ElRow,
  ElCol,
  ElDivider,
  ElUpload
} from 'element-plus'

import {
  Trophy,
  Medal,
  Setting,
  Refresh,
  Download,
  Upload,
  VideoPlay
} from '@element-plus/icons-vue'
import {
  LeaderboardTable,
  AchievementList,
  BasicConfigPanel,
  AdvancedConfigPanel,
  ConfigDiff
} from '@/components/game'
import {
  getGameConfig,
  updateGameConfig,
  resetGameConfig,
  getDefaultConfig,
  setGameEnabled,
  setDebugMode,
  exportConfig,
  importConfig,
  type GameConfig,
  type GameConfigRecord
} from '@/api/game'

// 当前激活的标签页
const activeTab = ref('leaderboard')

// ========== 游戏配置状态 ==========

// 配置数据
const configRecord = ref<GameConfigRecord | null>(null)
const defaultConfig = ref<GameConfig | null>(null)
const configLoading = ref(false)
const saveLoading = ref(false)

// 本地编辑的配置
const localConfig = reactive<{
  basic: GameConfig['basic']
  advanced: GameConfig['advanced']
}>({
  basic: {
    playerInitialHealth: 10,
    playerInitialSpeed: 5,
    nukeMaxProgress: 100,
    enemySpawnRate: 3000,
    stageTotalEnemies: 50
  },
  advanced: {} as GameConfig['advanced']
})

// 游戏开关状态
const gameEnabled = ref(true)
const debugMode = ref(false)

// 显示高级参数开关
const showAdvanced = ref(false)

/**
 * 加载游戏配置
 */
async function loadGameConfig() {
  configLoading.value = true
  try {
    const [configRes, defaultRes] = await Promise.all([
      getGameConfig(),
      getDefaultConfig()
    ])
    
    const record = (configRes as any).config as GameConfigRecord
    configRecord.value = record
    defaultConfig.value = (defaultRes as any).config as GameConfig
    
    // 更新本地配置
    localConfig.basic = { ...record.config.basic }
    localConfig.advanced = JSON.parse(JSON.stringify(record.config.advanced))
    
    // 更新开关状态
    gameEnabled.value = record.enabled
    debugMode.value = record.debug_mode
  } catch (error) {
    console.error('加载游戏配置失败:', error)
    ElMessage.error('加载游戏配置失败')
  } finally {
    configLoading.value = false
  }
}

/**
 * 保存游戏配置
 */
async function handleSaveConfig() {
  saveLoading.value = true
  try {
    const config: GameConfig = {
      basic: localConfig.basic,
      advanced: localConfig.advanced
    }
    
    await updateGameConfig(config)
    ElMessage.success('配置保存成功')
    await loadGameConfig()
  } catch (error: any) {
    console.error('保存配置失败:', error)
    ElMessage.error(error.message || '保存配置失败')
  } finally {
    saveLoading.value = false
  }
}

/**
 * 恢复默认配置
 */
async function handleResetConfig() {
  try {
    await ElMessageBox.confirm(
      '确定要恢复默认配置吗？当前的所有修改将被覆盖。',
      '恢复默认配置',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    saveLoading.value = true
    await resetGameConfig()
    ElMessage.success('已恢复默认配置')
    await loadGameConfig()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复默认配置失败:', error)
      ElMessage.error('恢复默认配置失败')
    }
  } finally {
    saveLoading.value = false
  }
}

/**
 * 切换游戏开关
 */
async function handleToggleGame(enabled: boolean | string | number) {
  const enabledBool = Boolean(enabled)
  try {
    await setGameEnabled(enabledBool)
    gameEnabled.value = enabledBool
    ElMessage.success(enabledBool ? '游戏已启用' : '游戏已禁用')
  } catch (error) {
    console.error('切换游戏开关失败:', error)
    ElMessage.error('操作失败')
    // 恢复原状态
    gameEnabled.value = !enabledBool
  }
}

/**
 * 切换调试模式
 */
async function handleToggleDebug(enabled: boolean | string | number) {
  const enabledBool = Boolean(enabled)
  try {
    await setDebugMode(enabledBool)
    debugMode.value = enabledBool
    ElMessage.success(enabledBool ? '调试模式已开启' : '调试模式已关闭')
  } catch (error) {
    console.error('切换调试模式失败:', error)
    ElMessage.error('操作失败')
    // 恢复原状态
    debugMode.value = !enabledBool
  }
}

/**
 * 导出配置
 */
async function handleExportConfig() {
  try {
    const res = await exportConfig(true) as any
    const blob = new Blob([res], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `game-config-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('配置导出成功')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

/**
 * 导入配置
 */
async function handleImportConfig(file: File) {
  try {
    const text = await file.text()
    const config = JSON.parse(text)
    await importConfig(config)
    ElMessage.success('配置导入成功')
    await loadGameConfig()
  } catch (e: any) {
    ElMessage.error(e.message || '导入失败，请检查文件格式')
  }
  return false
}
</script>

<template>
  <div class="game-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>游戏管理</h2>
      <p class="page-desc">管理彩蛋游戏的数据和配置</p>
    </div>
    
    <!-- 标签页 -->
    <el-tabs v-model="activeTab" @tab-change="(tab) => { if (tab === 'config') loadGameConfig() }">
      <!-- 排行榜管理 -->
      <el-tab-pane name="leaderboard">
        <template #label>
          <span class="tab-label">
            <el-icon><Trophy /></el-icon>
            排行榜管理
          </span>
        </template>
        <LeaderboardTable />
      </el-tab-pane>
      
      <!-- 成就管理 -->
      <el-tab-pane name="achievement">
        <template #label>
          <span class="tab-label">
            <el-icon><Medal /></el-icon>
            成就管理
          </span>
        </template>
        <AchievementList />
      </el-tab-pane>
      
      <!-- 游戏配置 -->
      <el-tab-pane name="config">
        <template #label>
          <span class="tab-label">
            <el-icon><Setting /></el-icon>
            游戏配置
          </span>
        </template>
        
        <div class="config-container" v-loading="configLoading">
          <!-- 游戏开关区域 -->
          <el-card shadow="never" class="switch-card">
            <el-row :gutter="24" align="middle">
              <el-col :span="8">
                <div class="switch-item">
                  <div class="switch-info">
                    <el-icon :class="{ active: gameEnabled }"><VideoPlay /></el-icon>
                    <div class="switch-text">
                      <span class="switch-label">游戏开关</span>
                      <span class="switch-desc">启用或禁用彩蛋游戏</span>
                    </div>
                  </div>
                  <el-switch
                    v-model="gameEnabled"
                    @change="handleToggleGame"
                    active-text="启用"
                    inactive-text="禁用"
                  />
                </div>
              </el-col>
              <el-col :span="8">
                <div class="switch-item">
                  <div class="switch-info">
                    <el-icon :class="{ active: debugMode }"><Setting /></el-icon>
                    <div class="switch-text">
                      <span class="switch-label">调试模式</span>
                      <span class="switch-desc">显示碰撞框、FPS 等调试信息</span>
                    </div>
                  </div>
                  <el-switch
                    v-model="debugMode"
                    @change="handleToggleDebug"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </div>
              </el-col>
              <el-col :span="8">
                <div class="switch-item">
                  <div class="switch-info">
                    <el-icon :class="{ active: showAdvanced }"><Setting /></el-icon>
                    <div class="switch-text">
                      <span class="switch-label">显示高级参数</span>
                      <span class="switch-desc">展开所有高级配置选项</span>
                    </div>
                  </div>
                  <el-switch
                    v-model="showAdvanced"
                    active-text="显示"
                    inactive-text="隐藏"
                  />
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 工具栏 -->
          <div class="config-toolbar">
            <div class="toolbar-left">
              <el-button type="primary" :loading="saveLoading" @click="handleSaveConfig">
                保存配置
              </el-button>
              <el-button @click="loadGameConfig" :loading="configLoading">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button type="warning" @click="handleResetConfig">
                恢复默认值
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-button @click="handleExportConfig">
                <el-icon><Download /></el-icon>
                导出配置
              </el-button>
              <el-upload
                :show-file-list="false"
                accept=".json"
                :before-upload="handleImportConfig"
              >
                <el-button>
                  <el-icon><Upload /></el-icon>
                  导入配置
                </el-button>
              </el-upload>
            </div>
          </div>
          
          <!-- 基础配置面板 -->
          <BasicConfigPanel
            v-if="defaultConfig"
            v-model="localConfig.basic"
            :default-config="defaultConfig.basic"
          />
          
          <!-- 高级配置面板 -->
          <div v-if="showAdvanced && defaultConfig" class="advanced-section">
            <el-divider content-position="left">高级参数配置</el-divider>
            <AdvancedConfigPanel
              v-model="localConfig.advanced"
              :default-config="defaultConfig.advanced"
            />
          </div>
          
          <!-- 配置差异显示 -->
          <div v-if="defaultConfig" class="diff-section">
            <el-divider content-position="left">配置差异</el-divider>
            <ConfigDiff
              :current-config="{ basic: localConfig.basic, advanced: localConfig.advanced }"
              :default-config="defaultConfig"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.game-container {
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

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.config-container {
  min-height: 400px;
}

.switch-card {
  margin-bottom: 20px;
  
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
  
  .switch-info {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .el-icon {
      font-size: 24px;
      color: var(--text-secondary);
      
      &.active {
        color: var(--success-color);
      }
    }
    
    .switch-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .switch-label {
        font-weight: 500;
        color: var(--text-primary);
      }
      
      .switch-desc {
        font-size: 12px;
        color: var(--text-secondary);
      }
    }
  }
}

.config-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-color-page);
  border-radius: 8px;
  
  .toolbar-left,
  .toolbar-right {
    display: flex;
    gap: 12px;
  }
}

.advanced-section {
  margin-top: 24px;
}

.diff-section {
  margin-top: 24px;
}

:deep(.el-divider__text) {
  font-weight: 600;
  color: var(--text-regular);
}
</style>
