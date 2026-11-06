import { readFile, readdir, stat } from 'node:fs/promises'
import { join, posix } from 'node:path'
import assert from 'node:assert/strict'

const BUDGET = 8_388_608
const excluded = new Set(['.git', '.github', '.imd', 'node_modules', '.cache', '.vite', '.npm', '.aws', '.codex', '.agents', 'npm-cache', 'playwright-report', 'test-results'])
const files = []
async function walk(directory = '.') {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = posix.join(directory, item.name)
    if (excluded.has(item.name) || path === 'test/scratch' || item.name.startsWith('.env') || item.name.endsWith('.tsbuildinfo')) continue
    assert(!item.isSymbolicLink(), `Unexpected symlink: ${path}`)
    if (item.isDirectory()) await walk(path)
    else if (item.isFile()) {
      assert(!/\.(tgz|zip|tar|gz)$/.test(path), `Unnecessary dependency/archive artifact: ${path}`)
      files.push({ path, bytes: (await stat(path)).size })
    }
  }
}
await walk()
for (const path of ['dist/index.html', 'package.json', 'package-lock.json', 'README.md', 'DESIGN.md', 'artifacts/validation.md']) assert(files.some(file => file.path === path), `Missing deliverable: ${path}`)
assert(!files.some(file => file.path === '.gitmodules'), 'A submodule manifest must not be delivered')
const ignore = await readFile('.gitignore', 'utf8')
assert(Buffer.byteLength(ignore) <= 1024 && ignore.includes('Explicit path budget'), 'Ignore file must retain its explicit 1 KiB budget')
assert(!ignore.split('\n').some(line => /^\/?dist\/?$/.test(line.trim())), 'The static export must be included')
const html = await readFile('dist/index.html', 'utf8')
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const asset = match[1]
  assert(asset.startsWith('./'), `Export asset is not relative: ${asset}`)
  assert((await stat(join('dist', asset))).isFile(), `Missing runtime asset: ${asset}`)
}
for (const file of files.filter(file => file.path.startsWith('dist/') && file.path.endsWith('.css'))) {
  const css = await readFile(file.path, 'utf8')
  for (const match of css.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/g)) {
    if (match[1].startsWith('data:')) continue
    assert(!match[1].startsWith('/') && !match[1].startsWith('http'), `Nonlocal CSS asset: ${match[1]}`)
    assert((await stat(join(file.path.slice(0, file.path.lastIndexOf('/')), match[1]))).isFile(), `Missing CSS asset: ${match[1]}`)
  }
}
const total = files.reduce((sum, file) => sum + file.bytes, 0)
assert(total <= BUDGET, `Submission exceeds 8 MiB: ${total}`)
console.log(JSON.stringify({ passed: true, files: files.length, totalBytes: total, budgetBytes: BUDGET, exportBytes: files.filter(file => file.path.startsWith('dist/')).reduce((sum, file) => sum + file.bytes, 0), largestFiles: files.sort((a, b) => b.bytes - a.bytes).slice(0, 8) }, null, 2))
