# 彩蛋游戏功能需求文档

## 简介

本功能为个人作品集网站添加一个隐藏的彩蛋游戏。当用户在5秒内点击首页头像3次时，触发页面崩塌动画，随后进入一个复古像素风格的飞机大战游戏。游戏包含完整的战斗系统、升级机制、关卡设计和通关庆祝页面。

## 术语表

- **彩蛋触发器（Easter Egg Trigger）**: 检测用户在5秒内点击头像3次的机制
- **页面崩塌动画（Page Collapse Animation）**: 页面元素碎裂、融化、撕裂的视觉效果
- **CMD窗口（CMD Window）**: 模拟命令行界面的交互窗口
- **游戏引擎（Game Engine）**: 管理游戏循环、碰撞检测、渲染的核心系统
- **玩家飞机（Player Aircraft）**: 用户控制的游戏角色
- **敌人实体（Enemy Entity）**: 由技术栈词组组成的敌对单位
- **升级模块（Upgrade Module）**: 可拾取的能力提升道具
- **核弹系统（Nuclear Bomb System）**: 清屏技能及其进度条机制
- **关卡系统（Stage System）**: 三个不同场景和难度的游戏关卡
- **庆祝页面（Celebration Page）**: 通关后的互动庆祝界面

## 需求

### 需求 1: 彩蛋触发机制

**用户故事**: 作为网站访问者，我想通过特定操作触发隐藏彩蛋，以发现网站的趣味内容。

#### 验收标准

1. WHEN 用户在首页点击头像 THEN 系统 SHALL 记录点击时间戳
2. WHEN 用户在5秒内累计点击头像3次 THEN 系统 SHALL 触发页面崩塌动画
3. WHEN 用户点击头像但未在5秒内达到3次 THEN 系统 SHALL 重置点击计数器
4. WHEN 彩蛋被触发 THEN 系统 SHALL 阻止页面的正常交互功能
5. WHEN 彩蛋触发后 THEN 系统 SHALL 保存当前页面状态以便恢复

### 需求 2: 页面崩塌动画效果

**用户故事**: 作为用户，我想看到震撼的页面崩塌效果，以获得独特的视觉体验。

#### 验收标准

1. WHEN 崩塌动画开始 THEN 系统 SHALL 将文字元素分割成碎片并施加重力效果
2. WHEN 文字碎片下落时 THEN 系统 SHALL 应用随机旋转和速度变化
3. WHEN 崩塌动画进行中 THEN 系统 SHALL 对非文字元素应用融化效果
4. WHEN 融化效果执行时 THEN 系统 SHALL 使元素逐渐变形并向下流动
5. WHEN 元素崩塌时 THEN 系统 SHALL 在背景中心创建撕裂效果
6. WHEN 撕裂效果完成 THEN 系统 SHALL 用黑色填充整个页面
7. WHEN 黑色填充完成 THEN 系统 SHALL 显示CMD窗口界面
8. WHEN 崩塌动画的任意阶段 THEN 系统 SHALL 保持60fps的流畅度

### 需求 3: CMD交互窗口

**用户故事**: 作为用户，我想通过CMD风格的界面选择是否进入游戏，以控制我的体验流程。

#### 验收标准

1. WHEN CMD窗口显示 THEN 系统 SHALL 呈现黑色背景、绿色文字的命令行样式
2. WHEN CMD窗口出现 THEN 系统 SHALL 显示提示文本"是否来玩个游戏？是y/否n"
3. WHEN 用户在CMD窗口中输入"y" THEN 系统 SHALL 关闭CMD窗口并启动游戏
4. WHEN 用户在CMD窗口中输入"n" THEN 系统 SHALL 恢复页面到正常首页状态
5. WHEN 用户输入无效字符 THEN 系统 SHALL 显示错误提示并要求重新输入
6. WHEN CMD窗口接收输入 THEN 系统 SHALL 模拟打字机效果显示字符

### 需求 4: 游戏核心引擎

**用户故事**: 作为开发者，我需要一个稳定的游戏引擎，以支持流畅的游戏体验。

#### 验收标准

