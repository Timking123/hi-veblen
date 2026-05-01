# 跨时代个人网站设计文档：沉浸式科幻终端与数字艺术展厅

> 文档版本：v1.0  
> 适用项目：Vue 3 + Vite + Pinia + Vue Router 个人网站重构  
> 核心定位：沉浸式科幻终端与数字艺术展厅  
> 参考方向：Active Theory 的系统级无缝转场、Lusion 的 WebGL 科幻视觉、Henry Heffernan 的 90 年代复古桌面与小游戏交互。

---

## 1. 项目愿景

当前网站需要从传统个人主页升级为一个具备强烈记忆点、电影感、游戏感和技术展示力的互动数字空间。新网站不再以“页面堆叠”的方式展示个人信息，而是将访问过程设计为一次进入未知系统、解锁档案、探索作品、触发彩蛋游戏的沉浸式体验。

目标不是简单回答“我做了什么”，而是通过视觉、交互、声音、转场和系统架构共同表达“我是谁”。

### 1.1 核心关键词

- 深空
- 终端
- 全息
- 档案库
- 故障艺术
- 低频电子脉冲
- 视窗系统
- 90 年代复古桌面
- WebGL 粒子星云
- 电影镜头式转场
- 互动级数字艺术品

### 1.2 体验目标

| 维度 | 目标 |
| --- | --- |
| 第一印象 | 访问即进入“系统初始化”仪式，而非普通网页加载 |
| 视觉气质 | 暗黑、深空、霓虹、全息、低饱和高对比 |
| 交互气质 | 像操作控制终端、科幻仪表盘和复古操作系统 |
| 内容承载 | 履历、项目、摄影、航拍、AI 插件、世界观设定均以“档案模块”呈现 |
| 技术表达 | 通过 Three.js、Shader、GSAP、Pinia、Vue 组件系统展示硬核前端能力 |
| 彩蛋体验 | 从普通网站无缝坍缩到 90 年代电脑桌面小游戏系统 |

---

## 2. 参考网站拆解

### 2.1 Lusion：深邃 WebGL 科幻氛围

Lusion 的关键价值不在于单个页面布局，而在于“视觉引擎优先”的设计方法。背景、光影、粒子、画面扭曲不是装饰，而是品牌气质本身。

可借鉴要点：

- 使用大面积暗色背景承托高亮视觉核心。
- 用 WebGL 动态对象制造空间深度。
- 使用粒子、流体、扭曲、渐隐、辉光建立未知感。
- 让鼠标、滚动和页面状态直接影响视觉场景。
- 图片和文字不孤立展示，而是被包裹在动态场域中。

落地到本项目：

- 首页背景由普通粒子升级为 Three.js 深空星云。
- 项目卡片进入视口时驱动背景粒子聚合成档案坐标。
- 鼠标移动影响星云涡旋中心、噪声场偏移和辉光方向。
- 开场动画使用全息网格、低频扫描线和字符解码。

### 2.2 Active Theory：系统级无缝转场

Active Theory 的核心是“页面不是页面，而是镜头”。所有状态变化都像连续影像，而不是浏览器跳转。

可借鉴要点：

- 页面切换使用统一的全局过渡系统。
- 动画不是局部淡入淡出，而是影响整屏视觉层。
- 切换过程可以包含镜头推进、遮罩、像素化、撕裂、空间扭曲。
- 路由、滚动、鼠标事件和 WebGL 场景统一调度。

落地到本项目：

- 封装全局 Transition Director，接管 Vue Router 切换。
- 在切换前冻结当前视图截图或 WebGL render target。
- 使用 GSAP 时间线串联：输入锁定、遮罩展开、像素溶解、场景重建、内容进入。
- 不再使用简单 slide，而是根据模块语义定义转场类型：档案打开、镜头跃迁、终端重载、桌面启动。

### 2.3 Henry Heffernan：90 年代复古系统与小游戏交互

Henry Heffernan 的启发点是把网页变成一个“可操作的系统”。内容并非传统 section，而是桌面、窗口、应用、文件和任务栏。

可借鉴要点：

- 复古桌面 UI 自带探索欲。
- 窗口可拖拽、最小化、层叠，强化“我在操作一个系统”的感觉。
- 小游戏和彩蛋不只是附属，而是世界观的一部分。
- 低保真像素、CRT 扫描线、窗口边框和启动音效构成记忆点。

