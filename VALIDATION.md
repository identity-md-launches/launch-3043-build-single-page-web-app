# Static export validation

Checked November 7, 2026. This is a worker's reproducible report, not independent certification.

## Scope and completion

The assignment preserves Squeekfolio's existing wallet lookup, layout and interface copy while delivering its static publication input. The repository-root `dist/` contains the complete website. The source, public assets, existing build configuration, npm manifest and lockfile are unchanged. The rebuilt seven-file export is byte-for-byte identical to the delivered export. [Preservation report](reports/preservation.json).

**Complete for the worker's static-export scope. Public publication is after review.** IMD pins `dist/` and assigns the public URL after the job's review. No public URL was supplied, assigned or checked here; neither a preview URL nor an invented domain is reported as live hosting. [Publication handoff](HOSTING.md).

## Acceptance coverage

| Requirement | Result and evidence |
| --- | --- |
| Usable website, primary interactions and responsive layouts | Checked: existing 20-test suite passed; actual public wallet lookup and profile-import recovery passed. |
| `dist/index.html`, assets, source and lockfile delivered together | Checked: existing tracked export rebuilt; all seven export files remain present. Relative HTML and CSS references resolve. |
| Production build, typecheck and useful interactions | Passed; actual commands and runtime adaptations below. |
| Better Interface applied and reviewed across six domains | Checked within preservation scope; review below. No interface changes were needed. |
| Product and main action on the first 390px screen | Checked in browser and screenshot: heading, labelled address field and full lookup button are visible at 390 × 844. |
| Title, favicon, description, `og:title`, `og:image` | Present; favicon and share-image bytes served at both root and nested paths. |
| Final `DESIGN.md` | Updated from the preserved source and this review's measured pairs and observed layouts. |
| README install, preview and rebuild steps | Present; hosting handoff and current validation results added. |
| Reachable public URL | After review: the network publishes the included export. Remote deployment was not performed or verified by this worker. |

## Commands and observed results

Dependency installation and the production checks ran in `test/scratch/project/`, a copy of the existing build inputs. This kept root dependencies and protected files untouched. No package was added to the manifest, and no browser was downloaded. The scratch directory is excluded from submission.

