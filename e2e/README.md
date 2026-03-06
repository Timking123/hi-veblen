# 端到端集成测试

本目录包含基于 Playwright 的 Vue 3 个人作品集网站集成测试。

## 测试覆盖范围

### 1. 导航测试 (`navigation.spec.ts`)
- 所有页面的导航菜单可见性
- 使用菜单项进行页面导航
- 活动菜单项高亮显示
- 浏览器前进/后退按钮处理
- 404 页面处理

**验证需求**: 6.1, 6.2, 6.4, 6.5, 8.4

### 2. 用户流程测试 (`user-flow.spec.ts`)
- 完整的用户浏览旅程
- 首页内容显示
- 教育信息显示
- 工作经历显示
- 技能分类
- 联系信息显示

**验证需求**: 1.1, 1.2, 1.5, 2.1, 3.1, 4.1, 5.1

### 3. 联系表单测试 (`contact-form.spec.ts`)
- 联系表单显示
- 必填字段验证
- 邮箱格式验证
- 有效表单提交
- 可点击的邮箱和电话链接
- 简历下载按钮

**验证需求**: 5.2, 5.3, 5.4

### 4. 响应式设计测试 (`responsive.spec.ts`)
- 桌面、平板和移动端视口的显示正确性
- 视口调整时的布局适配
- 移动设备上的触摸交互
- 跨浏览器兼容性
- 动画渲染
- 页面过渡

**验证需求**: 8.1, 8.2, 8.3, 8.4, 8.5

### 5. 交互元素测试 (`interactions.spec.ts`)
- 工作经历卡片展开/折叠
- 悬停显示技能详情
- 按技能筛选项目
- 悬停显示课程详情
- 按钮交互
- 滚动动画
- 图片懒加载

**验证需求**: 3.2, 4.3, 4.5, 7.3

## 运行测试

### 安装 Playwright 浏览器
```bash
npx playwright install
```

### 运行所有测试
```bash
npm run test:e2e
```

### 在 UI 模式下运行测试
```bash
npm run test:e2e:ui
```

### 在有头模式下运行测试（可见浏览器）
```bash
npm run test:e2e:headed
```

### 运行特定浏览器的测试
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### 运行特定测试文件
```bash
npx playwright test e2e/navigation.spec.ts
```

### 调试测试
```bash
npx playwright test --debug
```

## 测试配置

测试在 `playwright.config.ts` 中配置，包含以下设置：

- **基础 URL**: http://localhost:5173
- **浏览器**: Chromium, Firefox, WebKit
- **移动设备**: Pixel 5, iPhone 12
- **重试次数**: CI 环境 2 次，本地开发 0 次
- **截图**: 失败时捕获
- **追踪**: 首次重试时捕获

## 编写新测试

添加新的集成测试时：

1. 在 `e2e` 目录中创建新的 `.spec.ts` 文件
2. 导入测试工具：`import { test, expect } from '@playwright/test'`
3. 使用 `test.describe()` 分组相关测试
4. 使用描述性的测试名称说明测试内容
5. 添加注释说明验证的需求
6. 使用适当的选择器（优先使用 data-testid 属性）
7. 为动态内容添加适当的等待
8. 优雅地处理可选元素

## 最佳实践

- **选择器**: 使用 data-testid 属性获得稳定的选择器
- **等待**: 使用 `waitForLoadState()` 或 `waitForSelector()` 而非固定超时
- **断言**: 使用 Playwright 内置断言获得更好的错误信息
- **隔离**: 每个测试应独立，不依赖其他测试
- **清理**: 测试应自行清理
- **稳定性**: 使用适当的等待和稳定的选择器避免不稳定测试

## 故障排除

### 测试无法启动
- 确保开发服务器正在运行或可以自动启动
- 检查端口 5173 是否可用
- 验证 Playwright 浏览器已安装

### 测试不稳定
- 为动态内容添加适当的等待
- 使用更稳定的选择器
- 如需要可增加超时值

### 浏览器安装问题
- 运行 `npx playwright install --with-deps` 安装系统依赖
- 在 Windows 上可能需要以管理员身份运行
- 检查浏览器下载的网络连接

## CI/CD 集成

测试配置为在 CI 环境中运行，包含：
- 失败时自动重试
- 单工作进程以保证稳定性
- HTML 报告生成
- 失败时捕获截图和追踪

添加到 CI 流水线：
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps
  
- name: Run E2E Tests
  run: npm run test:e2e
  
- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```
