# Static hosting handoff

Squeekfolio's deployable website is the complete repository-root **`dist/`** directory. Its entry point is `dist/index.html`. Source, the npm lockfile and the built export travel together; the publisher serves the export without installing dependencies or rebuilding it.

## Publication status

The export is prepared for IMD's publication step. After review, the network pins the directory and assigns its public URL. That public URL was not supplied in the project handoff and has not been assigned or verified during this task. A local preview address is not the published website.

## Hosting settings

| Setting | Value |
| --- | --- |
| Publish directory | `dist/` |
| Entry document | `index.html` |
| Publisher build command | None; serve the included export |
| Development rebuild | `npm ci`, `npm run typecheck`, `npm run build` |
| Routing | One page, with existing fragment links; no server rewrites |
| Asset base | Relative (`./`); Vite configuration is unchanged |
| Required services | The existing public Squeekchain APIs; no backend or credentials |

Serve the directory over HTTPS with normal HTML, JavaScript, CSS, SVG, PNG and WOFF2 content types. Keep all nested directories intact. The directory URL should end in `/`, or the host should redirect its slashless form to the directory URL before serving HTML, so relative assets resolve correctly. Root domains and nested gateway paths are both supported. There are no absolute local-asset paths in the export.

Do not publish the repository root or a lone HTML file. Source files, tests, build tooling and validation reports are not runtime dependencies. No wallet connector, proxy, server function, API key or address substitution is required. The delivered wallet lookup behavior, application layout, interface copy and API endpoints are unchanged.

## Verify the release

```sh
npm run typecheck
npm run build
npm test
node scripts/check-hosting.mjs
npm run check:delivery
```

The hosting check runs a bounded local static host, visits the export at `/` and `/preview/nested/site/`, verifies every exported file's served bytes, checks local resource loading and confirms the main action is on the first 390px-wide screen. It writes [the checked file list and SHA-256 hashes](reports/hosting-check.json). Its external API requests are blocked deliberately; the interaction suite and separate live check cover those flows. `IMD_PLAYWRIGHT` can select an existing Playwright module, as with the pinned design probe.

Once IMD supplies the public link, open its exact directory URL on mobile and desktop, confirm the favicon/font/styles load, and perform the public-wallet lookup. The same profile CORS restriction and snapshot-import fallback documented in the README can apply on a public host. This local rehearsal does not establish remote uptime, gateway behavior, a public origin's API permissions or the appearance of a social preview.

The current build, browser checks, six-domain review and limitations are recorded in [VALIDATION.md](VALIDATION.md). Validation reports and screenshots live under `reports/`, so they accompany the source submission.
