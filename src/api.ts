import { z } from 'zod'

export const API_URL = 'https://api.squeekchain.com/v1'
export const COMMUNITY_URL = 'https://community.squeekchain.com/v1/community'
// Public holder observed through GET /v1/squeeks/1 on 2026-11-06; no wallet is controlled by this app.
export const PUBLIC_WALLET = '0x798cf7770337a9283b6f2af69a8f079b3d7544dc'
export const PUBLIC_PROFILE = '639pun7q'

const uint = z.string().regex(/^(0|[1-9]\d*)$/)
const address = z.string().regex(/^0x[0-9a-f]{40}$/)
const dateTime = z.string().datetime({ offset: true })
const chainSchema = z.object({
  target: z.string().min(1),
  chainId: uint,
  confirmations: uint,
  safeThroughBlock: uint,
  safeBlockTimestamp: dateTime,
})
export const tokenSchema = z.object({
  tokenId: uint,
  custody: z.enum(['staking', 'wallet']),
  level: z.number().int().min(1).max(100),
  basePower: uint.nullable(),
  nextMergeHeight: uint,
  mergeState: z.enum(['ready', 'cooldown', 'terminal', 'merges_closed']),
  metadataStatus: z.enum(['available', 'pending']),
})
const accountSchema = z.object({
  schemaVersion: z.literal(3),
  status: z.literal('available'),
  account: address,
  generatedAt: dateTime,
  release: z.object({ id: z.string().min(1) }),
  chain: chainSchema,
  economy: z.object({ maximumLevel: z.number().int().positive() }),
  rewards: z.object({ claimableBaseUnits: uint }).nullable(),
  tokenCounts: z.object({ wallet: uint, staking: uint.nullable() }),
  tokens: z.array(tokenSchema).max(100),
  nextCursor: z.string().min(1).nullable(),
})
const assetSchema = z.object({ symbol: z.literal('SQK'), decimals: z.number().int().min(0).max(36) })
const economySchema = z.object({
  schemaVersion: z.literal(3),
  status: z.literal('available'),
  release: z.object({ id: z.string() }),
  chain: chainSchema,
  asset: assetSchema,
})
const achievementSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$/),
  title: z.string().min(1),
  rarity: z.object({ holders: z.number().int().nonnegative(), heldByBps: z.number().int().min(0).max(10000) }).nullable(),
  active: z.boolean().nullable(),
})
const snapshotSchema = z.object({ members: z.number().int().nonnegative(), computedAt: dateTime }).nullable()
const profileSchema = z.object({
  code: z.string().regex(/^[a-z0-9]{8}$/i),
  valid: z.boolean(),
  identity: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('x'), username: z.string(), name: z.string() }),
    z.object({ kind: z.literal('alias'), alias: z.string() }),
  ]).nullable(),
  standing: z.object({ aura: z.number().nonnegative(), rank: z.number().int().positive().nullable(), tier: z.enum(['gold', 'silver', 'bronze', 'member']).nullable() }),
  achievements: z.array(achievementSchema),
  snapshot: snapshotSchema,
})
const catalogSchema = z.object({
  badges: z.array(z.object({
    id: z.string(), lane: z.string(), title: z.string(), description: z.string(), instruction: z.string(), trophy: z.boolean(),
  })),
  snapshot: snapshotSchema,
})

export type Token = z.infer<typeof tokenSchema>
export type Account = z.infer<typeof accountSchema>
export type Profile = z.infer<typeof profileSchema>
export type Catalog = z.infer<typeof catalogSchema>
export type Portfolio = { account: Account; asset: z.infer<typeof assetSchema> | null; assetError: string | null }

export class ApiError extends Error {
  retryAfter: number
  kind: 'network' | 'other'
  constructor(message: string, retryAfter = 0, kind: 'network' | 'other' = 'other') {
    super(message)
    this.name = 'ApiError'
    this.retryAfter = retryAfter
    this.kind = kind
  }
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal.addEventListener('abort', cancel, { once: true })
  if (signal.aborted) controller.abort()
  let timedOut = false
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort() }, 18000)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) {
      const secondsHeader = response.headers.get('Retry-After')
      const parsed = secondsHeader ? Number(secondsHeader) : NaN
      const retryAfter = Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : response.status === 429 ? 30 : response.status === 503 ? 2 : 0
      if (response.status === 429) throw new ApiError(`The public API is busy. Try again after ${retryAfter} ${retryAfter === 1 ? 'second' : 'seconds'}.`, retryAfter)
      if (response.status === 503 || response.status === 504) throw new ApiError('Squeekchain is temporarily unavailable. Please try again shortly.', retryAfter)
      if (response.status === 409) throw new ApiError('The chain snapshot changed. Look up the wallet again to refresh your Squeeks.')
      if (response.status === 400) throw new ApiError('The API could not read this address or profile code. Check it and try again.')
      if (response.status === 404) throw new ApiError('This public profile could not be found. Check its link or code.')
      throw new ApiError(`The public API returned an error (${response.status}). Please try again.`)
    }
    try { return await response.json() }
    catch { throw new ApiError('The API returned an unreadable response. Please try again.') }
  } catch (error) {
    if (signal.aborted) throw error
    if (timedOut) throw new ApiError('The lookup took too long. Check your connection and try again.')
    if (error instanceof ApiError) throw error
    throw new ApiError('Could not reach Squeekchain. Check your connection and try again.', 0, 'network')
  } finally {
    window.clearTimeout(timeout)
    signal.removeEventListener('abort', cancel)
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const availability = z.object({ status: z.literal('unavailable'), reason: z.string() }).safeParse(value)
  if (availability.success) throw new ApiError(`Squeekchain data is unavailable (${availability.data.reason.replaceAll('_', ' ')}). Please try again shortly.`)
  const result = schema.safeParse(value)
  if (!result.success) throw new ApiError('The API response has changed or is incomplete. Please try again later.')
  return result.data
}

