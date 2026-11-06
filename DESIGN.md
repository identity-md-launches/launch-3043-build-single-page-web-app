# Squeekfolio design

## Overview

Squeekfolio is a compact wallet and Genesis-profile viewer for Squeekchain members. Its main action is an address lookup, placed immediately under the page title. Quiet violet surfaces and a local dot-grid hamster illustration carry the visual identity; the interface uses plain labels and selectable data. This is inferred product styling, not official Squeekchain branding.

`src/styles.css` is the canonical token and layout source. `src/App.tsx` defines the page’s summary, collection, clout and source-disclosure patterns. `src/components/Squeek.tsx` supplies the decorative illustration and brand mark; `src/components/Icon.tsx` supplies the local line icons.

## Colors

The system uses hexadecimal sRGB primitives, then semantic role tokens. Components consume the semantic tier. There is one light theme (`color-scheme: light`), with a forced-colors focus adjustment; no dark-mode switch is implemented.

| Semantic token | Primitive / value | Implemented role |
| --- | --- | --- |
| `--color-page` | `--gray-50`, `#f6f5f9` | Page and field backgrounds |
| `--color-surface` | `--gray-0`, `#ffffff` | Lookup, collection and clout panels |
| `--color-surface-muted` | `--gray-100`, `#efedf3` | Neutral icon tiles and hover surfaces |
| `--color-border` | `--gray-200`, `#e2dfe9` | Structural borders, fields and row dividers |
| `--color-text` | `--gray-900`, `#292332` | Headings and primary content |
| `--color-text-secondary` | `--gray-600`, `#625a6f` | Descriptions, metadata and helpers |
| `--color-text-tertiary` | `--gray-500`, `#71697e` | Empty values and quieter icons/status text |
| `--color-accent` | `--purple-600`, `#7041bb` | Primary lookup fill and accent icons |
| `--color-accent-hover` | `--purple-700`, `#5c30a0` | Primary hover and text actions |
| `--color-accent-soft` | `--purple-50`, `#f0eafb` | SQK summary, selected filters, earned icon tiles |
| `--color-selection-bg` | `--purple-100`, `#e7ddf6` | Text selection background |
| `--color-accent-text` | `--purple-900`, `#3d2068` | Text on tinted surfaces and selected controls |
| `--color-on-accent` | `--gray-0`, `#ffffff` | Primary button label |
| `--color-success` | `--green-600`, `#38735d` | Status dot and read-only shield |
| `--color-error` | `--red-700`, `#a23245` | Error text and invalid field borders |
| `--color-error-bg` | `--red-50`, `#fdf0f2` | Wallet request failure surface |
| `--color-focus` | `--purple-600`, `#7041bb` | 3px focus outline with 4px offset |

The SVG artwork has its own decorative purple, ivory and dot-grid fills. They are illustration colors rather than status indicators or additional interactive accents.

Rendered contrast was measured in Chromium: primary page text on the page background **14.01:1**, secondary text on white **6.54:1**, and dark accent text on its tinted surface **11.13:1**. The current primary-button measurement is preserved in `artifacts/live-check.json`; the default and hover fills are also covered by the rendered probe/interaction scans. These are measured pairs, not a claim about every possible imported string, native control or browser.

## Typography

`public/fonts/plus-jakarta-sans-latin.woff2` is a self-hosted variable Latin font, declared with weights 400–700 and `font-display: swap`. The interface requests **400, 600 and 700**. Fallbacks are Arial and sans-serif; a system monospace stack is used only for the complete wallet address. The font’s loaded status was confirmed in the live browser check. Its OFL license is bundled with the font.

| Token | Default size | Usage |
| --- | --- | --- |
| `--text-small` | `.875rem` / 14px | Labels, metadata, buttons and compact descriptions |
| `--text-body` | `1rem` / 16px | Body, profile identity, inputs and JSON textarea |
| `--text-heading` | `1.25rem` / 20px | Panel headings, wordmark and NFT level numbers |
| `--text-subheading` | `1.5rem` / 24px | Collection empty heading and compact summary values |
| `--text-number` | `2.25rem` / 36px | Summary values and the mobile page title |
| `--text-display` | `2.75rem` / 44px | Desktop page title |

Body line-height is 1.6. Headings use 1.2; collection illustration copy uses 1.35, and supporting text that wraps uses 1.5–1.6. The page title tracks at `-.055em`, changing to `-.05em` on narrow screens; panel headings use `-.025em`, and large numbers use `-.04em`. Other text uses natural tracking. Headings balance; prose uses pretty wrapping.

Dynamic quantities use tabular numbers. Wallet addresses and exact amounts can wrap and remain selectable; they are never ellipsized. Long helper text is bounded by the panel, and collection empty-state text is limited to about 28–36 characters. Inputs and the import textarea stay at least 16px at the default root size. At any single width the interface stays within the six-size scale.

## Layout

The shared page width is `min(1120px, 100% - 64px)`. Header, content and footer share those edges. Normal flow is title, wallet form, data summary, collection/profile panels, explanatory notes and footer. There are no fixed overlays, sidebars or sticky controls.

