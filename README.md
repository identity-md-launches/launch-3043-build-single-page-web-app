# Squeekfolio

A single-page, read-only home for Squeekchain Genesis members. Look up a wallet to see its Squeek NFT levels and claimable staking SQK. Explore a Genesis profile’s clout badges alongside the wallet view. The finished static website is included in `dist/`.

**Static publication:** publish the complete `dist/` directory without a server build. IMD pins the submitted export and assigns the public URL after review. No public URL was supplied or verified during this task. [Hosting settings and release handoff](HOSTING.md) describe the exact directory to publish and the checked asset hashes. The existing application behavior, layout and interface copy are preserved.

**Current API limitation:** public Genesis profiles use an eight-character member code, and do not expose a wallet-to-profile mapping. Their endpoint also blocks cross-site browser reads from this site. Squeekfolio therefore accepts a separate Genesis profile code/link and provides a public-JSON import fallback. Imported badges are clearly labelled as an unverified local snapshot. The app cannot establish that the entered wallet owns that profile’s badges. Nothing is guessed or presented as verified wallet ownership.

## Install, preview and rebuild

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run preview
```

Open the address printed by Vite. This previews the included `dist/` without rebuilding it. To develop or rebuild:

```sh
npm run dev
npm run typecheck
npm run build
npm run preview
```

`npm run build` replaces `dist/` with the final production export. Keep the entire directory in the submission. Vite uses `base: './'`; scripts, stylesheet, font, favicon and share image are local and relative. It works at a static hosting subpath. Serve it over HTTP(S), rather than opening `index.html` as a `file:` URL. No server or private credentials are part of the production app.

To inspect the same nested path used in validation:

```sh
npm run preview:subpath
```

Open `http://127.0.0.1:4173/preview/`. Stop that preview before running the tests, which manage their own short-lived preview on the same port.

## Use

1. Enter an EVM wallet address and select **Look up wallet**, or try the public example. The address is trimmed and normalized to lowercase; zero and malformed addresses are rejected. Mixed-case EIP-55 checksum validity is not independently checked.
2. Read claimable SQK and each NFT’s level. Filter between wallet and staking holdings. Larger collections have explicit pagination; the top level is labelled as the highest **loaded** level until all pages are loaded.
3. Enter your Genesis profile code or public profile link under **Your clout**. This is separate from wallet identity. On the current cross-site restriction, open **Import a profile snapshot**, follow **Open public profile JSON**, copy the complete response, paste it into **Public profile JSON**, and select **Read snapshot**. This happens locally, without uploading the JSON.
4. Select **Earned** or **All** to explore clout badges. Expand a badge for its criteria. Imported data keeps its supplied snapshot date and a visible import disclaimer.