1. WHEN 游戏启动 THEN 系统 SHALL 初始化游戏循环以60fps运行
2. WHEN 游戏运行时 THEN 系统 SHALL 在每帧更新所有游戏实体的位置和状态
3. WHEN 游戏运行时 THEN 系统 SHALL 检测所有实体之间的碰撞
4. WHEN 检测到碰撞 THEN 系统 SHALL 触发相应的碰撞处理逻辑
5. WHEN 游戏运行时 THEN 系统 SHALL 渲染所有可见的游戏元素
6. WHEN 游戏暂停或结束 THEN 系统 SHALL 停止游戏循环并清理资源

### 需求 5: 玩家飞机控制系统

**用户故事**: 作为玩家，我想使用键盘控制飞机移动和攻击，以进行游戏操作。

#### 验收标准

1. WHEN 玩家按下WASD键 THEN 系统 SHALL 以速度5移动飞机到对应方向
2. WHEN 玩家按下J键 THEN 系统 SHALL 发射机炮子弹
3. WHEN 玩家长按J键 THEN 系统 SHALL 每3000ms自动发射一次子弹
4. WHEN 玩家按下K键 THEN 系统 SHALL 从机翼发射导弹（如果有剩余导弹）
5. WHEN 玩家按下空格键且核弹进度条已满 THEN 系统 SHALL 释放核弹清屏
6. WHEN 飞机移动到边界 THEN 系统 SHALL 限制飞机不超出游戏窗口范围
7. WHEN 玩家释放按键 THEN 系统 SHALL 停止对应的移动或攻击动作

### 需求 6: 机炮武器系统

**用户故事**: 作为玩家，我想使用机炮攻击敌人，并通过升级提升火力。

#### 验收标准

1. WHEN 游戏开始 THEN 系统 SHALL 初始化机炮为单发、伤害2、速度20
2. WHEN 机炮发射 THEN 系统 SHALL 创建子弹实体并向上移动
3. WHEN 子弹击中敌人 THEN 系统 SHALL 对敌人造成对应伤害值
4. WHEN 子弹超出屏幕范围 THEN 系统 SHALL 销毁子弹实体
5. WHEN 玩家拾取"增加子弹数量"升级 THEN 系统 SHALL 每次发射增加一枚子弹
6. WHEN 玩家拾取"增加弹道"升级 THEN 系统 SHALL 在原弹道旁边交替增加新弹道
7. WHEN 玩家拾取"减少间隔"升级 THEN 系统 SHALL 将长按发射间隔减少100ms
8. WHEN 玩家拾取"增加伤害"升级 THEN 系统 SHALL 将每枚子弹伤害增加1
9. WHEN 玩家拾取"增加速度"升级 THEN 系统 SHALL 将子弹飞行速度增加2

### 需求 7: 导弹武器系统

**用户故事**: 作为玩家，我想使用导弹进行范围攻击，以应对密集敌群。

#### 验收标准

1. WHEN 游戏开始 THEN 系统 SHALL 初始化导弹数量为10枚
2. WHEN 导弹发射 THEN 系统 SHALL 从机翼两端交替发射
3. WHEN 导弹击中目标 THEN 系统 SHALL 对3x3范围内所有实体造成伤害5
4. WHEN 导弹爆炸范围包含玩家 THEN 系统 SHALL 对玩家造成伤害5
5. WHEN 导弹数量为0 THEN 系统 SHALL 禁止发射导弹
6. WHEN 玩家拾取"增加导弹数"升级 THEN 系统 SHALL 增加2枚导弹
7. WHEN 玩家拾取"增加导弹伤害"升级 THEN 系统 SHALL 将导弹伤害增加3
8. WHEN 玩家拾取"增加导弹速度"升级 THEN 系统 SHALL 将导弹速度增加1

### 需求 8: 核弹系统

**用户故事**: 作为玩家，我想积累能量释放核弹清屏，以应对危机时刻。

#### 验收标准

