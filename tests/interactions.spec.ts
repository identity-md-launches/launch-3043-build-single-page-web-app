import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { accountFixture, catalogFixture, economyFixture, profileFixture } from './fixtures'
import { compactUnits, formatUnits, parseProfileCode, readProfileSnapshot, validateWallet, PUBLIC_WALLET, PUBLIC_PROFILE } from '../src/api'

async function mockApi(page: Page, account: unknown = accountFixture, profile: unknown = profileFixture, economy: unknown = economyFixture) {
  await page.route('https://api.squeekchain.com/v1/**', async route => {
    await route.fulfill({ json: route.request().url().includes('/economy/state') ? economy : account })
  })
  await page.route('https://community.squeekchain.com/v1/community/**', async route => {
    await route.fulfill({ json: route.request().url().includes('/aura/badges') ? catalogFixture : profile })
  })
}
async function lookup(page: Page) {
  await page.getByLabel('Wallet address', { exact: true }).fill(PUBLIC_WALLET)
  await page.getByRole('button', { name: 'Look up wallet', exact: true }).click()
  await expect(page.getByText('Wallet loaded.', { exact: true })).toBeVisible()
}
async function noOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, outside: [...document.querySelectorAll('body *')].filter(element => { const r = element.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(element).position !== 'absolute' }).slice(0, 12).map(element => ({ element: element.tagName + '.' + element.className, right: element.getBoundingClientRect().right, left: element.getBoundingClientRect().left })) }))
  expect(metrics.scroll, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.width)
}
const stat = (page: Page, name: string) => page.locator('.stats-grid').getByRole('region', { name, exact: true })

