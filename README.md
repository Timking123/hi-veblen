# Vue 3 个人作品集网站

基于 Vue 3 全家桶构建的现代化个人求职网站，包含隐藏的像素艺术风格彩蛋游戏。

## ✨ 特性

- 🎨 **现代化设计** - 深色科技风主题，毛玻璃效果
- 📱 **响应式布局** - 完美适配桌面和移动设备
- ⚡ **高性能** - 路由懒加载、图片懒加载、代码分割
- 🎮 **彩蛋游戏** - 隐藏的像素艺术飞行射击游戏
- 🔍 **SEO 优化** - 完整的 Meta 标签和结构化数据
- ♿ **无障碍** - 符合 WCAG 标准

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|-----|------|------|
| Vue | 3.4+ | 前端框架 |
| TypeScript | 5.0+ | 类型系统 |
| Vite | 5.0+ | 构建工具 |
| Pinia | 2.1+ | 状态管理 |
| Vue Router | 4.2+ | 路由管理 |
| TailwindCSS | 3.4+ | CSS 框架 |
| Vitest | - | 单元测试 |
| Playwright | - | E2E 测试 |

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装和运行

```bash
# 克隆项目
git clone https://github.com/Timking123/hi-veblen.git
cd hi-veblen

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目结构

```
├── docs/                    # 项目文档
│   ├── DEVELOPMENT_STANDARDS.md  # 开发标准
│   ├── MAINTENANCE_GUIDE.md      # 维护指南
│   ├── DEPLOYMENT_GUIDE.md       # 部署指南
│   └── GAME_DOCUMENTATION.md     # 游戏文档
├── public/                  # 静态资源
├── src/
│   ├── components/          # Vue 组件
│   ├── composables/         # 组合式函数
│   ├── game/                # 游戏引擎
│   ├── router/              # 路由配置
│   ├── stores/              # 状态管理
│   ├── styles/              # 全局样式
│   ├── types/               # 类型定义
│   ├── utils/               # 工具函数
│   └── views/               # 页面组件
└── e2e/                     # E2E 测试
```

## 📚 文档

详细文档请查看 `docs/` 目录：

- [开发标准与规范](./docs/DEVELOPMENT_STANDARDS.md)
- [项目维护指南](./docs/MAINTENANCE_GUIDE.md)
- [部署指南](./docs/DEPLOYMENT_GUIDE.md)
- [彩蛋游戏文档](./docs/GAME_DOCUMENTATION.md)

## 🎮 彩蛋游戏

网站包含一个隐藏的像素艺术风格飞行射击游戏：

- **触发方式**: 在首页 5 秒内点击头像 3 次
- **游戏特色**: 像素艺术、动态音乐、三个关卡
- **详细说明**: 查看 [游戏文档](./docs/GAME_DOCUMENTATION.md)

## 🔧 可用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产构建
npm run lint         # 代码检查
npm run format       # 代码格式化
npm run type-check   # 类型检查
npm run test         # 运行单元测试
npm run test:e2e     # 运行 E2E 测试
```

## 📄 许可证

本项目为个人作品，仅供学习和展示使用。

## 📞 联系方式

- 邮箱: 1243222867@QQ.com
- 电话: +86 14775378984

---

**最后更新**: 2026-01-30
