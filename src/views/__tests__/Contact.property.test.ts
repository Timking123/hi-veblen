import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import * as fc from 'fast-check'
import Contact from '../Contact.vue'

// 保留需求 12.2、12.3、12.5 的下载行为，路径遵循当前公共简历位置。
// 文件检查和链接点击均为合成替身，不访问服务器、不触发真实下载。
enableAutoUnmount(afterEach)
const fetchMock = vi.fn()
let downloads: HTMLAnchorElement[]
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset().mockResolvedValue({ ok: true, status: 200 })
  downloads = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    downloads.push(this)
  })
})
afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const downloadButton = (wrapper: ReturnType<typeof mount>) => {
  const button = wrapper.findAll('button').find(item => item.text().includes('RESUME'))
  expect(button, '简历下载入口应存在').toBeDefined()
  return button!
}

describe('Contact Property Tests', () => {
  it('文件预检查超过十秒时取消请求并允许重试', async () => {
    fetchMock.mockImplementationOnce((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('请求已取消', 'AbortError')))
    }))
    const wrapper = mount(Contact)
    const button = downloadButton(wrapper)
    await button.trigger('click')
    await vi.advanceTimersByTimeAsync(9999)
    expect(button.attributes('disabled')).toBeDefined()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('下载失败')
    expect(button.attributes('disabled')).toBeUndefined()
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    await button.trigger('click')
    await flushPromises()
    expect(downloads).toHaveLength(1)
  })

  it.each(['success', 'failure'])('卸载后未完成请求不得下载或创建反馈定时器：%s', async result => {
    let resolveRequest!: (value: { ok: boolean; status: number }) => void
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveRequest = resolve }))
    const wrapper = mount(Contact)
    await downloadButton(wrapper).trigger('click')
    wrapper.unmount()
    const feedbackTimer = vi.spyOn(window, 'setTimeout')
    feedbackTimer.mockClear()
    resolveRequest({ ok: result === 'success', status: result === 'success' ? 200 : 404 })
    await flushPromises()
    expect(downloads).toHaveLength(0)
    expect(feedbackTimer).not.toHaveBeenCalledWith(expect.any(Function), 3000)
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('点击下载后触发 PDF 下载并反馈成功状态', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 1000000 }), async timestamp => {
        vi.setSystemTime(timestamp)
        fetchMock.mockClear()
        downloads = []
        const wrapper = mount(Contact)
        const button = downloadButton(wrapper)
        expect(button.attributes('disabled')).toBeUndefined()
        await button.trigger('click')
        await flushPromises()
        expect(downloads).toHaveLength(1)
        const url = new URL(downloads[0].href)
        expect(url.pathname).toBe('/resume.pdf')
        expect(url.searchParams.get('t')).toBe(String(timestamp))
        expect(downloads[0].download).toBe('黄彦杰-个人简历.pdf')
        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/resume.pdf?t=${timestamp}`, {
          method: 'HEAD',
          cache: 'no-store',
          signal: expect.any(AbortSignal),
        })
        expect(wrapper.get('[role="status"]').text()).toContain('已发起 PDF 下载')
        expect(downloads[0].isConnected).toBe(false)
        wrapper.unmount()
      }),
      { numRuns: 10 }
    )
  })

  it.each(['missing', 'network'])('下载失败显示错误且允许重试：%s', async failure => {
    if (failure === 'missing') fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })
    else fetchMock.mockRejectedValueOnce(new Error('合成网络故障'))
    const wrapper = mount(Contact)
    const button = downloadButton(wrapper)
    await button.trigger('click')
    await flushPromises()
    expect(downloads).toHaveLength(0)
    expect(wrapper.get('[role="alert"]').text()).toContain('下载失败')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(button.attributes('disabled')).toBeUndefined()
    await button.trigger('click')
    await flushPromises()
    expect(downloads).toHaveLength(1)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('下载期间禁用按钮并拦截连续操作，完成后恢复', async () => {
    let resolveRequest!: (value: { ok: boolean; status: number }) => void
    fetchMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve
        })
    )
    const wrapper = mount(Contact)
    const button = downloadButton(wrapper)
    try {
      // 同一渲染周期的两次点击也只能发起一次文件检查。
      await Promise.all([button.trigger('click'), button.trigger('click')])
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.text()).toContain('OPENING')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(downloads).toHaveLength(0)
    } finally {
      resolveRequest?.({ ok: true, status: 200 })
      await flushPromises()
    }
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('移动设备使用安全的新标签页下载机制', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('iPhone', 'iPad', 'iPod', 'Android', 'iPhone Safari', 'Android Chrome'),
        async device => {
          vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`Mozilla/5.0 (${device})`)
          const wrapper = mount(Contact)
          await downloadButton(wrapper).trigger('click')
          await flushPromises()
          expect(downloads.at(-1)?.target).toBe('_blank')
          expect(downloads.at(-1)?.rel).toBe('noopener noreferrer')
          wrapper.unmount()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('成功提示在反馈期限后清除', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const wrapper = mount(Contact)
        await downloadButton(wrapper).trigger('click')
        await flushPromises()
        expect(wrapper.get('[role="status"]').text()).toContain('已发起 PDF 下载')
        await vi.advanceTimersByTimeAsync(2999)
        expect(wrapper.find('[role="status"]').exists()).toBe(true)
        await vi.advanceTimersByTimeAsync(1)
        expect(wrapper.find('[role="status"]').exists()).toBe(false)
        expect(downloadButton(wrapper).text()).toContain('DOWNLOAD')
        wrapper.unmount()
      }),
      { numRuns: 5 }
    )
  })

  it('错误提示在反馈期限后清除', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })
        const wrapper = mount(Contact)
        await downloadButton(wrapper).trigger('click')
        await flushPromises()
        expect(wrapper.find('[role="alert"]').exists()).toBe(true)
        await vi.advanceTimersByTimeAsync(2999)
        expect(wrapper.find('[role="alert"]').exists()).toBe(true)
        await vi.advanceTimersByTimeAsync(1)
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
        wrapper.unmount()
      }),
      { numRuns: 5 }
    )
  })

  it('下载文件名包含个人姓名和 PDF 扩展名', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const wrapper = mount(Contact)
        await downloadButton(wrapper).trigger('click')
        await flushPromises()
        expect(downloads.at(-1)?.download).toBe('黄彦杰-个人简历.pdf')
        wrapper.unmount()
      }),
      { numRuns: 10 }
    )
  })
})
