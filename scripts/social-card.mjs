import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

// Rebuild the local share card. PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH is optional.
const rows = ['    oo          oo    ', '   oooo        oooo   ', '  oooooo      oooooo  ', '  ooooooo    ooooooo  ', '  ooooxoooooooooxoo  ', '   ooooooooooooooo   ', '  ooooooooooooooooo  ', ' ooooooooooooooooooo ', ' oooooxoooooooxooooo ', ' oooooxoooooooxooooo ', ' ooooooooooooooooooo ', ' oooooooowwwoooooooo ', ' ooooowwwxwwwooooooo ', ' oooowwwwwwwwwoooooo ', '  ooowwwwwwwwwooooo  ', '   ooowwwwwwwooooo   ', '    ooooooooooooo    ', '     ooooooooooo     ', '      oo    oo       ']
const dots = rows.flatMap((row, y) => [...row].map((pixel, x) => pixel === ' ' ? '' : `<circle cx="${x * 14}" cy="${y * 14}" r="5.5" fill="${pixel === 'x' ? '#2a1944' : pixel === 'w' ? '#fbf8ff' : '#8560c5'}"/>`)).join('')
const icon = await readFile('public/favicon.svg', 'utf8')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f6f5f9"/><rect x="760" width="440" height="630" fill="#eee7f8"/><circle cx="970" cy="305" r="188" fill="#e2d5f3"/><g transform="translate(805 165)">${dots}</g><g transform="translate(64 60)">${icon.replace(/<svg[^>]*>/, '<svg width="48" height="48" viewBox="0 0 40 40">')}</g><text x="128" y="94" fill="#292332" font-family="Arial,sans-serif" font-size="30" font-weight="700">Squeekfolio</text><text x="64" y="240" fill="#292332" font-family="Arial,sans-serif" font-size="72" font-weight="700" letter-spacing="-3">Your Genesis,</text><text x="64" y="324" fill="#7041bb" font-family="Arial,sans-serif" font-size="72" font-weight="700" letter-spacing="-3">at a glance.</text><text x="68" y="386" fill="#625a6f" font-family="Arial,sans-serif" font-size="27">Squeek levels. Claimable SQK. Your clout.</text><rect x="64" y="437" width="263" height="58" rx="13" fill="#7041bb"/><text x="89" y="474" fill="#fff" font-family="Arial,sans-serif" font-size="22" font-weight="700">Your wallet, together.</text><text x="64" y="576" fill="#625a6f" font-family="Arial,sans-serif" font-size="20">An independent viewer for the Squeekchain community</text></svg>`
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`)
  await page.screenshot({ path: 'public/social.png' })
  console.log('Wrote public/social.png (1200 × 630).')
} finally { await browser.close() }