test('mobile first screen exposes the lookup, metadata and all relative runtime assets', async ({ page }) => {
  await mockApi(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => { if (response.url().startsWith('http://127.') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await expect(page).toHaveTitle('Squeekfolio · Your Genesis overview')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Squeek NFT levels/)
  const button = page.getByRole('button', { name: 'Look up wallet', exact: true })
  const bounds = await button.boundingBox()
  expect(bounds!.y + bounds!.height).toBeLessThan(844)
  await expect(page.getByLabel('Wallet address', { exact: true })).toBeVisible()
  for (const selector of ['link[rel="icon"]', 'meta[property="og:image"]']) {
    const resource = await page.locator(selector).getAttribute(selector.startsWith('link') ? 'href' : 'content')
    expect(resource).toMatch(/^\.\//)
    expect((await page.request.get(new URL(resource!, page.url()).href)).ok()).toBe(true)
  }
  await noOverflow(page)
  expect(errors).toEqual([])
})

test('keyboard validation focuses the address and Enter loads real-shaped wallet data', async ({ page }) => {
  await mockApi(page)
  let accountRequests = 0
  page.on('request', request => { if (request.url().includes('/accounts/')) accountRequests++ })
  await page.goto('./')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
  await page.getByLabel('Wallet address', { exact: true }).fill('not-an-address')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('40 hexadecimal characters')
  await expect(page.getByLabel('Wallet address', { exact: true })).toBeFocused()
  expect(accountRequests).toBe(0)
  await page.getByLabel('Wallet address', { exact: true }).fill(`  ${PUBLIC_WALLET.toUpperCase().replace('0X', '0x')}  `)
  await page.keyboard.press('Enter')
  await expect(stat(page, 'Your Squeeks').locator('.stat-value')).toHaveText('6')
  await expect(page.locator('.token-list li')).toHaveCount(6)
  await expect(stat(page, 'Claimable SQK').locator('.stat-value')).toHaveText('0SQK')
  await expect(page.locator('.address-block code')).toHaveText(PUBLIC_WALLET)
  await page.getByRole('button', { name: 'Staked (0)', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No staked Squeeks shown.' })).toBeVisible()
  await page.getByRole('button', { name: 'In wallet (6)', exact: true }).click()
  await expect(page.locator('.token-list li')).toHaveCount(6)
})

test('precise SQK amounts are truncated explicitly and full precision remains accessible', async ({ page }) => {
  const account = structuredClone(accountFixture)
  account.rewards.claimableBaseUnits = '1234567890123456789'
  account.tokens[0].level = 10
  await mockApi(page, account)
  await page.goto('./')
  await lookup(page)
  await expect(stat(page, 'Claimable SQK').locator('.stat-value')).toHaveText('1.2345SQK')
  await stat(page, 'Claimable SQK').locator('summary').click()
  await expect(page.getByText('1.234567890123456789 SQK', { exact: true })).toBeVisible()
  await expect(page.getByText('Overview truncated to 4 decimals.')).toBeVisible()
  await expect(stat(page, 'Your Squeeks')).toContainText('Highest level: 10 of 10')
})

test('unknown rewards and staking are never shown as zero or complete holdings', async ({ page }) => {
  await mockApi(page, { ...accountFixture, rewards: null, tokenCounts: { wallet: '6', staking: null } })
  await page.goto('./')
  await lookup(page)
  await expect(stat(page, 'Claimable SQK').locator('.stat-value')).toHaveText('Unavailable')
  await expect(stat(page, 'Your Squeeks').locator('.stat-value')).toHaveText('6+')
  await expect(page.getByText('Staking holdings are unknown. Levels reflect the Squeeks the API returned.')).toBeVisible()
})

test('unavailable and malformed responses report failures instead of empty holdings', async ({ page }) => {
  await mockApi(page, { schemaVersion: 3, status: 'unavailable', reason: 'indexer_unavailable' })
  await page.goto('./')
  await page.getByRole('button', { name: 'Try a public wallet', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('indexer unavailable')
  await expect(stat(page, 'Your Squeeks').locator('.stat-value')).toHaveText('—')
  await expect(page.getByRole('heading', { name: 'No Squeeks here yet.' })).toHaveCount(0)
  await page.route('https://api.squeekchain.com/v1/accounts/**', route => route.fulfill({ json: { ...accountFixture, schemaVersion: 99 } }))
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('response has changed or is incomplete')
})

test('an empty wallet has a real zero count and a usable next step', async ({ page }) => {
  await mockApi(page, { ...accountFixture, tokens: [], tokenCounts: { wallet: '0', staking: '0' } })
  await page.goto('./')
  await lookup(page)
  await expect(stat(page, 'Your Squeeks').locator('.stat-value')).toHaveText('0')
  await expect(page.getByRole('heading', { name: 'No Squeeks here yet.' })).toBeVisible()
  await expect(page.getByText('Try another wallet, or visit Squeekchain to explore Genesis.')).toBeVisible()
})

test('rate limiting honors Retry-After and recovers through the primary action', async ({ page }) => {
  await mockApi(page)
  let requests = 0
  await page.route('https://api.squeekchain.com/v1/accounts/**', route => {
    requests++
    return requests === 1 ? route.fulfill({ status: 429, headers: { 'Retry-After': '1', 'Access-Control-Expose-Headers': 'Retry-After' }, json: { error: 'rate_limited' } }) : route.fulfill({ json: accountFixture })
  })
  await page.goto('./')
  await page.getByRole('button', { name: 'Try a public wallet', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('after 1 second')
  await expect(page.getByRole('button', { name: /Retry in/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Look up wallet', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText('Wallet loaded.', { exact: true })).toBeVisible()
  expect(requests).toBe(2)
})

test('network failure and timeout give a recoverable error, with static site intact', async ({ page }) => {
  await mockApi(page)
  await page.route('https://api.squeekchain.com/v1/accounts/**', route => route.abort('failed'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Try a public wallet', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Check your connection and try again')
  await page.route('https://api.squeekchain.com/v1/accounts/**', () => {})
  await page.clock.install()
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Looking up…', exact: true })).toBeDisabled()
  await page.clock.fastForward(18001)
  await expect(page.getByRole('alert')).toContainText('lookup took too long')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('asset failures and mismatched releases do not fabricate a formatted SQK balance', async ({ page }) => {
  await mockApi(page, accountFixture, profileFixture, { ...economyFixture, release: { ...economyFixture.release, id: 'test-other-release' } })
  await page.goto('./')
  await lookup(page)
  await expect(stat(page, 'Claimable SQK').locator('.stat-value')).toHaveText('Unavailable')
  await expect(stat(page, 'Claimable SQK')).toContainText('SQK units could not be verified')
  await expect(page.locator('.token-list li')).toHaveCount(6)
})

test('Genesis code and link lookups show clout only, independently of the wallet', async ({ page }) => {
  await mockApi(page)
  await page.goto('./')
  await page.getByLabel('Genesis profile link or code').fill(`https://squeekchain.com/genesis/${PUBLIC_PROFILE}`)
  await page.getByRole('button', { name: 'Find clout badges' }).click()
  await expect(page.locator('.profile-name')).toHaveText('@mfBRAT_eth')
  await expect(page.locator('.badge-list > li')).toHaveCount(2)
  await expect(page.getByText('The Buildooooor', { exact: true })).toHaveCount(0)
  await expect(stat(page, 'Clout badges').locator('.stat-value')).toHaveText('2')
  await expect(stat(page, 'Your Squeeks').locator('.stat-value')).toHaveText('—')
  await page.locator('.badge-list summary').first().click()
  await expect(page.getByText('Verify a wallet and link your X account.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'All (3)', exact: true }).click()
  await expect(page.locator('.badge-list > li')).toHaveCount(3)
  await expect(page.getByText('Not earned', { exact: true })).toHaveCount(1)
  await expect(page.getByText(/Wallet links aren’t public/)).toBeVisible()
})

test('invalid profile hosts, missing profiles, and profiles without clout have clear states', async ({ page }) => {
  await mockApi(page, accountFixture, { ...profileFixture, achievements: [] })
  await page.goto('./')
  await page.getByLabel('Genesis profile link or code').fill('https://example.com/genesis/639pun7q')
  await page.getByRole('button', { name: 'Find clout badges' }).click()
  await expect(page.getByRole('alert')).toContainText('public squeekchain.com/genesis/')
  await page.getByRole('button', { name: 'Try a public profile', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No clout badges yet' })).toBeVisible()
  await page.route('https://community.squeekchain.com/v1/community/profiles/**', route => route.fulfill({ json: { ...profileFixture, valid: false } }))
  await page.getByRole('button', { name: 'Find clout badges' }).click()
  await expect(page.getByRole('alert')).toContainText('profile was not found')
  await expect(stat(page, 'Clout badges').locator('.stat-value')).toHaveText('—')
})

test('collection pagination keeps the same safe snapshot and filters across loaded pages', async ({ page }) => {
  const firstPage = { ...accountFixture, tokens: accountFixture.tokens.slice(0, 2), tokenCounts: { wallet: '4', staking: '0' }, nextCursor: 'test-cursor' }
  await mockApi(page, firstPage)
  await page.route('https://api.squeekchain.com/v1/accounts/**', route => route.fulfill({ json: route.request().url().includes('cursor=test-cursor') ? { ...firstPage, tokens: accountFixture.tokens.slice(2, 4), nextCursor: null } : firstPage }))
  await page.goto('./')
  await lookup(page)
  await expect(page.locator('.token-list li')).toHaveCount(2)
  await page.getByRole('button', { name: 'Load more Squeeks', exact: true }).click()
  await expect(page.locator('.token-list li')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Load more Squeeks', exact: true })).toHaveCount(0)
  await expect(page.locator('.collection-count')).toHaveText('4 of 4 loaded Squeeks shown.')
})

test('pagination rejects changed snapshots and keeps the previously loaded collection', async ({ page }) => {
  const firstPage = { ...accountFixture, tokens: accountFixture.tokens.slice(0, 2), nextCursor: 'test-cursor' }
  await mockApi(page, firstPage)
  await page.route('https://api.squeekchain.com/v1/accounts/**', route => route.fulfill({ json: route.request().url().includes('cursor=') ? { ...firstPage, tokens: accountFixture.tokens.slice(2), chain: { ...firstPage.chain, safeThroughBlock: '12075723' }, nextCursor: null } : firstPage }))
  await page.goto('./')
  await lookup(page)
  await page.getByRole('button', { name: 'Load more Squeeks', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('snapshot changed')
  await expect(page.locator('.token-list li')).toHaveCount(2)
})

test('layout reflows without clipping at representative widths, enlarged text and RTL', async ({ page }) => {
  const account = structuredClone(accountFixture)
  account.rewards.claimableBaseUnits = '900719925474099312345678901234567890'
  await mockApi(page, account)
  await page.goto('./')
  await lookup(page)
  for (const width of [320, 390, 600, 784, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await noOverflow(page)
    await expect(page.getByRole('button', { name: 'Look up wallet', exact: true })).toBeVisible()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => document.documentElement.style.fontSize = '200%')
  for (const width of [320, 390]) { await page.setViewportSize({ width, height: 844 }); await noOverflow(page) }
  await page.evaluate(() => { document.documentElement.style.fontSize = ''; document.documentElement.dir = 'rtl' })
  await noOverflow(page)
})

test('accessibility scan covers initial, populated and expanded badge states', async ({ page }) => {
  await mockApi(page)
  await page.goto('./')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await lookup(page)
  await page.getByRole('button', { name: 'Try a public profile', exact: true }).click()
  await expect(page.locator('.badge-list > li')).toHaveCount(2)
  await page.locator('.badge-list summary').first().click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
})

test('reduced motion suppresses the loading spinner and maintains a text cue', async ({ page }) => {
  await mockApi(page)
  await page.route('https://api.squeekchain.com/v1/accounts/**', () => {})
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('./')
  await page.getByRole('button', { name: 'Try a public wallet', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Looking up…', exact: true })).toBeVisible()
  expect(await page.locator('.primary-button .spin').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
})

test('amount and input edge cases preserve precision and reject invalid data', () => {
  expect(formatUnits('900719925474099312345678901234567890', 18)).toBe('900,719,925,474,099,312.34567890123456789')
  expect(compactUnits('1', 18)).toEqual({ display: '< 0.0001', exact: '0.000000000000000001', truncated: true })
  expect(formatUnits('101', 0)).toBe('101')
  expect(formatUnits('0', 18)).toBe('0')
  expect(validateWallet('0x' + '0'.repeat(40))).toContain('non-zero')
  expect(parseProfileCode('https://squeekchain.com.evil.example/genesis/639pun7q')).toBe(null)
  expect(parseProfileCode('https://squeekchain.com/genesis/i/639PUN7Q')).toBe('639pun7q')
})


test('cross-site profile failure offers a local import with an honest snapshot label', async ({ page }) => {
  await mockApi(page)
  await page.route('https://community.squeekchain.com/v1/community/profiles/**', route => route.abort('failed'))
  await page.goto('./')
  await page.getByRole('button', { name: 'Try a public profile', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Open its public data and import a snapshot')
  await expect(page.getByRole('link', { name: 'Open public profile JSON' })).toHaveAttribute('href', `https://community.squeekchain.com/v1/community/profiles/${PUBLIC_PROFILE}`)
  await page.getByLabel('Public profile JSON', { exact: true }).fill(JSON.stringify(profileFixture))
  await page.getByRole('button', { name: 'Read snapshot', exact: true }).click()
  await expect(page.locator('.badge-list > li')).toHaveCount(2)
  await expect(page.getByText(/Imported Genesis snapshot/)).toContainText('A local copy, not live verification.')
  await expect(stat(page, 'Clout badges').locator('.stat-value')).toHaveText('2')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('snapshot import validates JSON, focuses errors, and rejects another profile code', async ({ page }) => {
  await mockApi(page)
  await page.goto('./')
  await page.getByText('Import a profile snapshot', { exact: true }).click()
  await page.getByLabel('Public profile JSON', { exact: true }).fill('{broken')
  await page.getByRole('button', { name: 'Read snapshot', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('not valid JSON')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await expect(page.getByLabel('Public profile JSON', { exact: true })).toBeFocused()
  await page.getByLabel('Genesis profile link or code').fill('2qr5hz47')
  await page.getByLabel('Public profile JSON', { exact: true }).fill(JSON.stringify(profileFixture))
  await page.getByRole('button', { name: 'Read snapshot', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('different profile')
  await page.getByLabel('Genesis profile link or code').fill('')
  await page.getByRole('button', { name: 'Read snapshot', exact: true }).click()
  await expect(page.locator('.profile-name')).toHaveText('@mfBRAT_eth')
  await expect(page.getByLabel('Genesis profile link or code')).toHaveValue(PUBLIC_PROFILE)
})

test('snapshot schema rejects unavailable, oversized and incomplete payloads', () => {
  expect(() => readProfileSnapshot('')).toThrow('Paste the public profile JSON')
  expect(() => readProfileSnapshot(' '.repeat(200001) + '{}')).toThrow('too large')
  expect(() => readProfileSnapshot(JSON.stringify({ ...profileFixture, valid: false }))).toThrow('not an available Genesis profile')
  expect(() => readProfileSnapshot(JSON.stringify({ code: PUBLIC_PROFILE }))).toThrow('not an available Genesis profile')
  expect(readProfileSnapshot(JSON.stringify(profileFixture)).code).toBe(PUBLIC_PROFILE)
})
