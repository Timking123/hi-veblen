import { test, expect } from '@playwright/test'

const fixture = 'http://127.0.0.1:4187/e2e/fixtures/legacy-components.html'

test('音频慢加载时暂停入口等待就绪，开始后暂停会停止更新', async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.clearRect
    Object.assign(window, { gameDrawCount: 0 })
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains('game-canvas')) {
        ;(window as unknown as { gameDrawCount: number }).gameDrawCount++
      }
      return original.apply(this, args)
    }
  })
  let release: (() => void) | undefined
  const pending = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/audio/**', async route => {
    await pending
    await route.fulfill({ status: 404, body: '' })
  })
  await page.goto(`${fixture}?component=game`, { waitUntil: 'domcontentloaded' })
  const pause = page.getByRole('button', { name: '暂停游戏', exact: true })
  await expect(pause).toBeVisible()
  await expect(pause)
    .toBeDisabled()
    .finally(() => release!())
  await page.mouse.click(1, 1)
  await expect(pause).toBeEnabled()
  await pause.click()
  await expect(page.locator('.pause-overlay')).toBeVisible()
  const drawnFrames = () =>
    page.evaluate(() => (window as unknown as { gameDrawCount: number }).gameDrawCount)
  const initial = await drawnFrames()
  expect(initial).toBeGreaterThan(0)
  await page.waitForTimeout(250)
  expect(await drawnFrames()).toBe(initial)
  await page.getByRole('button', { name: '继续游戏', exact: true }).click()
  await expect(page.locator('.game-hud')).toBeVisible()
  await expect.poll(drawnFrames).toBeGreaterThan(initial)
})

test('游戏 HUD 在窄屏与横屏内互不遮挡，操作提示文字完整', async ({ page }, testInfo) => {
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 667, height: 375 },
    { width: 320, height: 667 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(`${fixture}?component=game`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.game-hud')).toBeVisible()
    // 真实用户激活音频上下文，坐标点击不等待教程自动收起。
    await page.mouse.click(1, 1)
    await expect(page.locator('.controls-panel')).toBeVisible()
    const boxes = await page
      .locator(
        '.health-display, .score-display, .missile-display, .music-toggle-button, .pause-game-button, .nuke-progress, .stage-info'
      )
      .evaluateAll(elements =>
        elements.map(element => {
          const rect = element.getBoundingClientRect()
          return {
            name: element.className,
            x: rect.x,
            y: rect.y,
            right: rect.right,
            bottom: rect.bottom,
          }
        })
      )
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i]
      expect.soft(box.x, box.name).toBeGreaterThanOrEqual(0)
      expect.soft(box.right, box.name).toBeLessThanOrEqual(viewport.width)
      for (const other of boxes.slice(i + 1)) {
        const overlap =
          box.x < other.right && box.right > other.x && box.y < other.bottom && box.bottom > other.y
        expect.soft(overlap, `${box.name} 遮挡 ${other.name}`).toBe(false)
      }
    }
    for (const description of await page.locator('.controls-panel .desc').all()) {
      const wraps = await description.evaluate(element => {
        const range = document.createRange()
        range.selectNodeContents(element)
        return range.getClientRects().length
      })
      expect.soft(wraps, '操作说明不应逐字换行').toBe(1)
    }
    await page.screenshot({ path: testInfo.outputPath(`hud-${viewport.width}.png`) })
    await page.getByRole('button', { name: '收起操作说明' }).click()
    await expect(page.locator('.controls-panel')).toHaveCount(0)
    // 合成刘海与底部安全区只验证 CSS 布局，不代替真实设备验收。
    await page.addStyleTag({
      content:
        ':root { --safe-area-inset-top: 24px; --safe-area-inset-bottom: 20px; --safe-area-inset-left: 20px; --safe-area-inset-right: 20px; }',
    })
    for (const item of await page.locator('.game-hud > div').all()) {
      const box = await item.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(20)
      expect(box!.y).toBeGreaterThanOrEqual(24)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width - 20)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height - 20)
    }
  }
})

test('手机教程不拦截真实触摸，旋屏后触点更新且暂停入口可用', async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(!isMobile, '仅触屏项目验证真实触摸输入')
  // 只观察真正绘制出的按钮中心，不替换输入管理器或游戏循环。
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText
    const labels: Record<string, { x: number; y: number }> = {}
    Object.assign(window, { drawnGameButtons: labels })
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.classList.contains('game-canvas') && ['FIRE', 'MSL', 'NUKE'].includes(text)) {
        labels[text] = { x, y }
      }
      return maxWidth === undefined
        ? original.call(this, text, x, y)
        : original.call(this, text, x, y, maxWidth)
    }
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${fixture}?component=game`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.game-hud')).toBeVisible()
  await page.mouse.click(1, 1)
  await expect(page.getByText('触屏操作', { exact: true })).toBeVisible()
  await expect(page.locator('.controls-panel')).toContainText('长按 FIRE')
  const cdp = await context.newCDPSession(page)
  const pressMissile = async () => {
    const point = await page.locator('.game-canvas').evaluate(element => {
      const canvas = element as HTMLCanvasElement
      const rect = canvas.getBoundingClientRect()
      const button = (
        window as unknown as { drawnGameButtons: Record<string, { x: number; y: number }> }
      ).drawnGameButtons.MSL
      return {
        x:
          rect.left +
          canvas.clientLeft +
          (button.x * (rect.width - canvas.clientLeft * 2)) / canvas.width,
        y:
          rect.top +
          canvas.clientTop +
          ((button.y + 26) * (rect.height - canvas.clientTop * 2)) / canvas.height,
      }
    })
    const before = Number(await page.locator('.missile-text').innerText())
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    await expect(page.locator('.missile-text')).toHaveText(String(before - 1))
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await pressMissile()
  for (const viewport of [
    { width: 667, height: 375 },
    { width: 375, height: 812 },
    { width: 320, height: 667 },
  ]) {
    await page.setViewportSize(viewport)
    await expect(page.locator('.pause-overlay')).toBeVisible()
    await expect(page.locator('.controls-panel')).toHaveCount(0)
    await page.getByRole('button', { name: '继续游戏' }).tap()
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as unknown as { drawnGameButtons: Record<string, { x: number }> })
              .drawnGameButtons.MSL.x
        )
      )
      .toBe(viewport.width === 667 ? 370 : viewport.width === 320 ? 208 : 257)
    await pressMissile()
    await page.getByRole('button', { name: '暂停游戏', exact: true }).tap()
    await expect(page.locator('.pause-overlay')).toBeVisible()
    await page.getByRole('button', { name: '继续游戏' }).tap()
  }
  await cdp.detach()
})

test('生产 Game.exe 经规则页进入游戏并可暂停退出', async ({ page, isMobile }) => {
  await page.goto('/os')
  await page.getByText('Game.exe', { exact: true }).dblclick()
  await page.getByText('LAUNCH GAME PROTOCOL', { exact: true }).click()
  await expect(page.locator('.rules-window')).toBeVisible()
  await page.locator('.rules-window').click()
  await page.locator('.continue-prompt').click()
  await expect(page.locator('.game-hud')).toBeVisible()
  await expect(page.locator('.controls-panel h3')).toHaveText(isMobile ? '触屏操作' : '操作说明')
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click()
  await expect(page.locator('.pause-overlay')).toBeVisible()
  await expect(page.locator('.controls-panel')).toHaveCount(0)
  await page.getByRole('button', { name: '继续游戏', exact: true }).click()
  await expect(page.locator('.game-hud')).toBeVisible()
  await page.getByRole('button', { name: '暂停游戏', exact: true }).click()
  await page
    .locator('.pause-overlay')
    .getByRole('button', { name: '退出游戏', exact: true })
    .click()
  await expect(page.locator('.game-container.game-active')).toHaveCount(0)
})

test.beforeEach(async ({ context }) => {
  // 只允许本地静态资源；API 与简历响应在各用例中使用合成数据。
  await context.route('**/*', route => {
    const host = new URL(route.request().url()).hostname
    return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort()
  })
})

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'passed') {
    const path = testInfo.outputPath('verified.png')
    await page.screenshot({ path, fullPage: true })
    await testInfo.attach('已验证页面', { path, contentType: 'image/png' })
  }
})

