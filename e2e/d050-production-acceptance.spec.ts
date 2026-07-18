import { expect, test, type Browser, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const baseURL = required('D050_BASE_URL')
const primaryToken = decodedSecret('D050_PRIMARY_TOKEN_B64')
const deleteToken = decodedSecret('D050_DELETE_TOKEN_B64')
const deleteId = required('D050_DELETE_ID')
const expectedPortalRevision = required('D050_EXPECTED_PORTAL_REVISION')
const expectedBackendRevision = required('D050_EXPECTED_BACKEND_REVISION')
const prompt = 'D050 生产验收：请用一句话确认你会继续陪伴我，并保持当前角色口吻。'

test('D050 生产桌面、移动、导出与整用户删除全链', async ({ browser }) => {
  const evidence: Record<string, unknown> = {
    tested_at: new Date().toISOString(),
    base_url: baseURL,
    portal_revision: '',
    backend_revision: '',
    schema_phase: '',
    growth_phase: '',
    desktop: {},
    mobile: {},
    conversation: { user: prompt, agent: '' },
    export: {},
    deletion: {},
  }

  const health = await fetchJson(`${baseURL}/api/health`)
  expect(health.backend_revision).toBe(expectedBackendRevision)
  expect(health.persona_schema_phase).toBe('active')
  expect(health.persona_growth?.phase).toBe('active')
  expect(health.persona_growth?.ready).toBe(true)
  expect(health.host?.heartbeat?.first_fire_ok).toBe(true)
  const portalRevision = (await fetch('https://hi-veblen.com/release.txt')).text()
  expect((await portalRevision).trim()).toBe(expectedPortalRevision)
  evidence.portal_revision = expectedPortalRevision
  evidence.backend_revision = health.backend_revision
  evidence.schema_phase = health.persona_schema_phase
  evidence.growth_phase = health.persona_growth.phase

  await verifyPortal(browser, evidence)
  await persistEvidence(evidence)
  await verifyDesktop(browser, evidence)
  await persistEvidence(evidence)
  await verifyMobile(browser, evidence)
  await persistEvidence(evidence)
  await verifyDeletion(browser, evidence)
  await persistEvidence(evidence)
})

async function verifyPortal(browser: Browser, evidence: Record<string, unknown>) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.goto('https://hi-veblen.com', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('link', { name: 'ENTER LINGXI' })).toHaveAttribute(
    'href',
    'https://lingxi.hi-veblen.com/'
  )
  await expect(page.getByTestId('route-distortion-canvas')).toBeAttached()
  const geometry = await viewportGeometry(page)
  expect(geometry.overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'd050-portal.png', fullPage: true })
  evidence.portal_browser = { viewport: geometry, console_error_count: consoleErrors.length }
  expect(consoleErrors).toEqual([])
  await context.close()
}

