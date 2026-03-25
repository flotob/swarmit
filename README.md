# Swarmit

A decentralized Reddit-like message board that runs inside [Freedom Browser](https://github.com/solardev-xyz/freedom-browser), hosted on Swarm.

Users publish immutable content to Swarm, announce submissions on Gnosis Chain, and read curator-backed board and thread views via Swarm feeds.

## How it works

- **Authors** write posts and replies → published immutably to Swarm, announced on Gnosis Chain
- **Curators** watch the chain, build ordered indexes, publish them as Swarm feed-backed views
- **Readers** browse boards and threads through curator-selected views — no wallet needed
- **Users choose their curator** — competing curators offer different moderation and ranking

No centralized server. No single point of control. Content is immutable. Curation is competitive.

## Running locally

### Prerequisites

- [Freedom Browser](https://github.com/solardev-xyz/freedom-browser) (provides Swarm + wallet access)
- Node.js >= 18 (for build script and vendoring)

### Build

```bash
npm install
npm run vendor    # Copy ethers.js to vendor/
npm run build     # Build dist/ folder for Swarm upload
```

### Deploy to Swarm

1. Open Freedom Browser
2. Use the folder upload feature to publish the `dist/` directory
3. Open the resulting `bzz://` URL

### Test locally

Navigate to:
- `#/` — home page (lists registered boards)
- `#/r/<slug>` — board view (curator-backed post listing)
- `#/r/<slug>/submit` — compose a post
- `#/r/<slug>/comments/<rootSubmissionId>` — thread view (must be the root post's submission ID)
- `#/curators` — curator picker
- `#/u/<address>` — user profile
- `#/create-board` — register a new board
- `#/debug/swarm-read` — test Swarm reads
- `#/debug/create-fixtures` — publish test protocol objects

## What needs to be running

- **Freedom Browser** — provides `window.swarm` (Swarm publish/feeds) and `window.ethereum` (wallet). Browsing works without connecting, but publishing requires both.
- **SwarmitRegistry contract** — deployed on Gnosis Chain for board discovery and submission announcements. Already deployed at `0x34b27b9978E05B6EfD8AFEcc133C3b1fC5431613`.
- **Curator service** — indexes submissions and publishes board/thread views. Without a running curator, boards will show "No curator has data for this board." See [Swarmit Curator](https://github.com/flotob/swarmit-curator).

## Architecture

Pure static SPA — no build tools, no bundler, no framework. Vanilla JS with ES modules.

```
swarmit/
  index.html              # App shell
  css/                    # Theme, layout, components
  js/
    app.js                # Boot, router, provider detection
    router.js             # Hash-based client-side routing
    config.js             # Contract address, chain ID, protocol constants
    state.js              # Minimal pub/sub state store
    lib/                  # Provider wrappers (swarm, ethereum, rpc)
    protocol/             # Object builders, validators, reference utils
    chain/                # ABI, event reads, transaction helpers
    swarm/                # Immutable fetch, feed resolution
    services/             # Publish pipeline, curator selection
    views/                # All page views (lazy-loaded)
    components/           # Shared UI components
  vendor/                 # Vendored ethers.js (CSP requires local JS)
  contracts/              # SwarmitRegistry Solidity contract + tests
  fixtures/               # Test fixture documentation
  docs/                   # Protocol specs
```

### Key design decisions

- **No framework** — views are `async function render(container, params)`, DOM built with `createElement`
- **Separate read-only RPC from wallet writes** — `lib/rpc.js` uses `fetch()` for chain reads (no wallet needed to browse), `lib/ethereum.js` only for signing transactions
- **Provider wrappers** are the only code that touches `window.swarm` / `window.ethereum`
- **Swarm reads work without the provider** — Freedom Browser resolves `/bzz/` URLs at the browser level, so browsing works without connecting to the Swarm provider
- **Lazy-loaded views** — each view is dynamically imported only when its route is visited
- **Curator fallthrough** — if the preferred curator's data is unavailable, the app tries the next candidate instead of showing a blank page
- **Multi-step publish pipeline** with progress UI, partial-success handling, and honest status when chain announce is skipped or fails

### Protocol

The protocol is defined in the docs directory, starting with the [Whitepaper v1](docs/whitepaper-v1.pdf):

- `docs/swarm-message-board-v1-spec.md` — normative protocol spec
- `docs/swarm-message-board-v1-schemas.md` — object schemas
- `docs/swarm-message-board-v1-contract-spec.md` — on-chain contract surface

9 protocol object types: `board`, `post`, `reply`, `submission`, `userFeedIndex`, `boardIndex`, `threadIndex`, `globalIndex`, `curatorProfile`.

### Contract

SwarmitRegistry deployed on Gnosis Chain:
- **Address:** `0x34b27b9978E05B6EfD8AFEcc133C3b1fC5431613`
- **Chain ID:** 100 (Gnosis)

## Companion: Curator Service

The SPA reads curator-backed views but doesn't produce them. You need a running [Swarmit Curator](https://github.com/flotob/swarmit-curator) to index submissions and publish board/thread views.

## Smoke Test

1. `npm run build` and upload `dist/` to Swarm via Freedom Browser
2. Navigate to `#/debug/swarm-read` — paste any known `bzz://` ref, verify Swarm reads work
3. Navigate to `#/debug/create-fixtures` — publish test objects (connects wallet + Swarm)
4. Use the chain buttons to register the board and announce submissions
5. Navigate to `#/r/test` — board should show posts (requires a running curator)
6. Click a post — thread view with replies
7. Navigate to `#/r/test/submit` — publish a real post through the compose form
8. Wait for the curator to pick it up — the post should appear on the board within one poll cycle

## Implementation Notes

### Vendoring

CSP blocks CDN loads in Swarm-hosted pages, so all JS dependencies must be local. ethers.js v6 is vendored via `npm run vendor` into the `vendor/` directory. The `node_modules` and `package.json` are development infrastructure — only `dist/` is published to Swarm.

### Build output

`npm run build` copies `index.html`, `css/`, `js/`, and `vendor/` into `dist/`. Upload `dist/` to Swarm via Freedom Browser's folder upload.