| Command or check | Actual result |
| --- | --- |
| `npm ci --prefix test/scratch/project --cache test/scratch/npm-cache --ignore-scripts --no-audit --no-fund` | Passed from the existing lockfile. Dependencies remain only in ignored scratch space. |
| `npm run typecheck --prefix test/scratch/project` | Passed, `tsc --noEmit`, no diagnostics. |
| `npm run build --prefix test/scratch/project` | Passed, Vite production export; 127 modules transformed. Rollup removed two misplaced dependency `@__PURE__` annotations; these were warnings, not build failures. |
| Existing `tests/interactions.spec.ts`, using the supplied Playwright runner | **20 passed, 0 failed, 0 skipped**, including three Axe scans with no reported violations. [Test report](reports/interactions.json). |
| Pinned `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | **16/16 passed**, unchanged probe, with its supported module/browser overrides. [Probe results](reports/taste-summary.json). |
| `node scripts/check-hosting.mjs`, with the supplied Playwright module | Passed at `/` and `/preview/nested/site/`; seven files checked at each path; loaded font, visible first-screen action, no local-resource or script failures. [File hashes and results](reports/hosting-check.json). |
| `npm run check:live --prefix test/scratch/project`, using the supplied Chromium runtime and network proxy | Passed with unmocked public APIs: six Squeeks and six clout badges; expected cross-site profile failure recovered by importing actual public JSON. [Live report](reports/live-check.json). |
| `npm run check:delivery` | Passed: required outputs, relative runtime URLs, existing files, archive/symlink checks and the 8 MiB budget. |
| `git diff --exit-code` restricted to application, public assets, export and protected build inputs | Passed: the preserved paths have no diff. `dist/index.html` is tracked and not ignored. No staging or commit was performed; submission is handled by the worker. |

The browser connector returned `Transport closed`. The lockfile's Playwright runner could not launch the available full browser (`chrome_crashpad_handler: --database is required`). The successful interaction run used the supplied Playwright runner with its matching headless browser. Only scratch imports were redirected; test bodies, fixtures, application source and assertions were unchanged. Local proxy interference initially caused false preview-port conflicts; removing proxy settings for the local test run resolved them. The scratch preview used port 4197. These adaptations are verification-only and are absent from the runtime export.

The first live attempt could not reach the public APIs (`net::ERR_EMPTY_RESPONSE`). Retrying through the provided network proxy succeeded. The successful run has no uncaught script errors, missing local resources or HTTP error statuses. Its only failed request and console errors are the documented profile CORS rejection. Neither the proxy nor any verification configuration is included in the application.

## Six-domain Better Interface review

The existing visual idea is a compact, read-only Genesis overview, carried by a violet accent and local dot-grid hamster artwork. The brief's requirement to preserve layout and copy takes precedence over optional redesign suggestions.

| Domain | Coverage and evidence | Unperformed or not applicable |
| --- | --- | --- |
| Accessibility | **Checked.** Native forms, labels, buttons and disclosures in `src/App.tsx:106`, `src/App.tsx:117` and `src/App.tsx:222`. Keyboard skip link and address submission, invalid-field focus, loading/disabled labels, profile-import focus and expanded badges exercised. Focus ring visible in the [keyboard screenshot](reports/screenshots/mobile-keyboard-focus.png); source token at `src/styles.css:86`. Axe scans passed in initial, populated/expanded and invalid-import states. Reduced-motion loading retains its text cue. | No screen-reader session or physical touch device. Forced-colors behavior reviewed in source, not rendered. No dialogs, transactions or wallet connection apply. |
| Layout | **Checked.** Shared edges and native flow in `src/styles.css:94`; content breakpoints at `src/styles.css:254`, `src/styles.css:266`, `src/styles.css:288`. Initial probe checked 320, 390, 1440; populated live reflow checked 320, 390, 600, 784, 1024, 1440 with no horizontal overflow. Long-amount fixture, 200% root text enlargement and RTL smoke check passed. Product and action visible on the first 390 × 844 screen. | Native browser zoom and representative translated content were not tested. RTL smoke check is not a localization audit. |
| Writing | **Checked.** Existing visible labels, retry instructions, zero/unknown states and import disclaimer reviewed against their handlers in `src/App.tsx:46`, `src/App.tsx:73`, `src/App.tsx:135`, `src/App.tsx:224`. “Look up wallet” names its action. Wallet/profile identity remains explicitly separate. Existing copy was preserved. | Remote API-supplied badge names and future error text are outside copy control. No new marketing material was added. |
| Typography | **Checked.** Existing six-token scale at `src/styles.css:43`, weights 400/600/700, local variable WOFF2 loaded. Probe measured five sizes per initial width, one font family and three weights. Live/fixture content, long wallet address and exact amount were inspected for wrapping; numeric values remain selectable. | Other browser font rendering, every possible imported string and native iOS input zoom were not verified. |
| Colors | **Checked.** Existing semantic tokens at `src/styles.css:26`. Actual rendered text/background pairs: page **14.01:1**, primary button **6.64:1**, secondary on white **6.54:1**, accent summary **11.13:1**. Probe's measured initial text pairs passed. Default states measured; values preserved in the live report. | Every hover/focus/disabled contrast pair was not measured separately. No dark theme exists or was added. Artwork is decorative, not a status channel. |
| UI details | **Checked.** Existing bordered, flat panels; native expanded/collapsed badges; selected collection and badge filters; validation, loading, retry, empty, imported and populated states exercised. Source uses explicit 150ms property transitions and `.96` press scaling only under motion permission (`src/styles.css:248`). Probe found no border/shadow duplication or reduced-motion animation leakage. | Slow-motion replay in a browser Animations panel was not performed. No new overlays or animations were introduced. |

## Findings, fixes and rechecks

| Finding | Evidence and disposition |
| --- | --- |
| Medium, delivery: validation links pointed to evidence absent from the handed-over tree | The prior README's validation section linked to `artifacts/validation.md` and screenshots that were not delivered. `scripts/check-live.mjs:24` also wrote evidence outside the persistent source bundle. Fixed by retaining fresh evidence under `reports/`, writing this tracked review, updating links, and changing live-check output paths. `scripts/check-delivery.mjs:21` now requires the handoff, review and hosting report. Rechecked file existence and bundle inclusion. |
| Medium, delivery: no explicit publication handoff or reproducible release file list | Added `HOSTING.md:3` and `scripts/check-hosting.mjs:26`. The rehearsal validates root/nested hosting, records every export file's byte count and SHA-256, and explicitly distinguishes local checks from public publication. Rechecked both mounts successfully. |
| Interface findings | No applicable high or medium interface defect reproduced in this preservation scope. The 16 probe checks and required primary interactions passed; layout, copy and lookup source remain unchanged. |

## Visual evidence and remaining limitations

Inspected the actual rendered [390px first screen](reports/screenshots/mobile-initial.png), [keyboard focus](reports/screenshots/mobile-keyboard-focus.png), [desktop populated state](reports/screenshots/desktop-live.png), [mobile populated state](reports/screenshots/mobile-live.png), and [profile import recovery](reports/screenshots/profile-import-recovery.png). The probe also measured the 320px initial layout and produced a 1440px initial screenshot, inspected during review. The unchanged local share card is 1200 × 630; its eventual social-platform unfurl was not tested.

WebKit could not launch because its executable was unavailable; Safari remains unverified. Physical devices, a screen reader, native browser 200% zoom, translated locales, rendered forced-colors behavior and slow-motion replay remain unperformed. The successful text-size and RTL smoke checks do not substitute for them. Third-party API availability, future schema changes, public-origin CORS behavior, gateway caching, remote HTTPS, domain assignment and public uptime are outside the local evidence. The existing profile CORS restriction remains visible and recoverable; imported badges do not prove wallet ownership.

The production export contains no verification fixtures, reports, dependencies, proxy configuration, backend or private credentials. The preserved source and runtime assets, complete `dist/`, documentation and compact evidence fit within the assignment's 8 MiB budget.

Review guidance: pinned Better Interface (Jakub Krehel, MIT) and its Impeccable documentation adaptation (Paul Bakaus, Apache-2.0); existing attribution and notices are retained in `THIRD_PARTY_NOTICES.md`.