export async function getAccount(wallet: string, signal: AbortSignal, cursor?: string): Promise<Account> {
  const query = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) })
  const account = parse(accountSchema, await getJson(`${API_URL}/accounts/${wallet}?${query}`, signal))
  if (account.account !== wallet) throw new ApiError('The API returned a different wallet. Please try again.')
  if (new Set(account.tokens.map(token => token.tokenId)).size !== account.tokens.length) throw new ApiError('The API returned duplicate Squeeks. Please refresh the lookup.')
  return account
}

export async function getPortfolio(wallet: string, signal: AbortSignal): Promise<Portfolio> {
  const [accountResult, economyResult] = await Promise.allSettled([
    getAccount(wallet, signal),
    getJson(`${API_URL}/economy/state`, signal).then(value => parse(economySchema, value)),
  ])
  if (accountResult.status === 'rejected') throw accountResult.reason
  const account = accountResult.value
  const matchingEconomy = economyResult.status === 'fulfilled' && economyResult.value.release.id === account.release.id && economyResult.value.chain.chainId === account.chain.chainId
  return {
    account,
    asset: matchingEconomy && economyResult.status === 'fulfilled' ? economyResult.value.asset : null,
    assetError: matchingEconomy ? null : 'SQK units could not be verified for this release. Refresh the wallet to try again.',
  }
}

export async function getProfile(code: string, signal: AbortSignal): Promise<Profile> {
  const profile = parse(profileSchema, await getJson(`${COMMUNITY_URL}/profiles/${encodeURIComponent(code)}`, signal))
  if (!profile.valid || profile.code.toLowerCase() !== code.toLowerCase()) throw new ApiError('This Genesis profile was not found. Check its public link or code.')
  return profile
}

export function readProfileSnapshot(text: string, expectedCode?: string): Profile {
  if (!text.trim()) throw new ApiError('Paste the public profile JSON first.')
  if (text.length > 200000) throw new ApiError('This snapshot is too large. Use the JSON from the public profile endpoint.')
  let value: unknown
  try { value = JSON.parse(text) }
  catch { throw new ApiError('This is not valid JSON. Copy the complete public profile response and try again.') }
  const result = profileSchema.safeParse(value)
  if (!result.success || !result.data.valid) throw new ApiError('This is not an available Genesis profile. Use the complete public profile JSON.')
  if (expectedCode && result.data.code.toLowerCase() !== expectedCode.toLowerCase()) throw new ApiError('This snapshot belongs to a different profile. Use its matching code above, or clear that field before importing.')
  return result.data
}

export async function getCatalog(signal: AbortSignal): Promise<Catalog> {
  return parse(catalogSchema, await getJson(`${COMMUNITY_URL}/aura/badges`, signal))
}

export function validateWallet(value: string): string | null {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value.trim())) return 'Enter a wallet address: 0x followed by 40 hexadecimal characters.'
  if (/^0x0{40}$/i.test(value.trim())) return 'Enter a non-zero wallet address.'
  return null
}

export function parseProfileCode(value: string): string | null {
  const input = value.trim()
  if (/^[a-z0-9]{8}$/i.test(input)) return input.toLowerCase()
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.hostname !== 'squeekchain.com') return null
    const match = url.pathname.match(/^\/genesis\/(?:i\/)?([a-z0-9]{8})\/?$/i)
    return match?.[1].toLowerCase() ?? null
  } catch { return null }
}

export function formatUnits(value: string, decimals: number): string {
  const padded = value.padStart(decimals + 1, '0')
  const whole = decimals ? padded.slice(0, -decimals) : padded
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, '') : ''
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`
}

export function compactUnits(value: string, decimals: number): { display: string; exact: string; truncated: boolean } {
  const exact = formatUnits(value, decimals)
  const [whole, fraction = ''] = exact.split('.')
  const truncated = fraction.length > 4
  const display = truncated && BigInt(value) > 0n && whole === '0' && /^0{4}/.test(fraction)
    ? '< 0.0001' : `${whole}${fraction ? `.${fraction.slice(0, 4)}` : ''}`
  return { display, exact, truncated }
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }).format(new Date(value)) + ' UTC'
}