1. WHEN 游戏开始 THEN 系统 SHALL 初始化核弹进度条为0/100
2. WHEN 玩家击杀敌人 THEN 系统 SHALL 增加核弹进度1点
3. WHEN 核弹进度达到100 THEN 系统 SHALL 允许玩家释放核弹
4. WHEN 核弹进度已满且继续击杀敌人 THEN 系统 SHALL 不再增加进度
5. WHEN 玩家释放核弹 THEN 系统 SHALL 清除屏幕上所有敌人和敌方子弹
6. WHEN 核弹释放 THEN 系统 SHALL 在屏幕中心显示蘑菇云动画效果
7. WHEN 核弹释放后 THEN 系统 SHALL 将进度条重置为0/100

### 需求 9: 敌人生成与AI系统

**用户故事**: 作为游戏设计者，我需要智能的敌人系统，以提供挑战性的游戏体验。

#### 验收标准

1. WHEN 关卡开始 THEN 系统 SHALL 根据关卡配置生成对应类型和数量的敌人
2. WHEN 敌人生成 THEN 系统 SHALL 从屏幕顶端随机位置出现
3. WHEN 敌人存活 THEN 系统 SHALL 实时追踪玩家飞机位置
4. WHEN 敌人追踪玩家 THEN 系统 SHALL 根据敌人速度属性移动
5. WHEN 敌人具有攻击能力 THEN 系统 SHALL 按照攻击间隔发射子弹或导弹
6. WHEN 敌人碰撞玩家 THEN 系统 SHALL 对玩家造成等于敌人剩余血量的伤害
7. WHEN 敌人碰撞玩家后 THEN 系统 SHALL 销毁该敌人实体
8. WHEN 敌人血量归零 THEN 系统 SHALL 销毁敌人并触发掉落判定

### 需求 10: 敌人类型与属性系统

**用户故事**: 作为玩家，我想面对不同颜色和强度的敌人，以体验多样化的战斗。

#### 验收标准

1. WHEN 生成白色敌人 THEN 系统 SHALL 设置血量2、速度2、初始机炮攻击
2. WHEN 生成绿色敌人 THEN 系统 SHALL 设置血量5、速度2、初始机炮攻击
3. WHEN 生成蓝色敌人 THEN 系统 SHALL 设置血量8、速度2、伤害+1的机炮攻击
4. WHEN 生成紫色敌人 THEN 系统 SHALL 设置血量8、速度3、3发+伤害+1+速度+2的机炮
5. WHEN 生成黄色敌人 THEN 系统 SHALL 设置血量6、速度6、伤害+1的机炮攻击
6. WHEN 生成橙色敌人 THEN 系统 SHALL 设置血量12、速度2、3发+伤害+1+2弹道的机炮
7. WHEN 生成红色敌人 THEN 系统 SHALL 设置血量20、速度1、每2秒导弹+5发+伤害+1+2弹道机炮
8. WHEN 生成精英怪 THEN 系统 SHALL 将字体大小设为1.2倍、所有属性设为1.5倍
9. WHEN 生成关底Boss THEN 系统 SHALL 将字体大小设为1.5倍、所有属性设为2倍
10. WHEN 生成最终Boss THEN 系统 SHALL 将字体大小设为2倍、所有属性设为5倍、颜色为红色

### 需求 11: 掉落物系统

**用户故事**: 作为玩家，我想通过击杀敌人获得升级道具，以增强战斗能力。

#### 验收标准

1. WHEN 敌人被击杀 THEN 系统 SHALL 以20%概率掉落机炮升级模块
2. WHEN 敌人被击杀 THEN 系统 SHALL 以10%概率掉落导弹升级模块
3. WHEN 敌人被击杀 THEN 系统 SHALL 以25%概率掉落维修组件
4. WHEN 敌人被击杀 THEN 系统 SHALL 以10%概率掉落引擎组件
5. WHEN 掉落物生成 THEN 系统 SHALL 在敌人死亡位置创建掉落物实体
6. WHEN 掉落物存在 THEN 系统 SHALL 缓慢向下飘落
7. WHEN 玩家飞机接触掉落物 THEN 系统 SHALL 应用对应升级效果并销毁掉落物
8. WHEN 掉落物超出屏幕底部 THEN 系统 SHALL 销毁掉落物实体
9. WHEN 机炮升级模块被拾取 THEN 系统 SHALL 随机选择一种机炮升级类型应用
10. WHEN 导弹升级模块被拾取 THEN 系统 SHALL 随机选择一种导弹升级类型应用
11. WHEN 维修组件被拾取 THEN 系统 SHALL 增加玩家血量1点
12. WHEN 引擎组件被拾取 THEN 系统 SHALL 增加玩家移动速度1点

