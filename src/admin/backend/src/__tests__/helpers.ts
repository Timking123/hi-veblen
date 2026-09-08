/** 检查测试前提后缩窄类型，缺失元素必须使测试失败。 */
export function requireValue<T>(value: T | null | undefined): T {
  if (value === undefined || value === null) {
    throw new Error('测试前提失败：预期值不存在')
  }
  return value
}