落地到本项目：

- 彩蛋从“页面崩塌 → CMD → 游戏”升级为“系统劫持 → 字符加载 → 复古桌面 → 游戏窗口”。
- 桌面中可包含 Resume.exe、Projects.dir、PhotoViewer.app、Terminal.app、Game.exe。
- 游戏作为独立窗口组件运行，支持拖拽、聚焦、最大化、最小化。
- 终端命令可作为隐藏导航入口，例如 `open projects`、`run game`、`decode archive`。

---

## 3. 新网站信息架构

### 3.1 总体结构

新网站采用“双层系统”结构：

1. 主世界：沉浸式科幻数字艺术展厅。
2. 隐藏世界：90 年代复古终端操作系统与小游戏。

```text
App Shell
├─ Initialization / Boot Sequence
├─ Main Cinematic Experience
│  ├─ Home / Signal Landing
│  ├─ About / Identity Archive
│  ├─ Experience / Career Log
│  ├─ Education / Academic Record
│  ├─ Skills / Capability Matrix
│  ├─ Projects / Classified Projects Archive
│  ├─ Project Detail / Deep File Viewer
│  ├─ Gallery / Cinematic Image Showcase
│  └─ Contact / Transmission Console
├─ Global Transition Director
├─ WebGL Visual Engine
├─ Audio Interaction Engine
└─ Easter Egg OS
   ├─ System Hijack Animation
   ├─ Terminal Boot
   ├─ Retro Desktop
   ├─ Window Manager
   ├─ Game Window
   └─ Celebration / Unlock Screen
```

### 3.2 路由建议

| 路由 | 模块名 | 视觉隐喻 | 转场方式 |
| --- | --- | --- | --- |
| `/` | Signal Landing | 深空信号接收站 | 引擎点火 / 星云聚焦 |
| `/about` | Identity Archive | 身份档案 | 档案扫描打开 |
| `/experience` | Career Log | 航行日志 | 时间轴镜头推移 |
| `/education` | Academic Record | 学术数据库 | 数据块重组 |
| `/skills` | Capability Matrix | 能力矩阵 | 节点连线生成 |
| `/projects` | Classified Archive | 机密项目库 | 像素化溶解 |
| `/projects/:id` | Deep File Viewer | 单个项目深度卷宗 | 镜头拉进 |
| `/gallery` | Visual Memory Gallery | 摄影 / 航拍影像舱 | 横向电影胶片滚动 |
| `/contact` | Transmission Console | 通讯终端 | 信号锁定 |
| `/os` 或隐藏触发 | Retro Terminal OS | 90 年代桌面系统 | 系统劫持 |

---

## 4. 视觉系统

### 4.1 色彩体系

整体采用深空黑作为底色，通过高能蓝、离子紫、警戒红和荧光绿建立科技层级。

| Token | 用途 | 建议值 |
| --- | --- | --- |
| `--void-black` | 页面主背景 | `#02030A` |
| `--deep-space` | WebGL 背景渐变 | `#060A18` |
| `--panel-dark` | 控制面板 | `rgba(8, 14, 28, 0.72)` |
| `--cyan-core` | 主高亮 | `#00E5FF` |
| `--violet-pulse` | 次级高亮 | `#8B5CFF` |
| `--plasma-pink` | 强调与危险 | `#FF3DF2` |
| `--terminal-green` | 终端字符 | `#7CFF9B` |
| `--warning-red` | 故障 / 警告 | `#FF3B3B` |
| `--soft-white` | 主文字 | `#EAF7FF` |
| `--muted-slate` | 次级文字 | `#7F8EA3` |

### 4.2 字体体系

| 场景 | 字体方向 | 用途 |
| --- | --- | --- |
| 大标题 | 极窄无衬线 / 几何无衬线 | 英文 hero、模块标题 |
| 正文 | 高可读无衬线 | 简历、项目说明、介绍文字 |
| 终端 | 等宽字体 | 命令、日志、坐标、代码感信息 |
| 复古 OS | 像素字体 / bitmap 风格 | 彩蛋桌面、游戏窗口 |

建议组合：

- 主标题：`Space Grotesk`、`Rajdhani`、`Sora`。
- 中文正文：系统字体栈优先，后续可引入 `Noto Sans SC`。
- 终端：`JetBrains Mono`、`IBM Plex Mono`。
- 像素 UI：`Press Start 2P` 或本地像素字体资源。