### 需求 12: 关卡系统

**用户故事**: 作为玩家，我想体验不同场景和难度的关卡，以获得递进的游戏体验。

#### 验收标准

1. WHEN 游戏开始 THEN 系统 SHALL 加载第一关（家里场景）
2. WHEN 第一关进行中 THEN 系统 SHALL 生成50个敌人（白、绿、蓝、紫Boss）
3. WHEN 第一关进行中 THEN 系统 SHALL 以低频率刷新敌人
4. WHEN 第一关所有敌人被消灭 THEN 系统 SHALL 进入第二关
5. WHEN 第二关进行中 THEN 系统 SHALL 加载学校场景背景
6. WHEN 第二关进行中 THEN 系统 SHALL 生成70个敌人（白、绿、蓝、紫、黄、橙Boss）
7. WHEN 第二关进行中 THEN 系统 SHALL 以普通频率刷新敌人
8. WHEN 第二关所有敌人被消灭 THEN 系统 SHALL 进入第三关
9. WHEN 第三关进行中 THEN 系统 SHALL 加载公司场景背景
10. WHEN 第三关进行中 THEN 系统 SHALL 生成80个敌人（紫、黄、橙、红）
11. WHEN 第三关进行中 THEN 系统 SHALL 以较高频率刷新敌人
12. WHEN 第三关最终Boss被击败 THEN 系统 SHALL 进入庆祝页面
13. WHEN 关卡切换时 THEN 系统 SHALL 保留玩家的所有升级和道具

### 需求 13: 玩家生命系统

**用户故事**: 作为玩家，我需要管理生命值，以在游戏中生存。

#### 验收标准

1. WHEN 游戏开始 THEN 系统 SHALL 初始化玩家血量为10
2. WHEN 玩家受到伤害 THEN 系统 SHALL 减少对应的血量值
3. WHEN 玩家血量大于0 THEN 系统 SHALL 在界面显示当前血量
4. WHEN 玩家血量降至0 THEN 系统 SHALL 触发游戏结束流程
5. WHEN 游戏结束 THEN 系统 SHALL 显示游戏结束画面
6. WHEN 游戏结束后 THEN 系统 SHALL 恢复页面到正常首页状态

### 需求 14: 游戏UI系统

**用户故事**: 作为玩家，我想看到清晰的游戏信息显示，以了解当前状态。

#### 验收标准

1. WHEN 游戏运行时 THEN 系统 SHALL 在界面顶部显示当前血量
2. WHEN 游戏运行时 THEN 系统 SHALL 在界面顶部显示当前关卡
3. WHEN 游戏运行时 THEN 系统 SHALL 在界面顶部显示剩余敌人数量
4. WHEN 游戏运行时 THEN 系统 SHALL 在界面顶部显示剩余导弹数量
5. WHEN 游戏运行时 THEN 系统 SHALL 在界面底部显示核弹进度条
6. WHEN 游戏开始时 THEN 系统 SHALL 显示操作提示（WASD移动、J机炮、K导弹、空格核弹）
7. WHEN 操作提示显示3秒后 THEN 系统 SHALL 淡出隐藏提示信息

### 需求 15: 庆祝页面交互系统

**用户故事**: 作为通关玩家，我想在庆祝页面进行互动，以享受胜利的喜悦。

#### 验收标准

