import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import * as fc from 'fast-check'
import ContactForm from '../ContactForm.vue'

/**
 * Feature: contact-page-update
 *
 * Property 1: 表单验证有效性
 * 对于任何留言表单输入，提交时应当验证所有必填字段是否填写，并在验证失败时显示错误提示
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * Property 3: 表单状态切换幂等性
 * 对于任意表单初始状态，连续多次点击展开按钮后，表单应始终处于展开状态（展开操作是幂等的）
 * Validates: Requirements 2.4, 2.5
 */

// 辅助函数：展开表单
const expandForm = async (wrapper: ReturnType<typeof mount>) => {
  const expandButton = wrapper.find('[data-testid="expand-button"]')
  if (expandButton.exists()) {
    await expandButton.trigger('click')
    await wrapper.vm.$nextTick()
  }
}

describe('ContactForm Property Tests', () => {
  describe('Property: Form Validation Validity（表单验证有效性）', () => {
    it('should validate required fields on submit（提交时验证必填字段）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nickname: fc.string(),
            contact: fc.string(),
            message: fc.string(),
          }),
          async (formData) => {
            const wrapper = mount(ContactForm)

            // 先展开表单
            await expandForm(wrapper)

            // Set form data（设置表单数据）
            const nicknameInput = wrapper.find('[data-testid="nickname-input"]')
            const contactInput = wrapper.find('[data-testid="contact-input"]')
            const messageInput = wrapper.find('[data-testid="message-input"]')

            await nicknameInput.setValue(formData.nickname)
            await contactInput.setValue(formData.contact)
            await messageInput.setValue(formData.message)

            // Submit form（提交表单）
            const form = wrapper.find('[data-testid="contact-form"]')
            await form.trigger('submit')
            await wrapper.vm.$nextTick()

            // Property: If any required field is empty (after trim), error should be shown
            // 属性：如果任何必填字段为空（去除空格后），应显示错误
            const nicknameError = wrapper.find('[data-testid="nickname-error"]')
            const contactError = wrapper.find('[data-testid="contact-error"]')
            const messageError = wrapper.find('[data-testid="message-error"]')

            if (!formData.nickname.trim()) {
              expect(nicknameError.exists()).toBe(true)
              expect(nicknameError.text()).toBeTruthy()
            }

            if (!formData.contact.trim()) {
              expect(contactError.exists()).toBe(true)
              expect(contactError.text()).toBeTruthy()
            }

            if (!formData.message.trim()) {
              expect(messageError.exists()).toBe(true)
              expect(messageError.text()).toBeTruthy()
            }

            // Property: If all fields are valid, no errors should be shown
            // 属性：如果所有字段都有效，不应显示错误
            if (
              formData.nickname.trim() &&
              formData.contact.trim() &&
              formData.message.trim()
            ) {
              // After successful submission, errors should not exist or be empty
              // 成功提交后，错误应不存在或为空
              if (nicknameError.exists()) {
                expect(nicknameError.text()).toBe('')
              }
              if (contactError.exists()) {
                expect(contactError.text()).toBe('')
              }
              if (messageError.exists()) {
                expect(messageError.text()).toBe('')
              }
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should clear errors when user starts typing（用户输入时清除错误）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(),
          async (newValue) => {
            const wrapper = mount(ContactForm)

            // 先展开表单
            await expandForm(wrapper)

            // Submit empty form to trigger errors（提交空表单触发错误）
            const form = wrapper.find('[data-testid="contact-form"]')
            await form.trigger('submit')
            await wrapper.vm.$nextTick()

            // Property: Errors should be visible after submitting empty form
            // 属性：提交空表单后应显示错误
            let nicknameError = wrapper.find('[data-testid="nickname-error"]')
            let contactError = wrapper.find('[data-testid="contact-error"]')
            let messageError = wrapper.find('[data-testid="message-error"]')

            expect(nicknameError.exists()).toBe(true)
            expect(contactError.exists()).toBe(true)
            expect(messageError.exists()).toBe(true)

            // Start typing in nickname field（在称呼字段中输入）
            const nicknameInput = wrapper.find('[data-testid="nickname-input"]')
            await nicknameInput.setValue(newValue)
            await nicknameInput.trigger('input')
            await wrapper.vm.$nextTick()

            // Property: Nickname error should be cleared after input
            // 属性：输入后称呼错误应被清除
            nicknameError = wrapper.find('[data-testid="nickname-error"]')
            if (nicknameError.exists()) {
              expect(nicknameError.text()).toBe('')
            }

            // Start typing in contact field（在联系方式字段中输入）
            const contactInput = wrapper.find('[data-testid="contact-input"]')
            await contactInput.setValue(newValue)
            await contactInput.trigger('input')
            await wrapper.vm.$nextTick()

            // Property: Contact error should be cleared after input
            // 属性：输入后联系方式错误应被清除
            contactError = wrapper.find('[data-testid="contact-error"]')
            if (contactError.exists()) {
              expect(contactError.text()).toBe('')
            }

            // Start typing in message field（在留言字段中输入）
            const messageInput = wrapper.find('[data-testid="message-input"]')
            await messageInput.setValue(newValue)
            await messageInput.trigger('input')
            await wrapper.vm.$nextTick()

            // Property: Message error should be cleared after input
            // 属性：输入后留言错误应被清除
            messageError = wrapper.find('[data-testid="message-error"]')
            if (messageError.exists()) {
              expect(messageError.text()).toBe('')
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should validate on blur for individual fields（失焦时验证单个字段）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nickname: fc.string(),
            contact: fc.string(),
            message: fc.string(),
          }),
          async (formData) => {
            const wrapper = mount(ContactForm)

            // 先展开表单
            await expandForm(wrapper)

            // Test nickname field blur validation（测试称呼字段失焦验证）
            const nicknameInput = wrapper.find('[data-testid="nickname-input"]')
            await nicknameInput.setValue(formData.nickname)
            await nicknameInput.trigger('blur')
            await wrapper.vm.$nextTick()

            const nicknameError = wrapper.find('[data-testid="nickname-error"]')
            if (!formData.nickname.trim()) {
              // Property: Empty nickname should show error on blur
              // 属性：空称呼在失焦时应显示错误
              expect(nicknameError.exists()).toBe(true)
              expect(nicknameError.text()).toBeTruthy()
            }

            // Test contact field blur validation（测试联系方式字段失焦验证）
            const contactInput = wrapper.find('[data-testid="contact-input"]')
            await contactInput.setValue(formData.contact)
            await contactInput.trigger('blur')
            await wrapper.vm.$nextTick()

            const contactError = wrapper.find('[data-testid="contact-error"]')
            if (!formData.contact.trim()) {
              // Property: Empty contact should show error on blur
              // 属性：空联系方式在失焦时应显示错误
              expect(contactError.exists()).toBe(true)
              expect(contactError.text()).toBeTruthy()
            }

            // Test message field blur validation（测试留言字段失焦验证）
            const messageInput = wrapper.find('[data-testid="message-input"]')
            await messageInput.setValue(formData.message)
            await messageInput.trigger('blur')
            await wrapper.vm.$nextTick()

            const messageError = wrapper.find('[data-testid="message-error"]')
            if (!formData.message.trim()) {
              // Property: Empty message should show error on blur
              // 属性：空留言在失焦时应显示错误
              expect(messageError.exists()).toBe(true)
              expect(messageError.text()).toBeTruthy()
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should show success message only when all fields are valid（所有字段有效时显示成功消息）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nickname: fc.stringMatching(/^[a-zA-Z\u4e00-\u9fa5 ]{2,50}$/).filter(s => s.trim().length > 0),
            contact: fc.stringMatching(/^[a-zA-Z0-9@.\-_\u4e00-\u9fa5 ]{3,100}$/).filter(s => s.trim().length > 0),
            message: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5 ,.!?]{10,500}$/).filter(s => s.trim().length > 0),
          }),
          async (formData) => {
            const wrapper = mount(ContactForm)

            // 先展开表单
            await expandForm(wrapper)

            // Fill form with valid data（填写有效数据）
            const nicknameInput = wrapper.find('[data-testid="nickname-input"]')
            const contactInput = wrapper.find('[data-testid="contact-input"]')
            const messageInput = wrapper.find('[data-testid="message-input"]')

            await nicknameInput.setValue(formData.nickname)
            await contactInput.setValue(formData.contact)
            await messageInput.setValue(formData.message)

            // Submit form（提交表单）
            const form = wrapper.find('[data-testid="contact-form"]')
            await form.trigger('submit')
            await wrapper.vm.$nextTick()

            // Wait for async submission (form has 1000ms delay)
            // 等待异步提交（表单有 1000ms 延迟）
            await new Promise((resolve) => setTimeout(resolve, 1200))
            await wrapper.vm.$nextTick()

            // Property: Success message should be visible after valid submission
            // 属性：有效提交后应显示成功消息
            const successMessage = wrapper.find('[data-testid="success-message"]')
            expect(successMessage.exists()).toBe(true)

            // Property: No error messages should be visible
            // 属性：不应显示错误消息
            const nicknameError = wrapper.find('[data-testid="nickname-error"]')
            const contactError = wrapper.find('[data-testid="contact-error"]')
            const messageError = wrapper.find('[data-testid="message-error"]')

            if (nicknameError.exists()) {
              expect(nicknameError.text()).toBe('')
            }
            if (contactError.exists()) {
              expect(contactError.text()).toBe('')
            }
            if (messageError.exists()) {
              expect(messageError.text()).toBe('')
            }

            // Property: Form should be cleared after successful submission
            // 属性：成功提交后表单应被清空
            expect((nicknameInput.element as HTMLInputElement).value).toBe('')
            expect((contactInput.element as HTMLInputElement).value).toBe('')
            expect((messageInput.element as HTMLTextAreaElement).value).toBe('')
          }
        ),
        { numRuns: 10 }
      )
    }, 30000) // 30秒超时

    it('should handle whitespace-only inputs as invalid（仅空格输入应视为无效）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          async (spaceCount) => {
            const wrapper = mount(ContactForm)

            // 先展开表单
            await expandForm(wrapper)

            // Create whitespace-only strings（创建仅空格字符串）
            const whitespaceString = ' '.repeat(spaceCount)

            const nicknameInput = wrapper.find('[data-testid="nickname-input"]')
            const contactInput = wrapper.find('[data-testid="contact-input"]')
            const messageInput = wrapper.find('[data-testid="message-input"]')

            await nicknameInput.setValue(whitespaceString)
            await contactInput.setValue(whitespaceString)
            await messageInput.setValue(whitespaceString)

            // Submit form（提交表单）
            const form = wrapper.find('[data-testid="contact-form"]')
            await form.trigger('submit')
            await wrapper.vm.$nextTick()

            // Property: All fields should show errors for whitespace-only input
            // 属性：仅空格输入的所有字段应显示错误
            const nicknameError = wrapper.find('[data-testid="nickname-error"]')
            const contactError = wrapper.find('[data-testid="contact-error"]')
            const messageError = wrapper.find('[data-testid="message-error"]')

            expect(nicknameError.exists()).toBe(true)
            expect(nicknameError.text()).toBeTruthy()
            expect(contactError.exists()).toBe(true)
            expect(contactError.text()).toBeTruthy()
            expect(messageError.exists()).toBe(true)
            expect(messageError.text()).toBeTruthy()

            // Property: Success message should not be shown
            // 属性：不应显示成功消息
            const successMessage = wrapper.find('[data-testid="success-message"]')
            expect(successMessage.exists()).toBe(false)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * Property 3: 表单状态切换幂等性
   *
   * 对于任意表单初始状态，连续多次点击展开按钮后，表单应始终处于展开状态（展开操作是幂等的）。
   *
   * **Validates: Requirements 2.4, 2.5**
   */
  describe('Property 3: Form State Toggle Idempotency（表单状态切换幂等性）', () => {
    it('should always be expanded after multiple expand button clicks（多次点击展开按钮后应始终处于展开状态）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机点击次数（1-20次）
          fc.integer({ min: 1, max: 20 }),
          async (clickCount) => {
            const wrapper = mount(ContactForm)

            // 初始状态验证：表单应处于收起状态
            // Property: 页面加载时表单默认收起（Requirements 2.4）
            expect(wrapper.find('[data-testid="expand-button"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="contact-form"]').exists()).toBe(false)

            // 执行多次点击展开按钮
            for (let i = 0; i < clickCount; i++) {
              const expandButton = wrapper.find('[data-testid="expand-button"]')
              
              // 如果展开按钮存在，点击它
              if (expandButton.exists()) {
                await expandButton.trigger('click')
                await wrapper.vm.$nextTick()
              }
              // 如果表单已展开，展开按钮不存在，这是预期行为
            }

            // Property: 连续多次点击展开按钮后，表单应始终处于展开状态
            // 展开操作是幂等的 - 无论点击多少次，最终状态都是展开
            const form = wrapper.find('[data-testid="contact-form"]')
            const expandButton = wrapper.find('[data-testid="expand-button"]')

            // 验证表单处于展开状态
            expect(form.exists()).toBe(true)
            // 展开后，展开按钮应该不存在（被表单替代）
            expect(expandButton.exists()).toBe(false)

            // 验证表单包含所有必要字段（Requirements 2.6）
            expect(wrapper.find('[data-testid="nickname-input"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="contact-input"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="message-input"]').exists()).toBe(true)
            expect(wrapper.find('[data-testid="submit-button"]').exists()).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should maintain expanded state regardless of initial state（无论初始状态如何，展开后应保持展开状态）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的初始展开状态和后续点击次数
          fc.record({
            startExpanded: fc.boolean(),
            additionalClicks: fc.integer({ min: 0, max: 10 })
          }),
          async ({ startExpanded, additionalClicks }) => {
            const wrapper = mount(ContactForm)

            // 如果需要从展开状态开始，先点击展开按钮
            if (startExpanded) {
              const expandButton = wrapper.find('[data-testid="expand-button"]')
              if (expandButton.exists()) {
                await expandButton.trigger('click')
                await wrapper.vm.$nextTick()
              }
            }

            // 记录当前状态
            const wasExpanded = wrapper.find('[data-testid="contact-form"]').exists()

            // 执行额外的点击操作
            for (let i = 0; i < additionalClicks; i++) {
              const expandButton = wrapper.find('[data-testid="expand-button"]')
              if (expandButton.exists()) {
                await expandButton.trigger('click')
                await wrapper.vm.$nextTick()
              }
            }

            // Property: 如果初始状态是展开的，或者执行了至少一次点击，最终状态应该是展开的
            // 这验证了展开操作的幂等性
            if (wasExpanded || additionalClicks > 0 || startExpanded) {
              const form = wrapper.find('[data-testid="contact-form"]')
              expect(form.exists()).toBe(true)
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should show expand button only when collapsed（仅在收起状态显示展开按钮）', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机点击序列
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          async (clickSequence) => {
            const wrapper = mount(ContactForm)

            let hasClickedExpand = false

            for (const shouldClick of clickSequence) {
              if (shouldClick) {
                const expandButton = wrapper.find('[data-testid="expand-button"]')
                if (expandButton.exists()) {
                  await expandButton.trigger('click')
                  await wrapper.vm.$nextTick()
                  hasClickedExpand = true
                }
              }
            }

            // Property: 展开按钮和表单是互斥的
            // 要么显示展开按钮（收起状态），要么显示表单（展开状态）
            const expandButton = wrapper.find('[data-testid="expand-button"]')
            const form = wrapper.find('[data-testid="contact-form"]')

            // 互斥性验证
            expect(expandButton.exists() !== form.exists()).toBe(true)

            // 如果点击过展开按钮，表单应该存在
            if (hasClickedExpand) {
              expect(form.exists()).toBe(true)
              expect(expandButton.exists()).toBe(false)
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should be idempotent - clicking expand multiple times has same effect as clicking once（幂等性 - 多次点击与单次点击效果相同）', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 50 }),
          async (clickCount) => {
            // 创建两个独立的组件实例
            const wrapperSingle = mount(ContactForm)
            const wrapperMultiple = mount(ContactForm)

            // 单次点击
            const singleExpandButton = wrapperSingle.find('[data-testid="expand-button"]')
            await singleExpandButton.trigger('click')
            await wrapperSingle.vm.$nextTick()

            // 多次点击
            for (let i = 0; i < clickCount; i++) {
              const multipleExpandButton = wrapperMultiple.find('[data-testid="expand-button"]')
              if (multipleExpandButton.exists()) {
                await multipleExpandButton.trigger('click')
                await wrapperMultiple.vm.$nextTick()
              }
            }

            // Property: 幂等性 - 单次点击和多次点击的最终状态应该相同
            const singleForm = wrapperSingle.find('[data-testid="contact-form"]')
            const multipleForm = wrapperMultiple.find('[data-testid="contact-form"]')

            expect(singleForm.exists()).toBe(multipleForm.exists())
            expect(singleForm.exists()).toBe(true)

            // 验证两个实例的表单字段都存在
            expect(wrapperSingle.find('[data-testid="nickname-input"]').exists()).toBe(true)
            expect(wrapperMultiple.find('[data-testid="nickname-input"]').exists()).toBe(true)
            expect(wrapperSingle.find('[data-testid="contact-input"]').exists()).toBe(true)
            expect(wrapperMultiple.find('[data-testid="contact-input"]').exists()).toBe(true)
            expect(wrapperSingle.find('[data-testid="message-input"]').exists()).toBe(true)
            expect(wrapperMultiple.find('[data-testid="message-input"]').exists()).toBe(true)
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