test('生产联系页下载失败后可重试，成功触发真实浏览器下载', async ({ page }) => {
  let status = 404
  let heads = 0
  await page.route('**/resume.pdf?*', route => {
    if (route.request().method() === 'HEAD') heads++
    return route.fulfill({
      status,
      contentType: 'application/pdf',
      body: status === 200 ? '%PDF-1.4\n% synthetic resume\n%%EOF' : '',
    })
  })
  await page.goto('/contact')
  const button = page.getByRole('button', { name: '下载简历 PDF' })
  await button.click()
  await expect(page.getByRole('alert')).toHaveText('下载失败，请稍后重试')
  await expect(button).toBeEnabled()
  status = 200
  const downloaded = page.waitForEvent('download')
  await button.click()
  const download = await downloaded
  expect(download.suggestedFilename()).toMatch(/个人简历\.pdf$/)
  expect(await download.failure()).toBeNull()
  await expect(page.getByRole('status')).toHaveText('已发起 PDF 下载')
  expect(heads).toBe(2)
  await expect(page.locator('body > a[download]')).toHaveCount(0)
})

test('生产联系页等待请求时拒绝连续点击，网络失败后恢复', async ({ page }) => {
  let heads = 0
  let release: (() => void) | undefined
  const pending = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/resume.pdf?*', async route => {
    heads++
    await pending
    await route.abort('failed')
  })
  await page.goto('/contact')
  const button = page.getByRole('button', { name: '下载简历 PDF' })
  await button.evaluate(element => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await expect(button).toBeDisabled()
  await expect.poll(() => heads).toBe(1)
  release!()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(button).toBeEnabled()
})

