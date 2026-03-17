# ParticleBackground 组件测试文档

## 测试文件

### ParticleBackground.unit.test.ts

**测试范围**：背景显示和主题切换的单元测试

**验证需求**：1.1, 1.2, 1.3, 2.1, 2.2

#### 测试套件

1. **深色主题渲染**
   - 应该在深色主题下使用正确的粒子颜色
   - 应该在深色主题下使用完全不透明的粒子

2. **亮色主题渲染**
   - 应该在亮色主题下使用正确的粒子颜色
   - 应该在亮色主题下使用降低透明度的粒子

3. **主题切换**
   - 应该在主题切换时更新粒子颜色

4. **自定义颜色属性**
   - 应该优先使用 props 中指定的颜色
   - 应该在未指定颜色时使用主题默认颜色

5. **渐变背景主题适配**
   - 应该在深色主题下显示深色渐变背景
   - 应该在亮色主题下显示亮色渐变背景

6. **组件生命周期**
   - 应该在挂载时正确初始化
   - 应该在卸载时正确清理

7. **性能优化**
   - 应该在 prefers-reduced-motion 时禁用动画

## 运行测试

```bash
# 运行 ParticleBackground 单元测试
npm run test -- src/components/effects/__tests__/ParticleBackground.unit.test.ts --run

# 运行所有 effects 测试
npm run test -- src/components/effects/__tests__ --run
```

## 测试覆盖

- ✅ 深色主题粒子颜色渲染
- ✅ 亮色主题粒子颜色渲染
- ✅ 主题切换时的状态更新
- ✅ 粒子透明度的主题适配
- ✅ 自定义颜色属性优先级
- ✅ 渐变背景的主题适配
- ✅ 组件生命周期管理
- ✅ 性能优化（prefers-reduced-motion）