async function verifyDesktop(browser: Browser, evidence: Record<string, unknown>) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  const me = await login(page, primaryToken, 'p6_e2e_cn')
  await acceptGeneralConsentIfNeeded(page)
  expect(me.onboarding?.completed).toBe(true)
  const retiredControls = await probeRetiredControls(page, 'p6_e2e_cn')
  const input = page.getByRole('textbox', { name: '输入消息' })
  await expect(input).toBeEnabled({ timeout: 60_000 })

  const geometry = await viewportGeometry(page)
  expect(geometry.overflow).toBeLessThanOrEqual(1)
  const liveAgents = page.locator('.msg-row:not(.self):not(.is-history)')
  const before = await liveAgents.count()
  await input.fill(prompt)
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect.poll(() => liveAgents.count(), { timeout: 5 * 60 * 1000 }).toBeGreaterThan(before)
  await expect(page.locator('.typing-bubble')).toHaveCount(0, { timeout: 5 * 60 * 1000 })
  const agentRow = liveAgents.last()
  const replyParts = await agentRow.locator('.bubble:not(.typing-bubble)').allTextContents()
  const reply = replyParts
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n')
  expect(reply.length).toBeGreaterThan(0)

  const exportResponse = page.waitForResponse(
    response =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/export'
  )
  const exportButton = page.getByRole('button', { name: '导出本次会话' })
  await expect(exportButton).toBeEnabled({ timeout: 60_000 })
  await exportButton.click()
  const exportResult = await (await exportResponse).json()
  expect(exportResult.ok).toBe(true)
  await expect(page.getByText(/已导出本次会话/)).toBeVisible()

  await page.getByRole('button', { name: '角色档案' }).click()
  await expect(page.getByRole('heading', { name: '自主成长记录' })).toBeVisible()
  await expect(page.getByText('成长没有审批、否决或人格回滚入口。')).toBeVisible()
  const growthConsent = page.getByText('已接受自主成长')
  if (!(await growthConsent.isVisible().catch(() => false))) {
    await page.locator('.persona-growth__acceptance input[type="checkbox"]').check()
    await page.getByRole('button', { name: '启用自主成长' }).click()
    await expect(growthConsent).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /审批|否决|人格回滚/ })).toHaveCount(0)
  const growthGeometry = await viewportGeometry(page)
  expect(growthGeometry.overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'd050-desktop.png', fullPage: true })

  evidence.desktop = {
    chat_viewport: geometry,
    growth_viewport: growthGeometry,
    console_error_count: consoleErrors.length,
  }
  evidence.conversation = { user: prompt, agent: reply }
  evidence.export = { ok: true, path_returned: Boolean(exportResult.path) }
  evidence.retired_persona_controls = retiredControls
  expect(typeof exportResult.path).toBe('string')
  expect(exportResult.path.length).toBeGreaterThan(0)
  expect(consoleErrors).toEqual([])
  await context.close()
}

async function verifyMobile(browser: Browser, evidence: Record<string, unknown>) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await login(page, primaryToken, 'p6_e2e_cn')
  await acceptGeneralConsentIfNeeded(page)
  await expect(page.getByRole('textbox', { name: '输入消息' })).toBeEnabled({ timeout: 60_000 })
  const geometry = await viewportGeometry(page)
  expect(geometry.overflow).toBeLessThanOrEqual(1)
  await page.getByRole('button', { name: '角色档案' }).click()
  await expect(page.getByRole('heading', { name: '自主成长记录' })).toBeVisible()
  const growthGeometry = await viewportGeometry(page)
  expect(growthGeometry.overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'd050-mobile.png', fullPage: true })
  evidence.mobile = {
    chat_viewport: geometry,
    growth_viewport: growthGeometry,
    console_error_count: consoleErrors.length,
  }
  expect(consoleErrors).toEqual([])
  await context.close()
}

async function verifyDeletion(browser: Browser, evidence: Record<string, unknown>) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await login(page, deleteToken, deleteId)

  const decline = page.getByRole('button', { name: '拒绝并删除数据' })
  let confirmText = '删除我的全部数据'
  let finalButton = page.getByRole('button', { name: '永久删除' })
  if (await decline.isVisible().catch(() => false)) {
    await decline.click()
    confirmText = '拒绝并删除我的全部数据'
    finalButton = page.getByRole('button', { name: '永久删除并退出' })
  } else {
    await page.getByRole('button', { name: '数据与隐私' }).click()
    await page.getByRole('button', { name: '删除我的全部数据' }).click()
  }

  await page.locator('.delete-confirm input, .consent-delete input').fill(confirmText)
  const deleteResponse = page.waitForResponse(
    response =>
      response.request().method() === 'DELETE' && new URL(response.url()).pathname === '/api/me'
  )
  await finalButton.click()
  const response = await deleteResponse
  expect(response.status()).toBe(200)
  const result = await response.json()
  expect(result.ok).toBe(true)
  expect(result.deleted).toBe(true)
  expect(result.precise_event_delete_supported).toBe(false)
  expect(result.audit_retained).toBe(true)
  expect(Number(result.tokens_revoked || 0)).toBeGreaterThanOrEqual(1)
  expect(Number(result.browser_sessions_invalidated || 0)).toBeGreaterThanOrEqual(1)
  await expect(page.getByRole('heading', { name: '进入你的会话' })).toBeVisible({ timeout: 60_000 })

  const meStatus = await context.request.get(`${baseURL}/api/me`)
  expect(meStatus.status()).toBe(401)
  const revokedResponse = page.waitForResponse(
    item => item.request().method() === 'POST' && new URL(item.url()).pathname === '/api/session'
  )
  await page.getByPlaceholder('输入内测 Token').fill(deleteToken)
  await page.getByRole('button', { name: '进入灵犀' }).click()
  expect((await revokedResponse).status()).toBe(401)
  await expect(page.getByText('token 无效或已关闭')).toBeVisible()
  await page.screenshot({ path: 'd050-delete-complete.png', fullPage: true })

  evidence.deletion = {
    persist_id: deleteId,
    deleted: true,
    tokens_revoked: Number(result.tokens_revoked || 0),
    gateway_sessions_invalidated: Number(result.gateway_sessions_invalidated || 0),
    browser_sessions_invalidated: Number(result.browser_sessions_invalidated || 0),
    precise_event_delete_supported: false,
    audit_retained: true,
    relogin_status: 401,
  }
  await context.close()
}

