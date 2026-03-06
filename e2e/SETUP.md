# Playwright 安装指南

## 安装问题

如果在安装 Playwright 浏览器时遇到网络问题，请尝试以下解决方案：

### 解决方案 1: 使用系统浏览器
通过设置 channel 选项，配置 Playwright 使用系统已安装的浏览器：

```typescript
// 在 playwright.config.ts 中
projects: [
  {
    name: 'chromium',
    use: { 
      ...devices['Desktop Chrome'],
      channel: 'chrome' // 使用系统 Chrome
    },
  },
]
```

### 解决方案 2: 手动下载
从以下地址手动下载浏览器：
- Chrome: https://www.google.com/chrome/
- Firefox: https://www.mozilla.org/firefox/
- Edge: https://www.microsoft.com/edge

### 解决方案 3: 使用代理
如果在防火墙后，配置代理：

```bash
set HTTPS_PROXY=http://proxy.company.com:8080
npx playwright install
```

### 解决方案 4: 离线安装
1. 在有网络的机器上下载浏览器
2. 将浏览器二进制文件复制到目标机器
3. 设置 PLAYWRIGHT_BROWSERS_PATH 环境变量

### 解决方案 5: 使用不同镜像重试
```bash
set PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net
npx playwright install
```

## 验证

安装后，验证浏览器是否可用：

```bash
npx playwright --version
npx playwright install --dry-run
```

## 不完整安装时运行测试

你可以只安装 Chromium（最小下载）运行测试：

```bash
npx playwright install chromium
npm run test:e2e:chromium
```

或使用系统 Chrome 浏览器：

```bash
# 修改 playwright.config.ts 使用 channel: 'chrome'
npm run test:e2e:chromium
```

## 网络故障排除

如果下载持续失败：

1. **检查防火墙设置**: 确保可以访问 cdn.playwright.dev
2. **检查杀毒软件**: 临时禁用以测试
3. **使用 VPN**: 尝试不同的网络连接
4. **联系 IT**: 请求将 Playwright CDN 加入白名单
5. **使用替代方案**: 考虑 Cypress 或其他 E2E 框架

## 替代方案: 手动运行测试

如果自动浏览器安装失败，你仍然可以验证测试结构：

```bash
# 检查测试语法
npx playwright test --list

# 干运行查看将测试什么
npx playwright test --dry-run
```

## 当前状态

集成测试已创建完成，浏览器安装后即可运行。测试文件包括：

- ✅ `navigation.spec.ts` - 导航流程测试
- ✅ `user-flow.spec.ts` - 完整用户旅程测试
- ✅ `contact-form.spec.ts` - 表单提交测试
- ✅ `responsive.spec.ts` - 响应式设计测试
- ✅ `interactions.spec.ts` - 交互元素测试

所有测试结构良好，遵循 Playwright 最佳实践。
