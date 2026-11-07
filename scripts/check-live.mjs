import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { once } from 'node:events'

const base = 'http://127.0.0.1:4173/preview/'
const server = spawn(process.execPath, ['scripts/serve-preview.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] })
let browser
let page
const scriptErrors = [], browserConsoleErrors = [], failures = [], httpErrors = []
try {
  await Promise.race([
    once(server.stdout, 'data'),
    once(server, 'exit').then(([code]) => { throw new Error(`Local preview exited (${code})`) }),
    new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Local preview did not start')), 10000); timer.unref() }),
  ])
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_PROXY_SERVER ? { proxy: { server: process.env.PLAYWRIGHT_PROXY_SERVER, bypass: '127.0.0.1,localhost' } } : {}), ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  page.on('pageerror', error => scriptErrors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') browserConsoleErrors.push(message.text().replaceAll(new URL(base).origin, '[static preview origin]')) })
  page.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }))
  page.on('response', response => { if (response.status() >= 400) httpErrors.push({ url: response.url(), status: response.status() }) })
  await mkdir('reports/screenshots', { recursive: true })
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  const bounds = await page.getByRole('button', { name: 'Look up wallet', exact: true }).boundingBox()
  assert(bounds && bounds.y + bounds.height < 844)
  await page.screenshot({ path: 'reports/screenshots/mobile-initial.png' })
  await page.keyboard.press('Tab')
  assert.equal(await page.getByRole('link', { name: 'Skip to content' }).evaluate(element => element === document.activeElement), true)
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  assert.equal(await page.getByLabel('Wallet address', { exact: true }).evaluate(element => element === document.activeElement), true)
  await page.screenshot({ path: 'reports/screenshots/mobile-keyboard-focus.png' })
  const [accountResponse] = await Promise.all([
    page.waitForResponse(response => response.url().includes('api.squeekchain.com/v1/accounts/') && response.status() === 200, { timeout: 25000 }),
    page.getByRole('button', { name: 'Try a public wallet', exact: true }).click(),
  ])
  const account = await accountResponse.json()
  await page.getByText('Wallet loaded.', { exact: true }).waitFor({ timeout: 25000 })
  assert.equal(account.status, 'available')
  assert.equal(await page.locator('.token-list > li').count(), Math.min(account.tokens.length, 12))
  for (const token of account.tokens.slice(0, 12)) {
    const row = page.locator('.token-list > li').filter({ has: page.getByRole('heading', { name: `Squeek #${token.tokenId}`, exact: true }) })
    assert.equal(await row.locator('.token-level strong').textContent(), String(token.level))
  }
  await page.getByRole('button', { name: 'Try a public profile', exact: true }).click()
  const profileOutcome = await Promise.race([
    page.locator('.profile-name').waitFor({ timeout: 25000 }).then(() => 'live'),
    page.getByRole('alert').waitFor({ timeout: 25000 }).then(() => 'blocked'),
  ])
  const profileUrl = 'https://community.squeekchain.com/v1/community/profiles/639pun7q'
  const profileResponse = await page.request.get(profileUrl, { headers: { Origin: new URL(base).origin } })
  assert(profileResponse.ok(), 'Public profile JSON is readable in its own context')
  const profile = await profileResponse.json()
  const allowOrigin = profileResponse.headers()['access-control-allow-origin'] ?? null
  if (profileOutcome === 'blocked') {
    await page.screenshot({ path: 'reports/screenshots/profile-import-recovery.png', fullPage: true })
    await page.getByLabel('Public profile JSON', { exact: true }).fill(JSON.stringify(profile))
    await page.getByRole('button', { name: 'Read snapshot', exact: true }).click()
  }
  await page.locator('.profile-name').waitFor({ timeout: 25000 })
  const clout = profile.achievements.filter(b => b.id.startsWith('clout.') && b.active !== false)
  assert.equal(await page.locator('.badge-list > li').count(), clout.length)
  await page.locator('.badge-list summary').first().click()
  const reflow = []
  for (const width of [320, 390, 600, 784, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const metric = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
    assert(metric.scrollWidth <= width, `Overflow at ${width}`)
    reflow.push(metric)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'reports/screenshots/desktop-live.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'reports/screenshots/mobile-live.png', fullPage: true })
  await page.mouse.move(0, 0)
  await page.locator('.primary-button').evaluate(element => element.getAnimations().forEach(animation => animation.finish()))
  const rendered = await page.evaluate(() => {
    const targets = { body: 'body', primary: '.primary-button', secondary: '.stat:not(.stat-accent) .stat-description', accent: '.stat-accent', hint: '.field-hint', error: '.field-error' }
    const pairs = Object.fromEntries(Object.entries(targets).flatMap(([name, selector]) => {
      const element = document.querySelector(selector)
      if (!element) return []
      const style = getComputedStyle(element)
      let bg = style.backgroundColor
      let parent = element.parentElement
      while (bg === 'rgba(0, 0, 0, 0)' && parent) { bg = getComputedStyle(parent).backgroundColor; parent = parent.parentElement }
      return [[name, { foreground: style.color, background: bg, font: style.fontFamily, size: style.fontSize }]]
    }))
    return { pairs, loadedFonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })) }
  })
  function luminance(rgb) {
    return rgb.match(/[\d.]+/g).slice(0, 3).map(v => Number(v) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, index) => sum + v * [.2126, .7152, .0722][index], 0)
  }
  for (const pair of Object.values(rendered.pairs)) {
    const a = luminance(pair.foreground), b = luminance(pair.background)
    pair.contrast = Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2))
    assert(pair.contrast >= 4.5, `Contrast failure ${JSON.stringify(pair)}`)
  }
  assert.deepEqual(scriptErrors, [])
  assert.deepEqual(browserConsoleErrors.filter(message => !message.includes('CORS') && !message.includes('net::ERR_FAILED')), [])
  assert.deepEqual(failures.filter(request => request.url !== profileUrl), [])
  assert.deepEqual(httpErrors, [])
  const result = {
    checkedAt: new Date().toISOString(),
    browser: 'Chromium ' + browser.version(),
    exportSubpath: '/preview/',
    mode: 'Unmocked account API. Real public Genesis JSON imported through the UI when cross-site reads are blocked. Independently selected wallet and profile; no asserted association.',
    profileAccess: { directRead: profileOutcome, accessControlAllowOrigin: allowOrigin, displaySource: profileOutcome === 'blocked' ? 'imported public API snapshot' : 'live public API' },
    account: { address: account.account, generatedAt: account.generatedAt, chain: account.chain.target, tokenCountReturned: account.tokens.length, nextCursor: account.nextCursor, claimableBaseUnits: account.rewards?.claimableBaseUnits ?? null },
    profile: { code: profile.code, snapshot: profile.snapshot, cloutBadges: clout.map(b => ({ id: b.id, title: b.title })) },
    reflow, rendered, scriptErrors, browserConsoleErrors, failedRequests: failures, httpErrors,
    expectedExternalFailure: profileOutcome === 'blocked' ? 'The profile endpoint has no cross-site permission. Its console and request errors are expected and the UI import recovers from them.' : null,
  }
  await writeFile('reports/live-check.json', JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify({ passed: true, profileOutcome, tokensReturned: account.tokens.length, cloutBadges: clout.length, viewports: reflow.map(r => r.width), scriptErrors, browserConsoleErrors, failedRequests: failures, httpErrors }, null, 2))
} catch (error) {
  console.error(error.message)
  console.error(JSON.stringify({ failures, httpErrors }))
  if (page) { console.error(await page.locator('[role=alert]').allTextContents()); await page.screenshot({ path: 'test/scratch/live-failure.png', fullPage: true }).catch(() => {}) }
  process.exitCode = 1
} finally {
  await browser?.close()
  server.kill('SIGTERM')
  await once(server, 'exit').catch(() => {})
}
