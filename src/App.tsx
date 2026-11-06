import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError, API_URL, COMMUNITY_URL, PUBLIC_PROFILE, PUBLIC_WALLET, compactUnits, formatTimestamp, getAccount, getCatalog, getPortfolio, getProfile, parseProfileCode, readProfileSnapshot, validateWallet } from './api'
import type { Catalog, Portfolio, Profile, Token } from './api'
import { Icon } from './components/Icon'
import type { IconName } from './components/Icon'
import { Squeek } from './components/Squeek'

type LoadState<T> = { status: 'idle' | 'loading' | 'success' | 'error'; data: T | null; error: string; retryAt: number }
const initial = <T,>(): LoadState<T> => ({ status: 'idle', data: null, error: '', retryAt: 0 })
const failure = <T,>(error: unknown): LoadState<T> => ({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Something interrupted the lookup. Please try again.', retryAt: error instanceof ApiError ? Date.now() + error.retryAfter * 1000 : 0 })

function useRemaining(retryAt: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    setNow(Date.now())
    if (!retryAt || retryAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])
  return Math.max(0, Math.ceil((retryAt - now) / 1000))
}

function TokenMark() {
  return <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" className="token-mark">{[0, 1, 2, 3, 4].flatMap(y => [0, 1, 2, 3, 4].map(x => (y === 0 && (x === 0 || x === 4)) || (y === 4 && (x === 0 || x === 4)) ? null : <circle key={`${x}${y}`} cx={6 + x * 5} cy={6 + y * 5} r={1.8} fill={(y === 2 && (x === 1 || x === 3)) ? 'currentColor' : '#a48acb'} />))}</svg>
}

function Stat({ title, icon, value, description, accent = false, children }: { title: string; icon: IconName; value: string; description: string; accent?: boolean; children?: React.ReactNode }) {
  return <section className={`stat ${accent ? 'stat-accent' : ''}`} aria-label={title}>
    <div className="stat-label"><h2>{title}</h2><Icon name={icon} size={20} /></div>
    <p className={`stat-value ${value === '—' ? 'stat-value-empty' : ''}`}>{value}{title === 'Claimable SQK' && value !== '—' && value !== 'Unavailable' && <span className="stat-unit">SQK</span>}</p>
    <p className="stat-description">{description}</p>
    {children}
  </section>
}

function CloutPanel({ onCount }: { onCount: (count: number | null) => void }) {
  const [input, setInput] = useState('')
  const [validation, setValidation] = useState('')
  const [profile, setProfile] = useState<LoadState<Profile>>(initial)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogUnavailable, setCatalogUnavailable] = useState(false)
  const [filter, setFilter] = useState<'earned' | 'all'>('earned')
  const [importOpen, setImportOpen] = useState(false)
  const [snapshotText, setSnapshotText] = useState('')
  const [importError, setImportError] = useState('')
  const [profileSource, setProfileSource] = useState<'live' | 'imported'>('live')
  const controller = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const snapshotRef = useRef<HTMLTextAreaElement>(null)
  const request = useRef(0)
  const remaining = useRemaining(profile.retryAt)

  useEffect(() => {
    const c = new AbortController()
    getCatalog(c.signal).then(setCatalog).catch(() => { if (!c.signal.aborted) setCatalogUnavailable(true) })
    return () => { c.abort(); controller.current?.abort() }
  }, [])

  async function lookup(value: string) {
    if (remaining > 0 || profile.status === 'loading') return
    const code = parseProfileCode(value)
    if (!code) { setValidation('Enter an 8-character Genesis code or a public squeekchain.com/genesis/ link.'); inputRef.current?.focus(); return }
    setValidation('')
    controller.current?.abort()
    const c = new AbortController(); controller.current = c
    const id = ++request.current
    setProfile({ ...initial(), status: 'loading' })
    onCount(null)
    try {
      const data = await getProfile(code, c.signal)
      if (id !== request.current || c.signal.aborted) return
      setProfile({ status: 'success', data, error: '', retryAt: 0 })
      setProfileSource('live')
      onCount(data.achievements.filter(badge => badge.id.startsWith('clout.') && badge.active !== false).length)
      setFilter('earned')
    } catch (error) {
      if (!c.signal.aborted && id === request.current) {
        setProfile(error instanceof ApiError && error.kind === 'network' ? failure(new ApiError('This site could not read the public profile. Open its public data and import a snapshot below.')) : failure(error))
        if (error instanceof ApiError && error.kind === 'network') setImportOpen(true)
      }
    }
  }

  function importSnapshot(event: FormEvent) {
    event.preventDefault()
    try {
      const data = readProfileSnapshot(snapshotText, parseProfileCode(input) ?? undefined)
      controller.current?.abort(); ++request.current
      setProfile({ status: 'success', data, error: '', retryAt: 0 })
      setInput(data.code); setValidation(''); setImportError(''); setSnapshotText(''); setImportOpen(false)
      setProfileSource('imported'); setFilter('earned')
      onCount(data.achievements.filter(b => b.id.startsWith('clout.') && b.active !== false).length)
    } catch (error) { setImportError(error instanceof Error ? error.message : 'Could not read this snapshot. Try again.'); snapshotRef.current?.focus() }
  }

  const data = profile.data
  const earned = data?.achievements.filter(b => b.id.startsWith('clout.') && b.active !== false) ?? []
  const definitions = catalog?.badges.filter(b => b.lane === 'clout') ?? []
  const displayed = filter === 'all' && catalog ? definitions.map(b => ({ ...b, earned: earned.find(e => e.id === b.id) ?? null })) : earned.map(b => ({ ...b, ...definitions.find(d => d.id === b.id), earned: b }))
  const name = data?.identity?.kind === 'x' ? `@${data.identity.username}` : data?.identity?.kind === 'alias' ? data.identity.alias : 'Genesis member'

  return <section className="panel clout-panel" aria-labelledby="clout-heading">
    <div className="panel-heading"><h2 id="clout-heading">Your clout</h2><Icon name="shield" size={22} /></div>
    <p className="panel-intro">The little proofs of showing up.</p>
    <form className="profile-form" onSubmit={(event: FormEvent) => { event.preventDefault(); void lookup(input) }} noValidate>
      <label htmlFor="profile-code">Genesis profile link or code</label>
      <div className="profile-input-row">
        <input id="profile-code" ref={inputRef} value={input} onChange={e => { setInput(e.target.value); if (validation) setValidation('') }} placeholder="e.g. 639pun7q" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={!!validation} aria-describedby={`profile-note${validation ? ' profile-validation' : ''}`} disabled={profile.status === 'loading'} />
        <button className="profile-submit" type="submit" disabled={profile.status === 'loading' || remaining > 0} aria-label="Find clout badges"><Icon name={profile.status === 'loading' ? 'refresh' : 'arrow'} className={profile.status === 'loading' ? 'spin' : ''} /></button>
      </div>
      {validation && <p id="profile-validation" className="field-error" role="alert">{validation}</p>}
      <p className="field-hint" id="profile-note">Wallet links aren’t public. Badges are for this profile; its connection to your wallet can’t be verified here.</p>
      <div className="profile-status" role="status">{profile.status === 'loading' ? 'Looking up Genesis clout…' : ''}</div>
      {profile.status === 'error' && <p className="field-error" role="alert">{profile.error} {remaining > 0 && `You can retry in ${remaining}s.`}</p>}
    </form>
    <details className="profile-import" open={importOpen} onToggle={event => setImportOpen(event.currentTarget.open)}>
      <summary>Import a profile snapshot<Icon name="chevron" size={15} /></summary>
      <p>Profile reads can be restricted across sites. Open the public JSON in a new tab, copy it, then paste it here.</p>
      {parseProfileCode(input) ? <a className="import-source-link" href={`${COMMUNITY_URL}/profiles/${parseProfileCode(input)}`} target="_blank" rel="noreferrer">Open public profile JSON<Icon name="external" size={14} /></a> : <p>Enter your Genesis code above to get its public data link.</p>}
      <form onSubmit={importSnapshot} noValidate>
        <label htmlFor="profile-snapshot">Public profile JSON</label>
        <textarea id="profile-snapshot" ref={snapshotRef} value={snapshotText} onChange={event => { setSnapshotText(event.target.value); setImportError('') }} placeholder="Paste the complete JSON response" rows={5} spellCheck={false} autoCapitalize="none" aria-invalid={!!importError} aria-describedby={`snapshot-note${importError ? ' snapshot-error' : ''}`} maxLength={200001} />
        {importError && <p className="field-error" role="alert" id="snapshot-error">{importError}</p>}
        <p className="field-hint" id="snapshot-note">An imported copy is not a live or verified response. No data is uploaded.</p>
        <button type="submit" className="secondary-button">Read snapshot<Icon name="arrow" size={16} /></button>
      </form>
    </details>
    {data ? <>
      <div className="profile-identity"><div className="profile-avatar" aria-hidden="true"><Icon name="users" size={24} /></div><div><p className="profile-name">{name}</p><p className="muted small">{new Intl.NumberFormat('en').format(data.standing.aura)} Aura{data.standing.tier ? ` · ${data.standing.tier.charAt(0).toUpperCase()}${data.standing.tier.slice(1)}` : ''}</p></div><a className="icon-link" href={`https://squeekchain.com/genesis/${data.code}`} target="_blank" rel="noreferrer" aria-label={`View ${name} on Squeekchain (opens in a new tab)`}><Icon name="external" size={18} /></a></div>
      <div className="filter-row badge-filters" aria-label="Clout badge filter"><button type="button" aria-pressed={filter === 'earned'} onClick={() => setFilter('earned')}>Earned ({earned.length})</button>{catalog && <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All ({definitions.length})</button>}</div>
      {displayed.length ? <ul className="badge-list">{displayed.map(b => <li key={b.id}><details><summary><span className={`badge-symbol ${b.earned ? 'is-earned' : ''}`}><Icon name={b.trophy ? 'trophy' : b.id.includes('invit') || b.id.includes('recruit') || b.id.includes('ringleader') ? 'users' : 'shield'} size={20} /></span><span className="badge-name">{b.title}<span className="badge-state">{b.earned ? 'Earned' : 'Not earned'}{b.trophy ? ' · Trophy' : ''}</span></span><Icon name="chevron" size={16} className="details-chevron" /></summary><div className="badge-details"><p>{b.instruction ?? 'Clout badge reported by the Genesis public profile.'}</p>{b.earned?.rarity && <p className="muted">Held by {new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(b.earned.rarity.heldByBps / 100)}% of ranked members.</p>}</div></details></li>)}</ul> : <div className="small-empty"><Icon name="shield" size={28} /><h3>No clout badges yet</h3><p>See how to earn your first badge in the <a href="https://squeekchain.com/genesis/aura" target="_blank" rel="noreferrer">Genesis badge guide<Icon name="external" size={14} /></a>.</p></div>}
      {catalogUnavailable && <p className="field-hint">The badge guide is unavailable. Earned badges still come directly from this profile.</p>}
      <p className="source-note">{profileSource === 'imported' ? 'Imported Genesis snapshot' : 'Genesis snapshot'} {data.snapshot ? formatTimestamp(data.snapshot.computedAt) : 'time not provided'}.{profileSource === 'imported' && ' A local copy, not live verification.'}</p>
    </> : <div className="clout-empty"><div className="badge-preview" aria-hidden="true"><span><Icon name="users" size={24} /></span><span><Icon name="shield" size={30} /></span><span><Icon name="trophy" size={24} /></span></div><h3>A little clout goes a long way.</h3><p>Find the badges you’ve earned for joining, inviting friends and being early.</p><button type="button" className="text-button" disabled={profile.status === 'loading' || remaining > 0} onClick={() => { setInput(PUBLIC_PROFILE); void lookup(PUBLIC_PROFILE) }}>Try a public profile<Icon name="arrow" size={16} /></button></div>}
    <a className="panel-bottom-link" href="https://squeekchain.com/genesis/aura" target="_blank" rel="noreferrer">Explore the Genesis badge guide<Icon name="external" size={16} /></a>
  </section>
}