### 4.3 图形语言

- 背景：粒子星云、全息网格、体积光、噪声云、扫描线。
- 面板：半透明玻璃、细线边框、角标切角、低透明辉光。
- 图标：单线图标、坐标点、十字准星、雷达环。
- 装饰：数据编号、系统时间、状态灯、加载条、校验码、机密水印。
- 故障：RGB 分离、横向撕裂、字符错位、噪声块。

---

## 5. 关键体验设计

## 5.1 The Initialization：开场初始化

### 目标

让访问者进入网站时产生“系统启动 / 引擎点火 / 深空信号接入”的仪式感。

### 流程

1. 黑屏进入，出现低亮度扫描线。
2. 屏幕中心出现系统状态：`INITIALIZING CORE`。
3. 随机字符快速解码，逐步显示站点身份。
4. 背景全息网格从远处浮现。
5. 粒子从屏幕四周向中心聚合，形成标识或坐标。
6. 加载进度到 100%。
7. 一次低频冲击波扩散，主界面“砸入”视野。

### 可配置项

```ts
export interface BootSequenceConfig {
  minDurationMs: number
  enableAudio: boolean
  enableReducedMotionFallback: boolean
  bootLines: string[]
  finalSignalText: string
}
```

### 动效建议

- 字符解码：每 24ms 替换随机字符。
- 背景网格：从 `scale: 0.72` 到 `scale: 1`，透明度从 0 到 1。
- 主界面进入：`clip-path` + `filter: blur()` + WebGL bloom pulse。
- 加载完成：GSAP timeline 控制所有 DOM 与 WebGL uniform。

### 降级策略

- 若用户开启 `prefers-reduced-motion`：保留字符加载，禁用强烈镜头推进和闪烁。
- 若 WebGL 不可用：使用 CSS radial-gradient、noise 贴图和 SVG 网格替代。
- 若首次访问后：可缩短启动动画，仅在版本更新或主动点击“reboot”时完整播放。

---

## 5.2 The Terminal UI：OS 级交互骨架

### 目标

将个人网站的模块抽象为科幻控制终端中的不同“系统面板”。

### 主界面布局

```text
┌───────────────────────────────────────────────┐
│ Top System Bar: status / route / time / audio │
├───────────────┬───────────────────────────────┤
│ Command Dock  │ Active Viewport               │
│ - Home        │ - WebGL background            │
│ - Archive     │ - Floating panels             │
│ - Projects    │ - Cinematic content           │
│ - Gallery     │                               │
│ - Contact     │                               │
├───────────────┴───────────────────────────────┤
│ Bottom Telemetry: FPS / signal / coordinates  │
└───────────────────────────────────────────────┘
```

### 组件建议

| 组件 | 职责 |
| --- | --- |
| `AppShell` | 全局布局、启动状态、背景层、音频权限入口 |
| `SystemBar` | 顶部系统状态、时间、当前模块、连接状态 |
| `CommandDock` | 主导航与命令入口 |
| `TelemetryBar` | FPS、鼠标坐标、路由状态、彩蛋提示 |
| `HoloPanel` | 通用科幻面板容器 |
| `ArchiveCard` | 项目 / 经历 / 技能条目卡片 |
| `CustomCursor` | 自定义光标、拖影、磁吸 |
| `InteractionAudioProvider` | UI 点击、悬停、切换音效管理 |

### 自定义光标

特性：

- 默认状态：小型发光圆点 + 外圈延迟跟随。
- hover 状态：吸附到按钮中心，外圈变形为矩形或准星。
- drag 状态：拖影增强，显示坐标线。
- disabled 状态：降低透明度并显示锁定符号。

实现要点：

- 使用 `pointer-events: none` 避免阻挡交互。
- 使用 `requestAnimationFrame` 做平滑插值。
- 对触屏设备自动禁用。

---

## 5.3 The Content Showcase：影视级内容展示

### 5.3.1 首页 Signal Landing

目标：用极少文字和强视觉冲击建立身份。

内容结构：

- 大标题：英文代号 / 中文姓名。
- 副标题：开发者、数字创作者、AI 工具构建者、影像记录者。
- 动态坐标：当前时间、访问会话 ID、信号强度。
- 核心入口：`ENTER ARCHIVE`、`VIEW PROJECTS`、`OPEN TERMINAL`。
- 背景：深空粒子星云 + 全息网格。