test('独立留言组件保留失败输入，重试成功且同轮提交仅产生一个请求', async ({ page }) => {
  let requests = 0
  const payloads: unknown[] = []
  await page.route('**/api/messages/submit', async route => {
    requests++
    payloads.push(route.request().postDataJSON())
    await route.fulfill({
      status: requests === 1 ? 500 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        requests === 1 ? { message: '合成服务暂不可用' } : { success: true, id: 1 }
      ),
    })
  })
  await page.goto(`${fixture}?component=form`)
  await page.getByTestId('expand-button').click()
  await page.getByTestId('nickname-input').fill(' 合成访客 ')
  await page.getByTestId('contact-input').fill(' qa@example.invalid ')
  await page.getByTestId('message-input').fill(' 浏览器合成留言 ')
  await page.getByTestId('contact-form').evaluate(element => {
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await expect(page.getByTestId('error-message')).toContainText('合成服务暂不可用')
  expect(requests).toBe(1)
  await expect(page.getByTestId('message-input')).toHaveValue(' 浏览器合成留言 ')
  await page.getByTestId('retry-button').click()
  await expect(page.getByTestId('success-message')).toBeVisible()
  expect(requests).toBe(2)
  expect(payloads).toEqual(
    Array(2).fill({
      nickname: '合成访客',
      contact: 'qa@example.invalid',
      message: '浏览器合成留言',
    })
  )
  await expect(page.getByTestId('message-input')).toHaveValue('')
})

test('独立游戏组件执行真实键盘移动、边界更新与晚帧错误恢复', async ({ page, isMobile }) => {
  await page.goto(`${fixture}?component=game`)
  await expect(page.locator('.game-hud')).toBeVisible()
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { legacyGameSnapshot?: unknown }).legacyGameSnapshot ===
      'function'
  )
  const position = () =>
    page.evaluate(() =>
      (
        window as unknown as {
          legacyGameSnapshot(): { x: number; y: number; width: number; height: number }
        }
      ).legacyGameSnapshot()
    )
  const initial = await position()
  const touchJoystick = async (type: 'touchstart' | 'touchend') =>
    page.locator('.game-canvas').evaluate((element, eventType) => {
      const canvas = element as HTMLCanvasElement
      const rect = canvas.getBoundingClientRect()
      const touch = new Touch({
        identifier: 1,
        target: canvas,
        clientX: rect.left + 145,
        clientY: rect.top + canvas.height - 100,
      })
      canvas.dispatchEvent(
        new TouchEvent(eventType, {
          bubbles: true,
          cancelable: true,
          changedTouches: [touch],
          touches: eventType === 'touchend' ? [] : [touch],
        })
      )
    }, type)
  if (isMobile) await touchJoystick('touchstart')
  else await page.keyboard.down('d')
  await expect.poll(async () => (await position()).x).toBeGreaterThan(initial.x)
  if (isMobile) await touchJoystick('touchend')
  else await page.keyboard.up('d')
  const released = await position()
  await page.keyboard.press('p')
  await expect(page.locator('.pause-overlay')).toBeVisible()
  await page.getByRole('button', { name: '继续游戏' }).click()
  expect((await position()).x).toBeCloseTo(released.x, 0)
  await page.setViewportSize(isMobile ? { width: 360, height: 740 } : { width: 900, height: 650 })
  await expect(page.locator('.pause-overlay')).toBeVisible()
  await page.getByRole('button', { name: '继续游戏' }).click()
  const bounded = await position()
  const canvas = await page.locator('.game-canvas').evaluate(element => ({
    width: (element as HTMLCanvasElement).width,
    height: (element as HTMLCanvasElement).height,
  }))
  expect(bounded.x + bounded.width).toBeLessThanOrEqual(canvas.width)
  expect(bounded.y + bounded.height).toBeLessThanOrEqual(canvas.height)
  const generation = () =>
    page.evaluate(
      () => (window as unknown as { legacyGameGeneration: number }).legacyGameGeneration
    )
  const beforeRetry = await generation()
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains('game-canvas')) {
        CanvasRenderingContext2D.prototype.clearRect = original
        throw new Error('合成的晚帧绘制失败')
      }
      return original.apply(this, args)
    }
  })
  await expect(page.locator('.error-overlay')).toContainText('游戏运行时发生错误')
  await page.locator('.error-overlay button').filter({ hasText: '重试' }).click()
  await expect(page.locator('.error-overlay')).toHaveCount(0)
  await expect(page.locator('.game-hud')).toBeVisible()
  await expect(page.locator('.health-text')).toHaveText('10/10')
  await expect.poll(generation).toBeGreaterThan(beforeRetry)
  const restarted = await position()
  if (isMobile) await touchJoystick('touchstart')
  else await page.keyboard.down('d')
  await expect.poll(async () => (await position()).x).toBeGreaterThan(restarted.x)
  if (isMobile) await touchJoystick('touchend')
  else await page.keyboard.up('d')
})
