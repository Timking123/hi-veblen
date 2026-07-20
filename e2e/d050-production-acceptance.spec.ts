import { expect, test, type Browser, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const baseURL = required('D050_BASE_URL')
const primaryId = required('D050_PRIMARY_ID')
const primaryToken = decodedSecret('D050_PRIMARY_TOKEN_B64')
const deleteToken = decodedSecret('D050_DELETE_TOKEN_B64')
const deleteId = required('D050_DELETE_ID')
const acceptanceMode = required('D050_ACCEPTANCE_MODE')
const expectedPortalRevision = required('D050_EXPECTED_PORTAL_REVISION')
const expectedBackendRevision = required('D050_EXPECTED_BACKEND_REVISION')
const prompt = 'D050 生产验收：请用一句话确认你会继续陪伴我，并保持当前角色口吻。'
const postRebindPrompt = 'D050 私有角色换绑验收：请继续用当前角色口吻回应一句。'

test('D050 生产桌面、移动、导出与整用户删除全链', async ({ browser }) => {
  expect(['shared_pending', 'private_resumed']).toContain(acceptanceMode)
  const evidence: Record<string, unknown> = {
    tested_at: new Date().toISOString(),
    base_url: baseURL,
    primary_id: primaryId,
    acceptance_mode: acceptanceMode,
    portal_revision: '',
    backend_revision: '',
    schema_phase: '',
    growth_phase: '',
    revision_checks: [],
    desktop: {},
    mobile: {},
    conversation: {
      acceptance_mode: acceptanceMode,
      first_verification: { user: prompt, agent: '' },
      private_persona_verification: {},
    },
    export: {},
    deletion: {},
  }

  const health = await recordRevisionCheck(evidence, 'initial')
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
  expect(consoleErrors.length).toBe(0)
  await context.close()
}

async function verifyDesktop(browser: Browser, evidence: Record<string, unknown>) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const consoleErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  const me = await login(page, primaryToken, primaryId)
  await acceptGeneralConsentIfNeeded(page)
  expect(me.onboarding?.completed).toBe(true)
  const initialPersonaId = String(me.persona_id || '')
  const presetRoleId = String(me.role_choice?.preset_role_id || '')
  expect(initialPersonaId).not.toBe('')
  expect(presetRoleId).not.toBe('')
  if (acceptanceMode === 'shared_pending') expect(initialPersonaId).not.toMatch(/^custom_/)
  else expect(initialPersonaId).toMatch(/^custom_/)
  const retiredControls = await probeRetiredControls(page, primaryId)
  let growthGeometry: Awaited<ReturnType<typeof viewportGeometry>> | null = null
  if (acceptanceMode === 'private_resumed') {
    growthGeometry = await verifyGrowthPanel(page, evidence, initialPersonaId, presetRoleId)
    await page.getByRole('button', { name: '对话' }).click()
  }
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
  expect(exportResult.saved_to).toBeNull()
  expect(exportResult.record?.record_type).toBe('chat')
  expect(exportResult.record?.persona).toBe(initialPersonaId)
  expect(exportResult.record?.state_snapshot?.persist_id).toBe(primaryId)
  if (acceptanceMode === 'private_resumed') {
    expect(exportResult.record?.persona_growth?.schema_version).toBe('persona-growth-export-v1')
  } else {
    expect(exportResult.record).not.toHaveProperty('persona_growth')
  }
  expect(Array.isArray(exportResult.record?.turns)).toBe(true)
  expect(exportResult.record.turns.length).toBeGreaterThan(0)
  const exportedTurn = exportResult.record.turns.at(-1)
  expect(exportedTurn?.user).toBe(prompt)
  expect(Array.isArray(exportedTurn?.agent)).toBe(true)
  expect(exportedTurn.agent.join('').length).toBeGreaterThan(0)
  await expect(page.getByText(/已导出本次会话/)).toBeVisible()
  evidence.conversation = {
    acceptance_mode: acceptanceMode,
    first_verification: { user: prompt, agent: reply },
    private_persona_verification: {},
  }
  evidence.export = {
    ok: true,
    saved_to: null,
    record_type: exportResult.record.record_type,
    turn_count: exportResult.record.turns.length,
    persist_id_matches: exportResult.record.state_snapshot.persist_id === primaryId,
    persona_growth_included: Boolean(exportResult.record.persona_growth),
  }
  await persistEvidence(evidence)

  if (acceptanceMode === 'shared_pending') {
    growthGeometry = await verifyGrowthPanel(page, evidence, initialPersonaId, presetRoleId)
    await page.getByRole('button', { name: '对话' }).click()
  }
  expect(growthGeometry).not.toBeNull()
  await expect(input).toBeEnabled({ timeout: 60_000 })
  const postRebindBefore = await liveAgents.count()
  await input.fill(postRebindPrompt)
  await page.getByRole('button', { name: '发送消息' }).click()
  await expect
    .poll(() => liveAgents.count(), { timeout: 5 * 60 * 1000 })
    .toBeGreaterThan(postRebindBefore)
  await expect(page.locator('.typing-bubble')).toHaveCount(0, { timeout: 5 * 60 * 1000 })
  const postRebindReply = (
    await liveAgents.last().locator('.bubble:not(.typing-bubble)').allTextContents()
  )
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n')
  expect(postRebindReply.length).toBeGreaterThan(0)

  evidence.desktop = {
    chat_viewport: geometry,
    growth_viewport: growthGeometry,
    console_error_count: consoleErrors.length,
  }
  evidence.conversation = {
    acceptance_mode: acceptanceMode,
    first_verification: { user: prompt, agent: reply },
    private_persona_verification: { user: postRebindPrompt, agent: postRebindReply },
  }
  evidence.retired_persona_controls = retiredControls
  expect(consoleErrors.length).toBe(0)
  await context.close()
}

async function verifyGrowthPanel(
  page: Page,
  evidence: Record<string, unknown>,
  initialPersonaId: string,
  presetRoleId: string
) {
  await loadGrowthPanel(page, evidence, 'growth_load_attempts')
  await expect(page.getByRole('heading', { name: '自主成长记录' })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText('成长没有审批、否决或人格回滚入口。')).toBeVisible()
  const growthConsent = page.getByText('已接受自主成长')
  const consentAttempts: Array<{ status: number; detail: string }> = []
  if (
    acceptanceMode === 'shared_pending' &&
    !(await growthConsent.isVisible().catch(() => false))
  ) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const checkbox = page.locator('.persona-growth__acceptance input[type="checkbox"]')
      if (!(await checkbox.isChecked())) await checkbox.check()
      const responsePromise = page.waitForResponse(
        response =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/persona/growth/consent'
      )
      await page.getByRole('button', { name: '启用自主成长' }).click()
      const response = await responsePromise
      const payload = (await response.json().catch(() => ({}))) as { detail?: unknown }
      consentAttempts.push({
        status: response.status(),
        detail: String(payload.detail || '').slice(0, 200),
      })
      evidence.growth_consent_attempts = consentAttempts
      await persistEvidence(evidence)
      if (response.ok()) break
      expect([409, 502, 503]).toContain(response.status())
      await page.waitForTimeout(attempt * 1000)
      await loadGrowthPanel(page, evidence, 'growth_consent_reload_attempts', false)
      if (await growthConsent.isVisible().catch(() => false)) break
    }
    await expect(growthConsent).toBeVisible({ timeout: 60_000 })
  }
  if (acceptanceMode === 'private_resumed') await expect(growthConsent).toBeVisible()
  evidence.growth_consent_attempts = consentAttempts

  if (acceptanceMode === 'shared_pending') {
    await expect
      .poll(
        async () => {
          return page.evaluate(async () => {
            const response = await fetch('/api/me', { cache: 'no-store' })
            if (!response.ok) return ''
            const payload = await response.json()
            return String(payload.persona_id || '')
          })
        },
        { timeout: 60_000 }
      )
      .toMatch(/^custom_/)
  }
  const reboundIdentity = await page.evaluate(async () => {
    const response = await fetch('/api/me', { cache: 'no-store' })
    return response.json()
  })
  const privatePersonaId = String(reboundIdentity.persona_id || '')
  expect(privatePersonaId).toMatch(/^custom_/)
  if (acceptanceMode === 'shared_pending') expect(privatePersonaId).not.toBe(initialPersonaId)
  else expect(privatePersonaId).toBe(initialPersonaId)
  expect(reboundIdentity.persist_id).toBe(primaryId)
  expect(reboundIdentity.persona_rebind).toBeNull()
  evidence.persona_handoff = {
    source_persona_id: acceptanceMode === 'shared_pending' ? initialPersonaId : presetRoleId,
    private_persona_id: privatePersonaId,
    effective: true,
    observed_mode: acceptanceMode,
  }
  await persistEvidence(evidence)

  const notificationToggle = page.locator(
    '.persona-growth__notification-setting input[type="checkbox"]'
  )
  await expect(notificationToggle).toBeVisible()
  const initialNotifications = await notificationToggle.isChecked()
  for (const enabled of [!initialNotifications, initialNotifications]) {
    const settingsResponse = page.waitForResponse(
      response =>
        response.request().method() === 'PUT' &&
        new URL(response.url()).pathname === '/api/persona/growth/settings'
    )
    await notificationToggle.setChecked(enabled)
    expect((await settingsResponse).ok()).toBe(true)
    expect(await notificationToggle.isChecked()).toBe(enabled)
  }
  evidence.growth_notifications = {
    restored_to_initial: true,
    initial_enabled: initialNotifications,
  }
  await expect(page.getByRole('button', { name: /审批|否决|人格回滚/ })).toHaveCount(0)
  const geometry = await viewportGeometry(page)
  expect(geometry.overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'd050-desktop.png', fullPage: true })
  return geometry
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
  await login(page, primaryToken, primaryId)
  await acceptGeneralConsentIfNeeded(page)
  await expect(page.getByRole('textbox', { name: '输入消息' })).toBeEnabled({ timeout: 60_000 })
  const geometry = await viewportGeometry(page)
  expect(geometry.overflow).toBeLessThanOrEqual(1)
  await loadGrowthPanel(page, evidence, 'mobile_growth_load_attempts')
  await expect(page.getByRole('heading', { name: '自主成长记录' })).toBeVisible({
    timeout: 60_000,
  })
  const growthGeometry = await viewportGeometry(page)
  expect(growthGeometry.overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: 'd050-mobile.png', fullPage: true })
  evidence.mobile = {
    chat_viewport: geometry,
    growth_viewport: growthGeometry,
    console_error_count: consoleErrors.length,
  }
  expect(consoleErrors.length).toBe(0)
  await context.close()
}