交互：

- 鼠标移动改变粒子流向。
- 点击主 CTA 触发镜头拉进转场。
- 输入隐藏命令可进入彩蛋 OS。

### 5.3.2 About Identity Archive

目标：避免普通自我介绍，改为“身份档案解密”。

呈现方式：

- 左侧：头像或抽象全息身份图谱。
- 右侧：档案字段逐行解锁。
- 底部：兴趣、技能倾向、创作领域以标签矩阵展示。

文案风格：

- 使用档案字段：`SUBJECT`、`ROLE`、`SIGNAL`、`INTERESTS`。
- 中文说明保持真诚，但外层包装为终端档案。

### 5.3.3 Experience Career Log

目标：把工作经历变成航行日志或任务记录。

呈现方式：

- 垂直时间轴改为“星际航线”。
- 每段经历是一个 mission log。
- 悬停时展开关键贡献、技术栈、结果指标。

动效：

- 滚动时航线节点逐个点亮。
- 当前经历卡片与背景星图产生连线。

### 5.3.4 Skills Capability Matrix

目标：将技能展示从标签堆叠升级为能力矩阵。

呈现方式：

- 雷达图 / 节点网络 / ECharts 能力图谱。
- 技能分组：Frontend Core、Creative Coding、AI Tooling、Backend & DevOps、Visual Production。
- 每个节点有熟练度、使用场景、代表项目。

技术：

- 当前项目已有 ECharts，可用于能力矩阵。
- 后续可增加 WebGL 点阵背景与 ECharts 联动。

### 5.3.5 Projects Classified Archive

目标：将项目列表设计成机密档案库。

呈现方式：

- 卡片像机密卷宗：编号、状态、技术栈、风险等级、关键成果。
- 悬停出现扫描光、档案章、快速预览。
- 点击后不是普通详情页，而是镜头拉入单个档案。

项目分类：

- AI 插件 / 开源平台。
- Web 应用 / 前端工程。
- 游戏 / 互动实验。
- 数据可视化 / 工具链。
- 摄影航拍 / 数字影像。

### 5.3.6 Gallery Visual Memory

目标：让摄影和航拍作品拥有纪录片级观感。

呈现方式：

- 暗色全屏画廊。
- 横向胶片滚动或纵向 cinematic scroll。
- 图片进入时带轻微 parallax 和景深模糊。
- 支持大图沉浸查看。

交互：

- 滚动接管但必须提供可访问性降级。
- 鼠标移动带来轻微镜头偏移。
- 图片信息以极简字幕呈现：地点、时间、器材、故事。

### 5.3.7 Contact Transmission Console

目标：把联系表单变成信号发送控制台。

呈现方式：

- 左侧为通信状态：`CHANNEL OPEN`、`SIGNAL READY`。
- 右侧为终端风格表单。
- 提交时显示封包、加密、发送、确认回执。

反馈：

- 成功：信号波扩散，出现 transmission confirmed。
- 失败：红色故障提示，但避免过度闪烁。

---

## 5.4 Global Transition Director：系统级无缝转场

### 目标

统一接管路由切换、模块切换和彩蛋系统切换，让所有视图变化具备连续镜头感。

### 状态机

```text
idle
└─ routeRequested
   └─ freezeInput
      └─ preTransition
         └─ webglDistortion
            └─ routeCommit
               └─ contentEnter
                  └─ unlockInput
                     └─ idle
```

### 转场类型

| 类型 | 适用场景 | 效果 |
| --- | --- | --- |
| `warp` | 首页到核心模块 | 镜头快速拉进，背景星点径向拉伸 |
| `glitch-dissolve` | 项目列表到详情 | 当前画面像素化溶解，新档案重组 |
| `terminal-reload` | 终端相关模块 | 黑屏、字符刷屏、模块挂载 |
| `archive-scan` | About / Experience | 扫描线横扫，档案面板展开 |
| `desktop-hijack` | 彩蛋触发 | 页面坍缩、CMD 接管、复古桌面启动 |

### 技术设计

建议新增：