function App() {
  const [input, setInput] = useState('')
  const [validation, setValidation] = useState('')
  const [portfolio, setPortfolio] = useState<LoadState<Portfolio>>(initial)
  const [badgeCount, setBadgeCount] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'wallet' | 'staking'>('all')
  const [visibleCount, setVisibleCount] = useState(12)
  const [pageError, setPageError] = useState('')
  const [pageLoading, setPageLoading] = useState(false)
  const [pageRetryAt, setPageRetryAt] = useState(0)
  const [copyStatus, setCopyStatus] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  const request = useRef(0)
  const remaining = useRemaining(portfolio.retryAt)
  const pageRemaining = useRemaining(pageRetryAt)

  useEffect(() => () => { controller.current?.abort() }, [])

  async function lookup(value: string) {
    if (remaining > 0 || portfolio.status === 'loading') return
    const error = validateWallet(value)
    if (error) { setValidation(error); inputRef.current?.focus(); return }
    const wallet = value.trim().toLowerCase()
    setValidation(''); setPageError(''); setCopyStatus(''); setPageRetryAt(0); setPageLoading(false)
    controller.current?.abort()
    const c = new AbortController(); controller.current = c
    const id = ++request.current
    setPortfolio({ ...initial(), status: 'loading' })
    try {
      const data = await getPortfolio(wallet, c.signal)
      if (id !== request.current || c.signal.aborted) return
      setPortfolio({ status: 'success', data, error: '', retryAt: 0 })
      setFilter('all'); setVisibleCount(12)
    } catch (e) { if (id === request.current && !c.signal.aborted) setPortfolio(failure(e)) }
  }

  async function loadMore() {
    const current = portfolio.data
    if (!current || !current.account.nextCursor || pageLoading || pageRemaining > 0) return
    const id = request.current
    const c = controller.current
    if (!c) return
    setPageLoading(true); setPageError('')
    try {
      const page = await getAccount(current.account.account, c.signal, current.account.nextCursor)
      if (id !== request.current || c.signal.aborted) return
      const previous = current.account
      if (page.release.id !== previous.release.id || page.chain.safeThroughBlock !== previous.chain.safeThroughBlock || page.chain.chainId !== previous.chain.chainId) throw new ApiError('The snapshot changed. Refresh the wallet to load a consistent collection.')
      if (page.nextCursor === previous.nextCursor || page.tokens.some(token => previous.tokens.some(known => known.tokenId === token.tokenId))) throw new ApiError('The API repeated a collection page. Refresh the wallet to try again.')
      setPortfolio({ ...portfolio, data: { ...current, account: { ...previous, tokens: [...previous.tokens, ...page.tokens], nextCursor: page.nextCursor } } })
      setVisibleCount(count => count + 12)
    } catch (e) {
      if (id === request.current && !c.signal.aborted) { setPageError(e instanceof Error ? e.message : 'Could not load the next page. Try again.'); setPageRetryAt(e instanceof ApiError ? Date.now() + e.retryAfter * 1000 : 0) }
    } finally { if (id === request.current) setPageLoading(false) }
  }

  async function copyAddress() {
    if (!portfolio.data) return
    try { await navigator.clipboard.writeText(portfolio.data.account.account); setCopyStatus('Address copied.') }
    catch { setCopyStatus('Select the full address below to copy it.') }
  }

  const account = portfolio.data?.account
  const loading = portfolio.status === 'loading'
  const count = account ? BigInt(account.tokenCounts.wallet) + BigInt(account.tokenCounts.staking ?? '0') : null
  const sqk = portfolio.data?.asset && account?.rewards ? compactUnits(account.rewards.claimableBaseUnits, portfolio.data.asset.decimals) : null
  const highestLevel = account?.tokens.length ? Math.max(...account.tokens.map(token => token.level)) : null
  const filtered = account?.tokens.filter(token => filter === 'all' || token.custody === filter) ?? []
  const tokens = filtered.slice(0, visibleCount)
  const maxShown = Math.min(visibleCount, filtered.length)
  const network = account ? account.chain.target === 'sepolia' ? 'Sepolia testnet' : account.chain.target : 'Public wallet lookup'
  const statWaiting = loading ? 'Reading staking rewards…' : portfolio.status === 'error' ? 'Lookup unavailable' : 'Ready when you are'

  function showTokens(next: 'all' | 'wallet' | 'staking') { setFilter(next); setVisibleCount(12) }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><a className="brand" href="./" aria-label="Squeekfolio home"><Squeek compact /><span>Squeekfolio<span className="brand-subtitle">A home for your Genesis</span></span></a><nav aria-label="Main navigation"><a href="#how-it-works" className="how-link">How it works</a><a className="docs-link" href="https://docs.squeekchain.com/" target="_blank" rel="noreferrer">Squeekchain docs<Icon name="external" size={16} /></a></nav></header>
    <main id="main" className="site-main" tabIndex={-1}>
      <div className="intro-row"><div><h1>Your Genesis overview.</h1><p>Squeek levels, claimable SQK and a little clout.</p></div><span className="read-only"><Icon name="shield" size={16} />Public data. Private keys stay yours.</span></div>
      <section className="lookup" aria-label="Wallet lookup">
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void lookup(input) }} noValidate>
          <label htmlFor="wallet-address">Wallet address</label>
          <div className="wallet-input-row"><div className="wallet-input-wrap"><Icon name="wallet" size={21} /><input id="wallet-address" ref={inputRef} type="text" value={input} onChange={e => { setInput(e.target.value); if (validation) setValidation('') }} placeholder="0x…" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-invalid={!!validation} aria-describedby={`wallet-hint${validation ? ' wallet-error' : ''}`} /></div><button type="submit" className="primary-button" disabled={loading || remaining > 0}><Icon name={loading ? 'refresh' : 'search'} size={19} className={loading ? 'spin' : ''} />{loading ? 'Looking up…' : remaining > 0 ? `Retry in ${remaining}s` : 'Look up wallet'}{!loading && <Icon name="arrow" size={18} />}</button></div>
          {validation && <p className="field-error" id="wallet-error" role="alert">{validation}</p>}
          <div className="lookup-footnote"><p id="wallet-hint"><Icon name="shield" size={14} />Just an address. No connection or signature.</p><button className="text-button" type="button" disabled={loading || remaining > 0} onClick={() => { setInput(PUBLIC_WALLET); void lookup(PUBLIC_WALLET) }}>Try a public wallet<Icon name="arrow" size={15} /></button></div>
        </form>
        {portfolio.status === 'error' && <div className="lookup-error" role="alert"><Icon name="info" size={20} /><p>{portfolio.error}</p><button type="button" className="text-button" onClick={() => void lookup(input)} disabled={remaining > 0}>Retry<Icon name="refresh" size={16} /></button></div>}
      </section>
      <div className="overview-line"><div className="network-label"><span className="network-dot" aria-hidden="true" />{network}</div><div className="lookup-status" role="status">{loading ? 'Reading the public Squeekchain API…' : account ? 'Wallet loaded.' : portfolio.status === 'error' ? 'Wallet lookup failed.' : 'Awaiting a wallet'}</div></div>
      <div className="stats-grid" aria-busy={loading}>
        <Stat title="Claimable SQK" icon="spark" value={sqk?.display ?? (account ? 'Unavailable' : '—')} description={sqk ? 'Accrued staking rewards' : statWaiting} accent>
          {sqk?.truncated && <details className="exact-amount"><summary>Exact amount <Icon name="chevron" size={14} /></summary><p className="numeric">{sqk.exact} SQK</p><p>Overview truncated to 4 decimals.</p></details>}
          {account && !sqk && <p className="field-hint">{portfolio.data?.assetError ?? 'Rewards are unknown until staking is verified.'}</p>}
        </Stat>
        <Stat title="Your Squeeks" icon="layers" value={count === null ? '—' : `${count.toLocaleString('en')}${account?.tokenCounts.staking === null ? '+' : ''}`} description={account ? highestLevel ? `${account.nextCursor || account.tokenCounts.staking === null ? 'Highest loaded level' : 'Highest level'}: ${highestLevel} of ${account.economy.maximumLevel}` : 'No Squeeks returned for this wallet' : loading ? 'Reading your collection…' : portfolio.status === 'error' ? 'Collection unavailable' : 'Wallet and staking holdings'} />
        <Stat title="Clout badges" icon="shield" value={badgeCount === null ? '—' : String(badgeCount)} description={badgeCount === null ? 'Add a Genesis profile below' : 'Earned by the profile below'} />
      </div>
      {account && <div className="account-line"><div className="address-block"><Icon name="wallet" size={16} /><code>{account.account}</code><button className="icon-button" type="button" aria-label="Copy wallet address" onClick={() => void copyAddress()}><Icon name={copyStatus === 'Address copied.' ? 'check' : 'copy'} size={16} /></button></div><button className="text-button" type="button" onClick={() => void lookup(account.account)}><Icon name="refresh" size={16} />Refresh wallet</button><span role="status" className="copy-status">{copyStatus}</span></div>}
      <div className="content-grid">
        <section className="panel collection-panel" aria-labelledby="collection-heading">
          <div className="panel-heading"><h2 id="collection-heading">Your Squeeks</h2><span className="small muted">Genesis collection</span></div>
          {account ? <>
            <div className="filter-row" aria-label="Squeek custody filter"><button type="button" aria-pressed={filter === 'all'} onClick={() => showTokens('all')}>All Squeeks</button><button type="button" aria-pressed={filter === 'wallet'} onClick={() => showTokens('wallet')}>In wallet ({BigInt(account.tokenCounts.wallet).toLocaleString('en')})</button><button type="button" aria-pressed={filter === 'staking'} onClick={() => showTokens('staking')}>Staked ({account.tokenCounts.staking === null ? 'unknown' : BigInt(account.tokenCounts.staking).toLocaleString('en')})</button></div>
            {tokens.length ? <ul className="token-list">{tokens.map((token: Token) => <li key={token.tokenId}><div className="token-art"><TokenMark /></div><div className="token-info"><h3>Squeek #{token.tokenId}</h3><p>{token.custody === 'staking' ? 'In staking' : 'In wallet'}</p></div><div className="token-level"><span>Level</span><strong>{token.level}</strong></div></li>)}</ul> : <div className="collection-empty"><Squeek /><h3>{account.tokens.length === 0 ? 'No Squeeks here yet.' : `No ${filter === 'staking' ? 'staked Squeeks' : 'Squeeks in this wallet'} shown.`}</h3><p>{account.nextCursor ? 'More Squeeks may be on the next page. Load more below.' : account.tokenCounts.staking === null ? 'Wallet holdings are shown. Staking holdings are currently unknown.' : 'Try another wallet, or visit Squeekchain to explore Genesis.'}</p></div>}
            <div className="collection-count" role="status">{maxShown} of {filtered.length} loaded Squeeks shown{account.nextCursor ? ' · more available' : ''}.</div>
            {visibleCount < filtered.length ? <button type="button" className="secondary-button load-more" onClick={() => setVisibleCount(n => n + 12)}>Show more Squeeks<Icon name="chevron" size={16} /></button> : account.nextCursor ? <button type="button" className="secondary-button load-more" disabled={pageLoading || pageRemaining > 0} onClick={() => void loadMore()}>{pageLoading ? 'Loading more…' : pageRemaining > 0 ? `Retry in ${pageRemaining}s` : 'Load more Squeeks'}<Icon name="chevron" size={16} /></button> : null}
            {pageError && <p className="field-error" role="alert">{pageError}</p>}
            <p className="source-note">Read {formatTimestamp(account.generatedAt)} · {account.chain.confirmations} confirmations · block {BigInt(account.chain.safeThroughBlock).toLocaleString('en')}.</p>
          </> : <div className="collection-welcome"><Squeek /><div><h3>Meet your Squeeks.</h3><p>Look up a wallet to meet its Squeeks and see how far they’ve levelled up.</p><span className="welcome-note"><span className="little-dot" />Wallet and staked Squeeks, together</span></div></div>}
          <div className="collection-footer"><Icon name="info" size={17} /><p>{account ? account.tokenCounts.staking === null ? 'Staking holdings are unknown. Levels reflect the Squeeks the API returned.' : 'Levels are shown per NFT. SQK rewards belong to the staking account.' : 'Your collection will appear here after a wallet lookup.'}</p></div>
        </section>
        <CloutPanel onCount={setBadgeCount} />
      </div>
      <section className="how-it-works" id="how-it-works" aria-labelledby="how-heading"><div className="how-heading"><Icon name="info" size={21} /><h2 id="how-heading">A few things to know</h2></div><div className="notes-grid"><div><h3>Public data, personal view</h3><p>Wallet lookups read Squeekchain’s public API. You never connect a wallet or sign a message.</p></div><div><h3>Testnet, for now</h3><p>The API currently serves Sepolia testnet data. These test Squeeks and SQK have no monetary value.</p></div><div><h3>Clout has its own home</h3><p>Enter a Genesis profile, or import its public data when cross-site reads are restricted. Its badges are separate from wallet holdings.</p></div></div><details className="data-details"><summary>Where does the data come from?<Icon name="chevron" size={16} /></summary><p>Account and economy data come from <a href={API_URL + '/economy/state'} target="_blank" rel="noreferrer">api.squeekchain.com<Icon name="external" size={14} /></a>. The account snapshot is delayed by the confirmation count shown above. SQK is converted using the economy response’s decimals, with exact amounts available when truncated. An unavailable reward is unknown, never a zero balance.</p><p>Clout comes from <a href={COMMUNITY_URL + '/aura/badges'} target="_blank" rel="noreferrer">Squeekchain’s Community API<Icon name="external" size={14} /></a>. Its public profiles are indexed by Genesis code, and do not expose a wallet mapping. The profile endpoint may restrict cross-site reads; the import control accepts a local JSON snapshot and labels it as unverified. A supplied profile is not proof that a wallet owns those badges. This independent viewer does not claim rewards or change your account.</p></details></section>
    </main>
    <footer className="site-footer"><p><Squeek compact />Made for the Squeekchain community.</p><a href="https://squeekchain.com/genesis" target="_blank" rel="noreferrer">Visit Squeekchain Genesis<Icon name="external" size={15} /></a></footer>
  </>
}

export default App