Spacing tokens are `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 20px, `--space-6` 24px, `--space-8` 32px and `--space-10` 40px at the default root size. They are expressed in rem and consumed by padding, margins and gaps. Fixed optical/control values remain in pixels: panel padding is 26px on the widest view, icon offsets are fixed, and borderless/tinted summaries compensate for the neighboring 1px border.

| Breakpoint | Final behavior |
| --- | --- |
| Above 64rem | Main columns use `1.7fr 1fr` with a 24px gap. NFT rows have two columns. Stats use `1.25fr 1fr 1fr`. |
| At/below 64rem | Main columns use `1.45fr 1fr`, gap 20px, panel padding 22px. Collection artwork stacks; NFT rows become one column. |
| At/below 49rem | Main panels become one column; outer gutters become 20px. The helper header link and read-only caption disappear. The collection illustration and NFT rows can use two columns again while space permits. Page title becomes 36px. |
| At/below 36rem | Outer gutters become 16px. Wordmark subtitle is hidden. Address and submit button stack. SQK takes a full summary row; the other two summaries share the next row. NFT rows and the collection illustration stack; notes and footer stack. Panel padding is 20px. |

Header utilities wrap instead of forcing horizontal overflow. Flex/grid children use shrinkable minima and long data uses `overflow-wrap`; input heights are minima rather than fixed caps. Native details elements expose hidden criteria, data provenance, exact amounts and the optional JSON import. Collection pages have an explicit load button and a loaded-item count.

The actual export was checked at 320, 390, 600, 784, 1024 and 1440px, plus a 200% root text-size and an RTL layout smoke check. Native browser zoom and physical-device behavior were not tested. At 390 × 844, the product title, labelled wallet field and lookup action are visible before scrolling.

## Elevation & depth

Surfaces are flat. White panels have a single structural 1px border; the tinted SQK summary uses a tonal background without a border. No panel combines a shadow and border, and there are no shadow tokens. Row separators express the collection/badge list structure. No gradients, floating widgets or blurred layers are used.

## Shapes

`--radius-control` is `.75rem` (12px) for fields and primary/secondary buttons; `--radius-panel` is `1.25rem` (20px) for major surfaces. Mobile summary surfaces use 16px. Selected filters use 9px, NFT icon tiles use 10px, and badge tiles use 12px. The brand mark uses a rounded square, while the generic profile avatar is circular. Text containers are not clipped to fit a decorative shape.

## Components

- **`Stat` in `src/App.tsx`:** receives a title, icon, value, description and optional `accent`/children. Unknown values use a dash or “Unavailable”, never an invented zero. The SQK variant exposes full precision in a native details disclosure when needed.
- **Wallet form in `App`:** one filled action, a real label, inline validation, native disabled state while loading, and a stable polite status region. Enter submits; errors focus the input. Retry delay and network failures remain visible. Example lookup, refresh and copy are secondary actions.
- **Collection pattern in `App`:** individual token rows expose ID, custody and level. Native pressed-state buttons filter loaded rows. Pagination validates a consistent safe block and does not silently combine snapshots.
- **`CloutPanel` in `src/App.tsx`:** separately accepts a member code/link. It exposes loading, unavailable, invalid, empty and populated states; filters show earned/all catalogue clout badges. Native details controls reveal badge criteria. It never claims a verified wallet/profile association.
- **Profile import pattern:** a native disclosure with a labelled textarea and secondary submit. On a network/CORS failure it opens automatically with the public JSON link. The parser validates the profile schema, optional matching code, and a 200,000-character size bound. Invalid input receives focus; imported results show their timestamp and local-copy disclaimer.
- **`Icon` in `src/components/Icon.tsx`:** one SVG per icon, 1.7px rounded stroke, `currentColor`, decorative `aria-hidden`. Use meaningful visible button labels or an explicit accessible name for icon-only actions.
- **`Squeek` in `src/components/Squeek.tsx`:** `compact` supplies the mark; the full variant is decorative artwork. NFT tiles use a separate decorative dot symbol and do not pretend to be API NFT artwork.

Every interactive surface has a `:focus-visible` outline. Buttons have 44px minima; the main wallet action is at least 56px, profile controls 48px, and the secondary exact-amount disclosure 32px. Hover rules are limited to hover-capable devices. Under `prefers-reduced-motion: no-preference`, interactive colors/transforms transition for 150ms with `cubic-bezier(.2,0,0,1)`, button press scales to `.96`, and an active lookup spinner rotates. Reduced motion removes those effects while retaining a text label. There is no page-load entrance animation.

## Do’s and don’ts

Use the existing shared container, semantic tokens, six-size scale and native form/details patterns for another surface. Keep one filled lookup action, and give additional actions a neutral border or text treatment. Place the user’s requested task before explanatory copy.

Keep account-derived data and a supplied Genesis profile visibly separate. Keep unknown, empty, zero, loading and imported states distinct. Do not add a wallet connector or transaction flow to this address viewer, label imported badges as live, truncate a critical address, add a second font, or insert sample balances into the production bundle.

The six-domain findings, actual commands, screenshots and unperformed checks belong to `artifacts/validation.md`; they are not silently upgraded to verified design guarantees here.