```text
src/transitions/
├─ TransitionDirector.ts
├─ transitionTypes.ts
├─ useRouteTransition.ts
├─ timelines/
│  ├─ warpTimeline.ts
│  ├─ glitchDissolveTimeline.ts
│  ├─ archiveScanTimeline.ts
│  └─ desktopHijackTimeline.ts
└─ shaders/
   ├─ pixelDissolve.frag
   ├─ rgbShift.frag
   └─ radialWarp.frag
```

核心原则：

- 路由切换不直接由页面组件各自管理。
- 所有转场统一经过 Transition Director。
- DOM 动画、WebGL uniform、音效、输入锁定统一编排。
- 页面组件只声明自己希望使用的 transition meta。

路由 meta 示例：

```ts
{
  path: '/projects/:id',
  name: 'ProjectDetail',
  component: () => import('@/views/ProjectDetail.vue'),
  meta: {
    title: '项目详情',
    transition: 'glitch-dissolve',
    audioCue: 'archive-open'
  }
}
```

---

## 5.5 Easter Egg OS：彩蛋操作系统

### 目标

把现有彩蛋游戏升级为一个完整的 90 年代复古终端系统。

### 触发方式

可并存多种触发：

- 首页输入隐藏命令：`boot legacy`。
- 连续点击系统状态灯 7 次。
- 在终端输入：`run game.exe`。
- 项目档案中点击隐藏机密章。

### 阶段流程

```text
Normal Website
└─ Signal Interference
   └─ Page Collapse
      └─ CMD Boot Window
         └─ Character Loading
            └─ Retro Desktop
               ├─ Resume.exe
               ├─ Projects.dir
               ├─ Terminal.app
               ├─ PhotoViewer.app
               └─ Game.exe
                  └─ Game Window
                     └─ Victory / Celebration
```

### 复古桌面功能

| 功能 | 说明 |
| --- | --- |
| 桌面图标 | 入口映射到简历、项目、相册、游戏 |
| 任务栏 | 显示打开窗口、时间、系统状态 |
| 开始菜单 | 命令入口和隐藏彩蛋 |
| 窗口系统 | 拖拽、聚焦、最小化、最大化、关闭 |
| Z-index 管理 | 点击窗口自动置顶 |
| CRT 效果 | 扫描线、轻微噪点、像素字体 |
| 终端命令 | 支持 `help`、`open`、`run`、`exit` |

### 窗口管理器设计

建议新增：

```text
src/os/
├─ types.ts
├─ windowManager.ts
├─ useWindowManager.ts
├─ commands.ts
└─ components/
   ├─ RetroDesktop.vue
   ├─ RetroTaskbar.vue
   ├─ RetroStartMenu.vue
   ├─ DesktopIcon.vue
   ├─ WindowFrame.vue
   ├─ TerminalWindow.vue
   ├─ GameWindow.vue
   └─ PhotoViewerWindow.vue
```

窗口数据结构：

```ts
export interface OSWindow {
  id: string
  title: string
  app: 'terminal' | 'game' | 'resume' | 'projects' | 'photo-viewer'
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  minimized: boolean
  maximized: boolean
  focused: boolean
}
```

拖拽规则：

- 仅标题栏可拖拽。
- 拖拽时限制在 viewport 内。
- 移动端改为全屏窗口栈。
- 双击标题栏最大化 / 还原。

游戏集成：

- 现有游戏引擎保持独立，不直接耦合 OS。
- `GameWindow` 只负责容器尺寸、焦点、暂停 / 恢复。
- 游戏状态由 Pinia 或独立 StageManager 管理。

---

## 6. 技术架构

### 6.1 当前基础

项目当前已具备：

- Vue 3。
- Vite / Rolldown Vite。
- TypeScript。
- Pinia。
- Vue Router。
- ECharts。
- Tailwind CSS v4。
- Vitest 与 Playwright。
- 已有彩蛋游戏模块与游戏状态管理。
- 已有粒子背景组件与页面过渡组件。

### 6.2 新增核心依赖建议

| 依赖 | 用途 | 优先级 |
| --- | --- | --- |
| `three` | WebGL 视觉引擎 | P0 |
| `gsap` | 时间线动画和转场调度 | P0 |
| `@vueuse/core` | 鼠标、窗口、事件组合式工具 | P1 |
| `howler` | 交互音效和环境音管理 | P1 |
| `postprocessing` | bloom、色差、噪声后期 | P1 |
| `stats.js` | 开发期 FPS 监测 | P2 |

