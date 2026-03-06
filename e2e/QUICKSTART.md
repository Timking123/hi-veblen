# E2E 测试快速入门指南

## 🚀 快速开始（3 步）

### 步骤 1: 安装 Playwright
```bash
npm install -D @playwright/test
```

### 步骤 2: 安装浏览器
```bash
npx playwright install
```

如果浏览器安装因网络问题失败，请参阅下方的[故障排除](#故障排除)。

### 步骤 3: 运行测试
```bash
npm run test:e2e
```

## 📊 测试内容

✅ **导航** - 菜单导航、路由、前进/后退按钮  
✅ **用户流程** - 完整的页面浏览旅程  
✅ **联系表单** - 表单验证、邮箱/电话链接、下载  
✅ **响应式设计** - 桌面、平板、移动端布局  
✅ **交互** - 悬停效果、展开/折叠、筛选  
✅ **跨浏览器** - Chrome、Firefox、Safari 兼容性  

## 🎯 测试命令

```bash
# 运行所有测试
npm run test:e2e

# 在 UI 模式下运行（交互模式）
npm run test:e2e:ui

# 在有头模式下运行（可见浏览器）
npm run test:e2e:headed

# 运行特定浏览器
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# 调试特定测试
npx playwright test --debug e2e/navigation.spec.ts
```

## 🔧 故障排除

### 浏览器安装失败

**选项 1: 使用系统 Chrome**
```bash
npx playwright test --config=playwright.config.system-chrome.ts
```

**选项 2: 仅安装 Chromium**
```bash
npx playwright install chromium
npm run test:e2e:chromium
```

**选项 3: 使用代理（如果在防火墙后）**
```bash
set HTTPS_PROXY=http://proxy.company.com:8080
npx playwright install
```

### 端口已被占用
如果端口 5173 被占用：
```bash
# 停止开发服务器
# 或在 playwright.config.ts 中更改端口
```

### 首次运行测试失败
- 首次运行可能较慢（冷启动）
- 重试：`npm run test:e2e`
- 检查开发服务器是否正常：`npm run dev`

## 📁 测试文件

- `navigation.spec.ts` - 导航和路由测试
- `user-flow.spec.ts` - 完整用户旅程测试
- `contact-form.spec.ts` - 表单和联系测试
- `responsive.spec.ts` - 响应式设计测试
- `interactions.spec.ts` - 交互元素测试

## 📈 查看结果

运行测试后：
```bash
npx playwright show-report
```

这将打开一个 HTML 报告，包含：
- 测试结果和耗时
- 失败截图
- 执行追踪
- 浏览器控制台日志

## 🎓 了解更多

- [完整文档](./README.md)
- [测试摘要](./TEST_SUMMARY.md)
- [安装指南](./SETUP.md)
- [Playwright 文档](https://playwright.dev)

## ✅ 成功检查清单

- [ ] Playwright 已安装
- [ ] 浏览器已安装（或使用系统 Chrome）
- [ ] 开发服务器可在端口 5173 启动
- [ ] 测试运行成功
- [ ] HTML 报告已生成

## 🆘 需要帮助？

1. 查看 [SETUP.md](./SETUP.md) 获取详细安装帮助
2. 查看 [TEST_SUMMARY.md](./TEST_SUMMARY.md) 获取测试覆盖详情
3. 运行 `npx playwright --help` 获取 CLI 选项
4. 访问 https://playwright.dev 获取官方文档

---

**总测试数**: 165（33 个测试 × 5 个浏览器）  
**验证需求**: 8.4（跨浏览器兼容性）  
**状态**: ✅ 准备运行