async function loadGrowthPanel(
  page: Page,
  evidence: Record<string, unknown>,
  evidenceKey: string,
  openPanel = true
) {
  const previousAttempts = evidence[evidenceKey]
  const loadAttempts: Array<{ status: number; detail: string }> = Array.isArray(previousAttempts)
    ? [...(previousAttempts as Array<{ status: number; detail: string }>)]
    : []
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let growthResponse: ReturnType<Page['waitForResponse']>
    if (attempt === 1 && openPanel) {
      growthResponse = page.waitForResponse(
        response =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === '/api/persona/growth',
        { timeout: 60_000 }
      )
      await page.getByRole('button', { name: '角色档案' }).click()
    } else {
      const refresh = page.getByRole('button', { name: '刷新成长记录' })
      await expect(refresh).toBeEnabled({ timeout: 60_000 })
      growthResponse = page.waitForResponse(
        response =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === '/api/persona/growth',
        { timeout: 60_000 }
      )
      await refresh.click()
    }
    const response = await growthResponse
    const payload = (await response.json().catch(() => ({}))) as { detail?: unknown }
    loadAttempts.push({
      status: response.status(),
      detail: String(payload.detail || '').slice(0, 200),
    })
    evidence[evidenceKey] = loadAttempts
    await persistEvidence(evidence)
    if (response.ok()) return
    expect([409, 503]).toContain(response.status())
    await expect(page.getByRole('heading', { name: '自主成长记录' })).toBeVisible({
      timeout: 60_000,
    })
    if (attempt < 4) await page.waitForTimeout(attempt * 5_000)
  }
  expect(loadAttempts.at(-1)?.status).toBe(200)
}