是否引入 TresJS：

- 若团队希望用 Vue 组件方式声明 3D 场景，可使用 TresJS。
- 若追求 Shader 和 render pipeline 的精细控制，可直接使用 Three.js。
- 本项目建议第一阶段直接 Three.js，避免抽象层过早限制自定义转场。

### 6.3 分层架构

```text
src/
├─ app/                         # 应用级 shell、启动、provider
├─ components/
│  ├─ ui/                        # 通用按钮、面板、输入框
│  ├─ system/                    # 系统栏、遥测栏、命令 dock
│  ├─ effects/                   # WebGL / CSS 视觉效果组件
│  ├─ archive/                   # 档案卡片、项目卷宗
│  └─ game/                      # 现有游戏组件
├─ composables/                  # 组合式逻辑
├─ visual-engine/                # Three.js 与 shader 引擎
├─ transitions/                  # 全局转场系统
├─ os/                           # 彩蛋复古 OS
├─ audio/                        # 音频系统
├─ stores/                       # Pinia 状态
├─ router/                       # 路由与 meta
├─ data/                         # 内容数据
└─ styles/                       # tokens、主题、动效、降级样式
```

### 6.4 Visual Engine

职责：

- 管理 Three.js renderer、scene、camera。
- 管理背景粒子、星云、网格、后期处理。
- 暴露少量受控 API 给页面与转场系统。
- 避免页面组件直接操作底层 WebGL 对象。

建议 API：

```ts
export interface VisualEngineApi {
  boot(): Promise<void>
  setSceneMode(mode: 'landing' | 'archive' | 'gallery' | 'terminal' | 'os'): void
  transitionTo(mode: string, options?: VisualTransitionOptions): Promise<void>
  setPointer(x: number, y: number): void
  setIntensity(value: number): void
  dispose(): void
}
```

### 6.5 Audio Engine

职责：

- 管理用户授权后的音效播放。
- 区分 ambient、ui、transition、game 四类音频。
- 支持全局静音、音量配置、用户偏好保存。

音频原则：

- 不自动播放有声内容，必须由用户点击授权。
- 开场可先无声播放视觉，点击后进入增强音频模式。
- 所有音效可关闭。
- 不使用刺耳高频，避免疲劳。

### 6.6 状态管理

建议拆分 store：

| Store | 职责 |
| --- | --- |
| `app` | 当前路由、设备、主题、全局状态 |
| `boot` | 启动动画、资源加载、首次访问 |
| `transition` | 转场状态、输入锁定、当前 transition |
| `visual` | WebGL scene mode、质量等级、性能状态 |
| `audio` | 音频授权、音量、静音 |
| `os` | 桌面系统、窗口列表、激活窗口 |
| `easterEgg` | 彩蛋阶段与游戏入口 |

---

## 7. 性能与可访问性

### 7.1 性能预算

| 指标 | 目标 |
| --- | --- |
| 首屏可交互 | 3s 内进入可操作状态 |
| WebGL 帧率 | 桌面 55-60fps，移动端 30fps 以上 |
| 单文件大小 | 组件文件尽量小于 500 行 |
| 路由 chunk | 大模块懒加载 |
| 图片 | AVIF / WebP 优先，响应式尺寸 |
| 音频 | 短音效压缩，环境音按需加载 |

### 7.2 质量等级

根据设备性能设置视觉等级：

| 等级 | 条件 | 效果 |
| --- | --- | --- |
| Ultra | 高性能桌面 | 全粒子、后期 bloom、Shader 扭曲 |
| High | 普通桌面 | 粒子 + 网格 + 轻后期 |
| Medium | 平板 / 中端设备 | 降低粒子数量、禁用复杂后期 |
| Low | 移动 / 低性能 | CSS 背景 + 简化动画 |
| Static | WebGL 不可用 / 减少动态 | 静态渐变、无强转场 |

### 7.3 可访问性原则

- 保留 `skip to main content`。
- 所有窗口和终端命令提供键盘操作路径。
- 自定义光标不影响系统焦点样式。
- 强闪烁、故障动画必须受 `prefers-reduced-motion` 控制。
- 文字对比度达到 WCAG AA。
- 表单有明确 label、错误提示和成功反馈。
- 音频默认关闭或等待授权。

---

## 8. 内容策略