The example wallet was observed through [Squeek #1’s public API response](https://api.squeekchain.com/v1/squeeks/1) on November 6, 2026. The example [public Genesis profile](https://squeekchain.com/genesis/639pun7q) is selected independently; no relationship between those examples is implied. Test fixtures never supply runtime results.

## Data and behavior

| Purpose | Public source |
| --- | --- |
| Wallet holdings, levels, claimable staking rewards | `GET https://api.squeekchain.com/v1/accounts/{address}?limit=100` |
| SQK symbol and decimals | [Economy state](https://api.squeekchain.com/v1/economy/state) |
| Earned Genesis achievements | `GET https://community.squeekchain.com/v1/community/profiles/{code}` |
| Badge lane, descriptions and criteria | [Genesis badge catalogue](https://community.squeekchain.com/v1/community/aura/badges) |
| Account schema and availability semantics | [Official API documentation](https://docs.squeekchain.com/developers/api/) |

The current account schema is version 3. Requests have an 18-second timeout, omit credentials, respect exposed `Retry-After` delays, and offer manual retry. There is no automatic polling. HTTP-200 `status: unavailable`, missing rewards, unknown staking holdings, changed schemas and failed unit verification remain unknown instead of becoming zeros. SQK base units stay strings, with decimal conversion that does not use floating point. The overview truncates after four fractional digits and exposes the exact amount. Pages must match the wallet, release, chain and safe block; inconsistent or duplicate pages are rejected.

Account data is confirmation delayed; the returned timestamp, network, block and confirmation count are shown. Currently the API serves Sepolia testnet. There is no claim transaction, wallet connection, tracking, persistence, backend, RPC dependency or API key. Wallet and profile inputs stay in memory and are sent only to their respective public API endpoints when looked up. The public badge catalogue is requested once on page load. Data remains subject to API availability and schema changes.

## Validation performed

On November 7, 2026, the production build and `tsc --noEmit` passed. The existing Chromium suite passed **20/20** interaction checks, including keyboard submission, validation, real zero versus unknown values, exact SQK precision, filters, pagination, malformed responses, timeout, rate-limit recovery, profile import and profile-code matching. Axe reported no violations in its initial, populated/expanded and invalid-import scans. The pinned `taste@1` probe passed **16/16** checks at 320, 390 and 1440 pixels. The 390px first-screen screenshot shows the product, wallet input and primary action.

The new hosting rehearsal passed at both `/` and `/preview/nested/site/`: all seven export files were served intact, all local runtime resources loaded, the bundled font loaded, and the primary action remained visible on the first phone screen. The export is **461,828 bytes**, with SHA-256 hashes recorded in the hosting report. This rehearses ordinary static hosting; it does not verify a public gateway or publish a URL.

The unmocked check read six real Squeeks from the public account API, encountered the expected profile CORS failure, then displayed six clout badges by importing the public API’s actual JSON through the UI. Reflow passed at 320, 390, 600, 784, 1024 and 1440 pixels. There were no uncaught script errors, missing local resources or HTTP error statuses; the blocked profile fetch produced the documented CORS console/request errors. This is a worker report, not independent certification.

The browser connector returned “Transport closed”; direct Playwright using the supplied Chromium runtime worked. The lockfile's test runner could not launch the available full browser, so the same tests ran successfully with the supplied runner and its matching headless browser. WebKit had no available executable. Safari, physical devices, a screen reader, native browser 200% zoom and slow-motion inspection were **not verified**. A 200% root text-size reflow and an RTL layout smoke check passed; neither substitutes for those missing checks.

Full six-domain review, fixes, actual commands and limitations: [VALIDATION.md](VALIDATION.md). Design tokens and patterns: [DESIGN.md](DESIGN.md). Machine-readable results: [hosting and checksums](reports/hosting-check.json), [interactions](reports/interactions.json), [live check](reports/live-check.json), [taste probe](reports/taste-summary.json). Images: [mobile first screen](reports/screenshots/mobile-initial.png), [desktop results](reports/screenshots/desktop-live.png), [mobile results](reports/screenshots/mobile-live.png), [keyboard focus](reports/screenshots/mobile-keyboard-focus.png), [profile import recovery](reports/screenshots/profile-import-recovery.png). These files accompany the source under `reports/`.

To reproduce the interaction suite with a standard Playwright installation:

```sh
npx playwright install chromium
npm run build
npm run typecheck
npm test
node scripts/check-hosting.mjs
npm run check:live
npm run check:delivery
```

An already installed Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. The hosting checker accepts an existing Playwright module via `IMD_PLAYWRIGHT`. The live checker also accepts `PLAYWRIGHT_PROXY_SERVER` when a verification environment requires a network proxy. These settings are verification tools only. The scripts and tests run their own preview and close it when they finish. Synthetic failure states use intercepted requests; the live checker imports an actual API response, not a fixture. It overwrites `reports/screenshots/` and `reports/live-check.json` with newly observed results. Tests write temporary reports only under `test/scratch/`.

The pinned probe ran unchanged using `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste`, with its supported `IMD_PLAYWRIGHT` module override and the provided browser runtime. Assignment inputs and scratch tooling are not runtime dependencies. The delivered `reports/taste-summary.json` preserves the measured results.

## Assets and submission size

The Plus Jakarta Sans variable Latin font is bundled locally with its [OFL license](public/fonts/OFL.txt). The hamster dot illustration and SVG UI assets are local. `npm run build:social` regenerates `public/social.png` with Playwright; rebuild the site afterward to update the exported share image. Relative Open Graph image URLs are intentional because the hosting address is assigned later.

The explicit ignore-file budget is **1 KiB** for `.gitignore`; all nested `node_modules`, `.vite`, `.cache`, `.npm`, `npm-cache`, local tooling directories, Playwright reports, test results, TypeScript build caches and `test/scratch` have a **zero-byte submission budget**. Source, configuration, lockfile, local runtime assets, documentation, screenshots and `dist/` together have an **8 MiB maximum**. `npm run check:delivery` checks the byte budget, required files, relative HTML/CSS assets, missing resources, symlinks and unwanted archives. No dependency registry, package tarballs, submodules or build caches are required or included.

Design review used Jakub Krehel’s [Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT, and the documentation method adapted from Paul Bakaus’s [Impeccable](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0. This hosting task preserves the app’s existing styling; it does not establish official Squeekchain branding.