1. WHEN 进入庆祝页面 THEN 系统 SHALL 在页面两侧依次显示气球
2. WHEN 用户点击气球 THEN 系统 SHALL 播放爆炸动画并释放彩片
3. WHEN 进入庆祝页面 THEN 系统 SHALL 在页面两侧依次显示礼花
4. WHEN 用户点击礼花 THEN 系统 SHALL 播放礼花释放动画
5. WHEN 进入庆祝页面 THEN 系统 SHALL 在页面中央显示多层蛋糕
6. WHEN 用户首次点击蛋糕 THEN 系统 SHALL 点亮蛋糕上的蜡烛
7. WHEN 蜡烛点亮1秒后用户再次点击蛋糕 THEN 系统 SHALL 显示贺卡弹窗
8. WHEN 进入庆祝页面 THEN 系统 SHALL 在页面上方显示庆祝横幅
9. WHEN 用户点击横幅 THEN 系统 SHALL 播放横幅随风晃动动画
10. WHEN 进入庆祝页面 THEN 系统 SHALL 在页面下方显示卷起的红毯
11. WHEN 用户点击红毯 THEN 系统 SHALL 播放红毯铺开动画通向蛋糕
12. WHEN 贺卡弹窗显示 THEN 系统 SHALL 显示庆祝通关内容
13. WHEN 用户点击贺卡右下角返回按钮 THEN 系统 SHALL 恢复页面到正常首页状态

### 需求 16: 像素风格渲染系统

**用户故事**: 作为玩家，我想体验复古像素风格的视觉效果，以获得怀旧感。

#### 验收标准

1. WHEN 游戏渲染时 THEN 系统 SHALL 使用像素化的字体渲染所有文本
2. WHEN 游戏渲染时 THEN 系统 SHALL 对所有图形元素应用像素化效果
3. WHEN 游戏渲染时 THEN 系统 SHALL 使用复古的配色方案
4. WHEN 游戏窗口显示 THEN 系统 SHALL 模拟老式街机的边框和装饰
5. WHEN 游戏运行时 THEN 系统 SHALL 使用8位风格的音效（如果实现音效）

### 需求 17: 性能优化

**用户故事**: 作为用户，我期望游戏流畅运行，不影响浏览器性能。

#### 验收标准

1. WHEN 游戏运行时 THEN 系统 SHALL 保持60fps的帧率
2. WHEN 屏幕上实体超过100个 THEN 系统 SHALL 使用对象池优化内存分配
3. WHEN 游戏结束或退出 THEN 系统 SHALL 清理所有游戏资源和事件监听器
4. WHEN 游戏运行时 THEN 系统 SHALL 仅渲染可见区域内的实体
5. WHEN 碰撞检测执行时 THEN 系统 SHALL 使用空间分区算法优化性能

### 需求 18: 数据持久化

**用户故事**: 作为玩家，我希望游戏进度在关卡间保持，以获得连贯体验。

#### 验收标准

1. WHEN 关卡切换时 THEN 系统 SHALL 保存玩家的血量、速度、武器升级状态
2. WHEN 关卡切换时 THEN 系统 SHALL 保存核弹进度条状态
3. WHEN 关卡切换时 THEN 系统 SHALL 保存导弹剩余数量
4. WHEN 玩家死亡或通关 THEN 系统 SHALL 清除所有保存的游戏状态

### 需求 19: 敌人词组内容系统

**用户故事**: 作为开发者，我需要从网站数据中提取技术栈词组作为敌人内容。

#### 验收标准

1. WHEN 游戏初始化 THEN 系统 SHALL 从profile数据中提取技能名称
2. WHEN 游戏初始化 THEN 系统 SHALL 从profile数据中提取课程名称
3. WHEN 游戏初始化 THEN 系统 SHALL 从profile数据中提取项目名称
4. WHEN 生成敌人 THEN 系统 SHALL 随机选择一个词组作为敌人显示内容
5. WHEN 敌人渲染 THEN 系统 SHALL 使用宋体字体显示中文词组

### 需求 20: 错误处理与边界情况

**用户故事**: 作为开发者，我需要处理各种异常情况，以确保系统稳定性。

#### 验收标准

1. WHEN 游戏初始化失败 THEN 系统 SHALL 显示错误信息并恢复正常页面
2. WHEN 浏览器不支持Canvas THEN 系统 SHALL 显示不支持提示
3. WHEN 游戏运行中发生错误 THEN 系统 SHALL 捕获错误、记录日志并优雅退出
4. WHEN 用户在游戏中刷新页面 THEN 系统 SHALL 清理游戏状态并恢复正常页面
5. WHEN 用户调整窗口大小 THEN 系统 SHALL 暂停游戏并提示用户