### 8.1 叙事模型

网站叙事不再是“个人介绍 → 技能 → 项目 → 联系”，而是：

```text
接收信号 → 验证身份 → 打开档案 → 浏览任务记录 → 深入机密项目 → 查看视觉记忆 → 建立通讯 → 发现隐藏系统
```

### 8.2 文案风格

主文案应在“科幻包装”和“真实可信”之间保持平衡：

- 标题可大胆、先锋、有技术隐喻。
- 正文必须清晰说明真实能力和项目成果。
- 项目描述避免只有氛围词，需要包含问题、方案、技术、结果。
- 简历内容要便于招聘者快速扫描。

### 8.3 项目档案字段

每个项目建议包含：

```ts
export interface ProjectArchiveItem {
  id: string
  codename: string
  title: string
  status: 'online' | 'prototype' | 'archived' | 'classified'
  summary: string
  challenge: string
  solution: string
  techStack: string[]
  highlights: string[]
  metrics?: string[]
  links: {
    demo?: string
    repo?: string
    caseStudy?: string
  }
  visualAssets: string[]
}
```

---

## 9. 设计系统组件清单

### 9.1 基础 UI

- `CyberButton`：带扫描光和磁吸反馈的按钮。
- `HoloPanel`：全息面板容器。
- `DataBadge`：状态标签。
- `GlitchText`：故障文字。
- `DecodeText`：字符解码文字。
- `ScanLine`：扫描线覆盖层。
- `SystemDivider`：科幻分隔线。
- `CommandInput`：终端命令输入。

### 9.2 复合组件

- `BootSequence`：开场初始化。
- `SystemHUD`：顶部和底部系统信息。
- `ArchiveGrid`：项目档案列表。
- `ProjectDossier`：项目详情卷宗。
- `CapabilityMatrix`：能力矩阵。
- `CinematicGallery`：沉浸式影像画廊。
- `TransmissionConsole`：联系表单控制台。
- `RetroDesktop`：彩蛋桌面。
- `WindowFrame`：可拖拽窗口。

### 9.3 效果组件

- `NebulaBackground`：Three.js 星云背景。
- `HologramGrid`：全息网格。
- `CustomCursor`：自定义光标。
- `RouteDistortionLayer`：路由转场扭曲层。
- `CRTOverlay`：复古 CRT 效果。
- `NoiseOverlay`：噪声纹理。

---

## 10. 实施路线图

### Phase 0：设计与技术准备

目标：建立重构边界与技术基础。

任务：

- 确认新视觉方向、信息架构和内容字段。
- 安装并验证 Three.js、GSAP。
- 建立设计 token 与暗黑主题变量。
- 梳理现有页面、游戏、路由、store 可复用部分。

交付物：

- 本设计文档。
- 技术 Spike：Three.js 背景 Demo、GSAP 路由转场 Demo。

### Phase 1：App Shell 与视觉引擎

目标：先搭好全局骨架，不急于重写所有页面。

任务：

- 新增 `AppShell`、`SystemBar`、`TelemetryBar`。
- 实现 `BootSequence`。
- 实现 `VisualEngine` 基础 renderer。
- 用新 `NebulaBackground` 替换旧粒子背景。
- 建立性能降级策略。

交付物：

- 首页可展示新视觉氛围。
- 首次访问有初始化动画。
- 低性能设备有降级背景。

### Phase 2：全局转场系统

目标：将页面跳转升级为电影镜头式切换。

任务：

- 实现 `TransitionDirector`。
- 路由 meta 增加 transition 类型。
- 替换现有基础 `PageTransition`。
- 实现至少三种转场：`warp`、`archive-scan`、`glitch-dissolve`。
- Playwright 验证导航不中断、可返回、可键盘操作。

交付物：

- 页面切换具备统一风格。
- 转场期间输入锁定且不会误触。

### Phase 3：核心页面重构

目标：将主要内容模块全部变成“档案系统”。

任务：

- 重构 Home 为 Signal Landing。
- 重构 About 为 Identity Archive。
- 重构 Projects 为 Classified Archive。
- 重构 ProjectDetail 为 Deep File Viewer。
- 重构 Contact 为 Transmission Console。
- 增加 Skills Capability Matrix。

交付物：

- 核心访问路径完整。
- 项目展示和联系转化能力不下降。

### Phase 4：复古 OS 彩蛋系统

