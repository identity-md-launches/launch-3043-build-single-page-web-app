import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

// Local verification only. The production export has no server dependency.
const root = resolve('dist')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' }
const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/preview/')) { res.writeHead(404).end('Use /preview/'); return }
    const relative = decodeURIComponent(url.pathname.slice('/preview/'.length)) || 'index.html'
    const path = resolve(root, relative)
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return }
    const file = await readFile(path)
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(req.method === 'HEAD' ? undefined : file)
  } catch { res.writeHead(404).end('File not found') }
})
server.listen(4173, '127.0.0.1', () => console.log('Static export preview: http://127.0.0.1:4173/preview/'))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)))
