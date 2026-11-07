import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createServer, get } from 'node:http'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

// A bounded, local static-host rehearsal. It never publishes or needs an account.
const root = 'dist'
const mounts = ['/', '/preview/nested/site/']
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
}
const files = new Map()
async function collect(directory = '') {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = [directory, entry.name].filter(Boolean).join('/')
    assert(!entry.isSymbolicLink(), `Export must be self-contained: ${path}`)
    if (entry.isDirectory()) await collect(path)
    else {
      assert(entry.isFile(), `Unsupported export entry: ${path}`)
      files.set(path, await readFile(join(root, path)))
    }
  }
}
await collect()
assert(files.has('index.html'), 'Build dist/index.html first')
const exported = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, data]) => ({
  path, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'),
}))
const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  const mount = mounts.find(prefix => prefix !== '/' && pathname.startsWith(prefix)) ?? '/'
  const path = decodeURIComponent(pathname.slice(mount.length)) || 'index.html'
  const data = files.get(path)
  if (!data) { res.writeHead(404).end('File not found'); return }
  res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Content-Length': data.length })
  res.end(req.method === 'HEAD' ? undefined : data)
})

function download(url) {
  return new Promise((resolve, reject) => {
    get(url, { agent: false }, response => {
      const chunks = []
      response.on('data', data => chunks.push(data))
      response.on('end', () => resolve({ status: response.statusCode, type: response.headers['content-type'], data: Buffer.concat(chunks) }))
      response.on('error', reject)
    }).on('error', reject)
  })
}

let browser
try {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  const { chromium } = process.env.IMD_PLAYWRIGHT
    ? await import(pathToFileURL(process.env.IMD_PLAYWRIGHT).href)
    : await import('playwright')
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
  const results = []
  for (const mount of mounts) {
    for (const file of exported) {
      const response = await download(origin + mount + file.path)
      assert.equal(response.status, 200, `${mount}${file.path} failed`)
      assert.equal(response.type, mime[extname(file.path)] ?? 'application/octet-stream')
      assert.deepEqual(response.data, files.get(file.path), `Served bytes changed: ${file.path}`)
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errors = [], localFailures = [], loaded = new Set()
    // This check covers static delivery independently of public API availability.
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort('blockedbyclient'))
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => { if (request.url().startsWith(origin)) localFailures.push(request.url().slice(origin.length)) })
    page.on('response', response => {
      if (response.url().startsWith(origin)) {
        const path = new URL(response.url()).pathname
        if (!response.ok() || !path.startsWith(mount)) localFailures.push(path)
        else loaded.add(path)
      }
    })
    await page.goto(origin + mount, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.title(), 'Squeekfolio · Your Genesis overview')
    const button = page.getByRole('button', { name: 'Look up wallet', exact: true })
    const bounds = await button.boundingBox()
    assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 844, 'Primary action is outside the first phone screen')
    assert(await page.getByLabel('Wallet address', { exact: true }).isVisible())
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Phone layout overflows')
    for (const selector of ['link[rel="icon"]', 'meta[property="og:image"]']) {
      const reference = await page.locator(selector).getAttribute(selector.startsWith('link') ? 'href' : 'content')
      assert(reference?.startsWith('./'), `${selector} must use a relative URL`)
      assert.equal((await download(new URL(reference, origin + mount))).status, 200)
    }
    const fontLoaded = await page.evaluate(() => [...document.fonts].some(font => font.family === 'Plus Jakarta Sans' && font.status === 'loaded'))
    assert(fontLoaded, 'The bundled font did not load')
    assert.deepEqual(errors, [])
    assert.deepEqual(localFailures, [])
    results.push({ mount, filesServed: exported.length, localResourcesLoaded: [...loaded].sort(), firstScreenAction: true, fontLoaded, scriptErrors: errors, localResourceFailures: localFailures })
    await context.close()
  }
  const report = {
    checkedAt: new Date().toISOString(), passed: true,
    scope: 'Local static-host rehearsal at the root and a nested subpath. External API requests blocked; the interaction suite and live check cover data access separately.',
    publication: 'Ready for the network to pin dist/ after review; no public URL has been assigned or verified by this check.',
    browser: 'Chromium ' + browser.version(),
    exportBytes: exported.reduce((sum, file) => sum + file.bytes, 0), files: exported, mounts: results,
  }
  await mkdir('reports', { recursive: true })
  await writeFile('reports/hosting-check.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ passed: true, files: exported.length, exportBytes: report.exportBytes, mounts, report: 'reports/hosting-check.json' }, null, 2))
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