async function verifyDeletion(browser: Browser, evidence: Record<string, unknown>) {
  const observerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const observerPage = await observerContext.newPage()
  await login(observerPage, deleteToken, deleteId)

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await login(page, deleteToken, deleteId)
  const observerBeforeDelete = await observerContext.request.get(`${baseURL}/api/me`)
  expect(observerBeforeDelete.status()).toBe(200)
  expect((await observerBeforeDelete.json()).persist_id).toBe(deleteId)

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
  await recordRevisionCheck(evidence, 'before_delete')
  await persistEvidence(evidence)
  const deleteResponse = page.waitForResponse(
    response =>
      response.request().method() === 'DELETE' && new URL(response.url()).pathname === '/api/me'
  )
  await finalButton.click()
  const response = await deleteResponse
  expect(response.status()).toBe(200)
  const result = await response.json()
  if (result.ok === true && result.deleted === true) {
    await writeFile('d050-delete-confirmed.flag', 'confirmed\n', 'utf8')
  }
  expect(result.ok).toBe(true)
  expect(result.deleted).toBe(true)
  expect(result.precise_event_delete_supported).toBe(false)
  expect(result.audit_retained).toBe(true)
  expect(Number(result.tokens_revoked || 0)).toBeGreaterThanOrEqual(1)
  expect(Number(result.browser_sessions_invalidated || 0)).toBeGreaterThanOrEqual(1)
  await expect(page.getByRole('heading', { name: '进入你的会话' })).toBeVisible({ timeout: 60_000 })

  const deletionEvidence = {
    persist_id: deleteId,
    deleted: true,
    tokens_revoked: Number(result.tokens_revoked || 0),
    gateway_sessions_invalidated: Number(result.gateway_sessions_invalidated || 0),
    browser_sessions_invalidated: Number(result.browser_sessions_invalidated || 0),
    precise_event_delete_supported: false,
    audit_retained: true,
    relogin_status: 0,
    prior_session_status: 0,
  }
  evidence.deletion = deletionEvidence
  await persistEvidence(evidence)

  const meStatus = await context.request.get(`${baseURL}/api/me`)
  expect(meStatus.status()).toBe(401)
  const revokedResponse = page.waitForResponse(
    item => item.request().method() === 'POST' && new URL(item.url()).pathname === '/api/session'
  )
  const tokenInput = page.getByPlaceholder('输入内测 Token')
  await tokenInput.fill(deleteToken)
  await page.getByRole('button', { name: '进入灵犀' }).click()
  expect((await revokedResponse).status()).toBe(401)
  await expect(page.getByText('token 无效或已关闭')).toBeVisible()
  await tokenInput.fill('')
  deletionEvidence.relogin_status = 401
  const priorSessionStatus = await observerContext.request.get(`${baseURL}/api/me`)
  expect(priorSessionStatus.status()).toBe(401)
  deletionEvidence.prior_session_status = priorSessionStatus.status()
  await recordRevisionCheck(evidence, 'after_delete')
  await persistEvidence(evidence)
  await page.screenshot({ path: 'd050-delete-complete.png', fullPage: true })
  await context.close()
  await observerContext.close()
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

async function recordRevisionCheck(evidence: Record<string, unknown>, stage: string) {
  const health = await fetchJson(`${baseURL}/api/health`)
  expect(health.backend_revision).toBe(expectedBackendRevision)
  expect(health.persona_schema_phase).toBe('active')
  expect(health.persona_growth?.phase).toBe('active')
  expect(health.persona_growth?.ready).toBe(true)
  expect(health.host?.heartbeat?.first_fire_ok).toBe(true)
  const [portalResponse, lingxiResponse] = await Promise.all([
    fetch('https://hi-veblen.com/release.txt', { cache: 'no-store' }),
    fetch(`${baseURL}/release.txt`, { cache: 'no-store' }),
  ])
  expect(portalResponse.ok).toBe(true)
  expect(lingxiResponse.ok).toBe(true)
  const portalRevision = (await portalResponse.text()).trim()
  const lingxiRevision = (await lingxiResponse.text()).trim()
  expect(portalRevision).toBe(expectedPortalRevision)
  expect(lingxiRevision).toBe(expectedBackendRevision)
  const checks = Array.isArray(evidence.revision_checks)
    ? [...(evidence.revision_checks as Array<Record<string, unknown>>)]
    : []
  checks.push({
    stage,
    checked_at: new Date().toISOString(),
    portal_revision: portalRevision,
    lingxi_revision: lingxiRevision,
    backend_revision: health.backend_revision,
  })
  evidence.revision_checks = checks
  return health
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