async function login(page: Page, token: string, expectedId: string) {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '进入你的会话' })).toBeVisible()
  await page.getByPlaceholder('输入内测 Token').fill(token)
  await page.getByRole('button', { name: '进入灵犀' }).click()
  await expect
    .poll(
      async () => {
        return page.evaluate(async () => (await fetch('/api/me', { cache: 'no-store' })).status)
      },
      { timeout: 60_000 }
    )
    .toBe(200)
  const me = await page.evaluate(async () => {
    const response = await fetch('/api/me', { cache: 'no-store' })
    return response.json()
  })
  expect(me.ok).toBe(true)
  expect(me.scope).toBe('user')
  expect(me.persist_id).toBe(expectedId)
  expect(objectKeys(me).some(key => /token|token_hash/i.test(key))).toBe(false)
  return me
}

async function acceptGeneralConsentIfNeeded(page: Page) {
  const continueButton = page.getByRole('button', { name: '同意并继续' })
  if (await continueButton.isVisible().catch(() => false)) {
    await page.locator('.consent-check input[type="checkbox"]').check()
    await continueButton.click()
  }
}

async function viewportGeometry(page: Page) {
  return page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scroll_width: document.documentElement.scrollWidth,
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }))
}

async function probeRetiredControls(page: Page, persistId: string) {
  const probes = [
    ['GET', '/api/persona/calibration'],
    ['POST', '/api/persona/calibration/rollback'],
    ['POST', '/api/persona/drift/proposal'],
    ['POST', '/api/persona/learning/restore'],
  ]
  const results = await page.evaluate(
    async ({ expectedPersistId, requests }) => {
      return Promise.all(
        requests.map(async ([method, path]) => {
          const response = await fetch(path, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Lingxi-Expected-Persist-Id': expectedPersistId,
            },
            body: method === 'GET' ? undefined : '{invalid-json',
          })
          return {
            path,
            status: response.status,
            cache_control: response.headers.get('cache-control') || '',
          }
        })
      )
    },
    { expectedPersistId: persistId, requests: probes }
  )
  for (const result of results) {
    expect(result.status).toBe(410)
    expect(result.cache_control).toContain('private')
    expect(result.cache_control).toContain('no-store')
  }
  return results
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  expect(response.ok).toBe(true)
  return response.json()
}

async function persistEvidence(evidence: Record<string, unknown>) {
  await writeFile('d050-production-evidence.json', `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
}

function required(name: string) {
  const value = String(process.env[name] || '').trim()
  if (!value) throw new Error(`缺少环境变量：${name}`)
  return value
}

function decodedSecret(name: string) {
  const encoded = required(name)
  const value = Buffer.from(encoded, 'base64').toString('utf8')
  if (!value || Buffer.from(value, 'utf8').toString('base64') !== encoded) {
    throw new Error(`环境变量不是规范 Base64：${name}`)
  }
  return value
}

function objectKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(objectKeys)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, nested]) => [key, ...objectKeys(nested)])
}
