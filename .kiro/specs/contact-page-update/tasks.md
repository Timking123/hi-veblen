# 实现计划：联系页面更新

## 概述

本计划将联系页面更新分解为增量式的编码任务，每个任务都建立在前一个任务的基础上，确保代码始终处于可运行状态。

## 任务

- [ ] 1. 创建留言存储工具模块
  - [x] 1.1 创建 src/utils/messageStorage.ts 文件
    - 定义 MessageData 和 SaveResult 接口
    - 实现 generateFilename 函数（日期+称呼格式）
    - 实现 serializeMessage 函数（最小空间格式）
    - 实现 deserializeMessage 函数（反序列化）
    - 实现 saveMessage 函数（使用 localStorage 存储）
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.2 编写 messageStorage 属性测试
    - **Property 1: 文件名格式一致性**
    - **Property 2: 留言存储往返一致性**
    - **Validates: Requirements 3.2, 3.3**

- [ ] 2. 重构 ContactForm 组件
  - [x] 2.1 更新表单字段和标签
    - 将"姓名"改为"称呼"
    - 将"邮箱"改为"联系方式"
    - 将"发送消息"改为"留言"
    - 更新 formData 接口类型
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.2 实现表单折叠/展开功能
    - 添加 isExpanded 状态
    - 默认收起，仅显示"留言"按钮
    - 点击按钮展开完整表单
    - 添加展开/收起动画
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 2.3 集成留言存储功能
    - 导入 messageStorage 模块
    - 提交时调用 saveMessage
    - 处理保存成功/失败状态
    - 成功后收起表单
    - _Requirements: 3.1, 3.4_

  - [x] 2.4 编写 ContactForm 属性测试
    - **Property 3: 表单状态切换幂等性**
    - **Validates: Requirements 2.4, 2.5**

- [x] 3. 检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

- [ ] 4. 更新 Contact.vue 页面
  - [x] 4.1 添加微信信息卡片
    - 在电话卡片后添加微信卡片
    - 显示微信图标、标签和微信号
    - 实现点击复制功能
    - 添加复制成功提示
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 修复简历下载路径
    - 更新下载路径为 /file/CV/黄彦杰-个人简历.pdf
    - 更新下载文件名为 黄彦杰_简历.pdf
    - _Requirements: 4.1, 4.2_

  - [x] 4.3 优化页面布局
    - 更新信息卡片为三列网格布局
    - 调整简历下载区域样式
    - 将留言区域移至页面底部
    - 添加响应式断点（768px 单列）
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 5. 更新类型定义
  - [x] 5.1 更新 src/types/index.ts
    - 添加 MessageFormData 类型（替换 ContactFormData）
    - 添加 StoredMessage 类型
    - 添加 SaveResult 类型
    - _Requirements: 2.1, 2.2, 3.3_

- [x] 6. 最终检查点 - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户。

## 备注

- 所有任务均为必需任务
- 每个任务都引用了具体的需求以便追溯
- 检查点确保增量验证
- 属性测试验证通用正确性属性
- 单元测试验证具体示例和边界情况