目标：将现有彩蛋游戏升级为可探索桌面系统。

任务：

- 建立 `os` 模块与窗口管理器。
- 实现 `RetroDesktop`、`WindowFrame`、`RetroTaskbar`。
- 将现有 `GameContainer` 包装为 `GameWindow`。
- 支持拖拽、聚焦、最小化、最大化。
- 实现终端命令系统。

交付物：

- 彩蛋体验从页面崩塌进入复古桌面。
- 小游戏在窗口内运行。

### Phase 5：影视画廊与声音系统

目标：完善高级感和艺术气质。

任务：

- 新增 Gallery 路由。
- 实现 Cinematic Gallery。
- 接入 UI 音效和环境音。
- 增加用户音频授权入口。
- 图片资源优化与懒加载。

交付物：

- 摄影 / 航拍作品拥有沉浸式展示路径。
- 音效可启用、关闭、持久化。

### Phase 6：优化、测试与上线

目标：保证酷炫体验不牺牲稳定性。

任务：

- 完成 Vitest 单元测试。
- 完成 Playwright 关键路径测试。
- Lighthouse 性能与可访问性优化。
- 移动端适配与 WebGL 降级。
- 文档更新与部署验证。

交付物：

- 可上线版本。
- 性能、可访问性和核心交互通过验收。

---

## 11. 验收标准

### 11.1 视觉验收

- 首屏具有明确的深空 / 科幻 / 终端气质。
- 页面不再显得单一、模板化或传统简历化。
- WebGL 背景与内容模块有联动，而非纯装饰。
- 暗色背景下文字清晰可读。
- 复古 OS 与主世界有明显风格区隔但叙事统一。

### 11.2 交互验收

- 开场动画有仪式感但不拖沓。
- 路由切换无明显白屏、闪屏或布局跳动。
- 自定义光标、按钮、面板交互有一致反馈。
- 彩蛋 OS 可完成打开窗口、拖拽、最小化、运行游戏。
- 移动端不会因复杂动效导致不可用。

### 11.3 技术验收

- 架构模块化，单文件尽量不超过 500 行。
- WebGL、转场、音频、OS、游戏相互解耦。
- 所有环境值通过配置或 env 管理，不硬编码敏感信息。
- 页面核心路径有测试覆盖。
- WebGL 不可用时仍可访问主要内容。

---

## 12. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| WebGL 过重导致卡顿 | 体验下降 | 质量等级、粒子数量动态调整、移动端降级 |
| 动画过多影响内容阅读 | 信息传达下降 | 动效只服务状态变化，正文区域保持稳定 |
| 声音打扰用户 | 负面体验 | 默认静音，用户授权后启用 |
| Scroll-jacking 影响可访问性 | 操作困难 | 只在画廊等特定模块使用，并提供原生滚动 fallback |
| 彩蛋 OS 开发复杂 | 进度拉长 | 分阶段实现：桌面静态 → 窗口管理 → 游戏集成 |
| SEO 受 SPA 和动画影响 | 搜索表现下降 | 保留语义 HTML、结构化数据、首屏文本、sitemap |

---

## 13. 推荐优先级

### 必须实现 P0

- 新暗黑科幻视觉系统。
- BootSequence 初始化动画。
- Three.js / WebGL 背景基础版本。
- GSAP 全局转场基础框架。
- Home、Projects、ProjectDetail、Contact 重构。
- WebGL 降级与减少动态支持。

### 强烈建议 P1

- 自定义光标。
- 系统 HUD。
- 音效系统。
- 复古 OS 桌面和彩蛋窗口管理器。
- Skills 能力矩阵。

### 可延后 P2

- 高级 Shader 后期处理。
- 完整电影画廊。
- 终端命令扩展。
- 复杂窗口应用生态。
- 多主题皮肤。

---

## 14. 总结

这次改版应被视为一次完整的产品级重构，而不是简单换肤。新的个人网站应同时满足三件事：

1. 视觉上，像一件深空科幻数字艺术品。
2. 交互上，像一个可以操作、探索、解锁的终端系统。
3. 内容上，仍然清晰、可信、高效地展示个人能力、项目成果和创作方向。

最终成品应形成独特记忆点：访问者不是“浏览了一个简历网站”，而是“进入了一个由个人技术、审美和世界观构成的数字空间”。
