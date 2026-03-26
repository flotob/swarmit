# Swarmit SPA — Frontend Rewrite Plan

This is a **full frontend platform rewrite**, not a cosmetic UI rebuild. The existing vanilla JS proof-of-concept is replaced with a modern Vue 3 stack. The protocol layer, chain integration, and Swarm helpers are preserved; everything else is rewritten.

## Current State

The SPA is functionally complete but looks like a proof of concept:
- Vanilla JS with raw `document.createElement` everywhere — unmaintainable
- Inline styles, no consistent design system
- No reply UI (pipeline exists but no form in thread view)
- Create Board page exists but isn't linked from navigation
- No image/media support
- Markdown renderer is minimal and hand-rolled
- No loading states, empty states, or error states with real design
- No mobile responsiveness
- No data caching — every navigation re-fetches everything from Swarm

## Decision: Full Rewrite with Modern Stack

The proof-of-concept phase is over. We're adding **Vite as a build step** and migrating to a proper framework. The build output is still static files uploaded to Swarm — no server at runtime.

## Technology Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Build** | Vite | Fast dev server, HMR, produces static output for Swarm |
| **Framework** | Vue 3 (SFCs, Composition API) | Full component model, excellent tooling, large ecosystem |
| **Router** | Vue Router (hash mode) | `createWebHashHistory()` — works on Swarm without server rewrites |
| **State** | Pinia | Official Vue state management, simple API |
| **Data fetching** | TanStack Query (Vue) | SWR caching, background refetch, persistence to IndexedDB |
| **Persistence** | IndexedDB via idb-keyval | Async, non-blocking, survives sessions. Cache API for large binary (images) |
| **Markdown render** | marked + DOMPurify | Battle-tested rendering + XSS sanitization |
| **Markdown editor** | Tiptap (Vue 3) | Headless rich text editor, markdown I/O, extensible |
| **CSS** | Tailwind CSS | Utility-first, dark mode, responsive — build step handles purging |
| **Icons** | Heroicons or similar | Tailwind-compatible icon set |

## Design Principles

- **No fake affordances.** Don't show vote buttons, subscriber counts, sort options, or search bars that don't work. Only render UI for features that exist. Clearly label anything that's coming later.
- **Curator trust boundary.** Content from curator-backed feeds is curator-authored. Local/pending data (e.g., a reply just submitted) must be visually distinct — shown as "pending, not yet curated" rather than mixed into the curator's tree.
- **Show cached, revalidate in background.** On every navigation, render from cache immediately. Check for updates in the background. Update the view when fresh data arrives. The user should never see "Loading..." on a page they've visited before.
- **Loading, empty, and error states are part of every view**, not a late polish phase. Each view must handle all three from the start.

## Markdown Contract

The richer editor stack must not broaden protocol semantics:

- **The canonical stored body is always `{ kind: "markdown", text: "..." }`** — plain markdown text, same as v1 spec
- **No raw HTML round-tripping.** Tiptap converts to/from markdown. The stored text field never contains HTML.
- **The allowed rendering subset is intentionally limited.** `marked` renders CommonMark, but `DOMPurify` strips anything dangerous. The renderer does NOT allow arbitrary HTML passthrough.
- **`bzz://` image URLs in markdown** (`![alt](bzz://ref)`) are a rendering convenience. The canonical image data lives in the `attachments` array on the post/reply object.

## Data Caching Architecture

Our data has two distinct caching profiles:

### Immutable content (posts, replies, submissions, board metadata)
- Keyed by Swarm `bzz://` reference
- **Cache forever** — content-addressed data never changes
- Store in IndexedDB via idb-keyval
- TanStack Query with `staleTime: Infinity`

### Mutable feeds (boardIndex, threadIndex, globalIndex, curatorProfile)
- Keyed by feed manifest reference + curator address
- **Stale-while-revalidate** — show cached version immediately, refetch in background
- Short staleTime (e.g., 30 seconds), background refetch on window focus
- TanStack Query with `persistQueryClient` backed by IndexedDB

### Chain data (board registrations, curator declarations)
- **Cache per session**, refetch on app start
- Moderate staleTime (e.g., 5 minutes)

## Migration Strategy

### Migrate mostly intact (pure logic, no DOM or app-state dependencies)
- `protocol/references.js`, `protocol/objects.js` — pure functions
- `chain/contract.js`, `chain/events.js`, `chain/transactions.js` — ABI, queries, tx builders
- `swarm/fetch.js`, `swarm/feeds.js` — object fetching, feed resolution (cache layer replaced by TanStack Query)
- `lib/rpc.js` — read-only RPC client
- `lib/format.js` — formatting helpers

### Refactor behind Vue composables/adapters
- `services/publish-pipeline.js` — mixes app state, provider connection, feed mutation, and UI step callbacks. Refactor into a composable (`usePublish`) using Pinia stores for state and emitting progress events.
- `services/curator.js` — depends on `state.js` for curator preferences. Wrap in a `useCurators` composable backed by Pinia.
- `lib/swarm.js` — wraps `window.swarm`, manages connection state. Refactor into a Pinia store (`stores/providers.js`).
- `lib/ethereum.js` — wraps `window.ethereum`, manages wallet state. Same — Pinia store.
- `state.js` — replaced entirely by Pinia stores.

Views and components are rewritten as Vue SFCs.

```
src/
  main.js                    # Vue app creation, router, plugins
  App.vue                    # Root layout (nav, main, footer)
  router/
    index.js                 # Vue Router with hash mode
  stores/
    auth.js                  # Pinia: wallet connection, user address, user feed
    providers.js             # Pinia: Swarm/wallet provider detection
  composables/
    useBoard.js              # TanStack Query: board metadata + boardIndex
    useThread.js             # TanStack Query: threadIndex + submissions
    useCurators.js           # TanStack Query: curator declarations + profiles
    usePublish.js            # Publish pipeline (post, reply, board)
  views/
    HomeView.vue             # Board listing
    BoardView.vue            # Board page with post cards
    ThreadView.vue           # Thread with reply tree
    ComposePostView.vue      # Create post with Tiptap editor
    CreateBoardView.vue      # Register a new board
    CuratorPickerView.vue    # Choose curator per board
    UserProfileView.vue      # User submission history
  components/
    AppHeader.vue            # Top navigation bar
    PostCard.vue             # Post summary in listings
    ReplyNode.vue            # Single reply in thread tree
    ReplyForm.vue            # Inline reply form
    StatusBar.vue            # Multi-step publish progress
    CuratorBanner.vue        # "Showing view from X — Change" banner
    PendingReply.vue         # Locally submitted reply (not yet curated)
    MarkdownRenderer.vue     # marked + DOMPurify wrapper
    MarkdownEditor.vue       # Tiptap-based editor with toolbar
    ImageUpload.vue          # Image upload via window.swarm
    ConnectButton.vue        # Wallet/Swarm connect button
  protocol/                  # Migrated as-is from current js/protocol/
    references.js
    objects.js
  chain/                     # Migrated as-is
    contract.js
    events.js
    transactions.js
  swarm/                     # Migrated as-is
    fetch.js
    feeds.js
  services/                  # Migrated as-is
    publish-pipeline.js
    curator.js
  lib/                       # Migrated as-is
    swarm.js
    ethereum.js
    rpc.js
    format.js
```

## Work Packages

### UP1: Vite + Vue Scaffold + Compatibility Spike

Set up the new build pipeline and prove it works end-to-end from Swarm before building any real UI.

**Phase 1: Scaffold**
- Vite + Vue 3 project setup
- Vue Router with hash mode, matching existing route table
- Pinia store setup (auth + providers)
- Tailwind CSS with dark mode config
- Migrate portable protocol/chain/swarm modules into `src/`
- Basic `App.vue` shell with router-view
- `npm run build` produces `dist/` for Swarm upload

**Phase 2: Compatibility spike (acceptance gate)**
The bundled app must pass these tests from a Swarm-hosted URL in Freedom Browser before proceeding:
- [ ] App shell loads and Vue hydrates correctly
- [ ] `window.swarm` and `window.ethereum` detection works
- [ ] Board read: fetch chain events + curator feed + render a board (minimal, can be ugly)
- [ ] Thread read: resolve threadIndexFeed + render submissions
- [ ] Compose post: full publish pipeline (Swarm + chain announce) works
- [ ] TanStack Query cache persists to IndexedDB and loads on page revisit
- [ ] No CSP violations, no blocked scripts, no CORS errors

If any of these fail, fix before proceeding. This prevents building 13 more UPs on a broken foundation.

### UP2: Layout + Navigation

- `AppHeader.vue`: logo, board links, Create Board, wallet connect/status
- Responsive layout with Tailwind (sidebar on desktop, collapsible on mobile)
- `ConnectButton.vue`: wallet + Swarm connection with status display
- Provider detection on boot (same as current `detectProviders`)
- Route transitions

**Smoke test:** Header renders, wallet connect works, routes resolve.

### UP3: Data Layer + Caching

- TanStack Query composables for all data fetching:
  - `useBoard(slug)` — board metadata from chain + boardIndex from curator feed
  - `useThread(slug, rootSubId)` — threadIndex + all submissions/content
  - `useCurators()` — curator declarations from chain
  - `useBoardList()` — board registrations from chain
- Curator selection logic (existing `services/curator.js`) wrapped in composables
- IndexedDB persistence via idb-keyval
- Immutable content: `staleTime: Infinity`
- Mutable feeds: `staleTime: 30_000`, refetch on window focus
- Cache warming: render from cache on navigation, update when fresh data arrives

**Smoke test:** Navigate to board, see cached data on second visit without loading flash.

### UP4: Home Page

- `HomeView.vue`: board cards from `useBoardList()`
- Board card: title, description, click to navigate
- Create Board call-to-action link
- Loading skeleton, empty state, error state with retry

**Smoke test:** Home loads boards, clicking navigates to board view.

### UP5: Board View + Post Cards

- `BoardView.vue`: uses `useBoard(slug)` composable
- `PostCard.vue`: title, author, time ago, comment count, body preview
- Curator banner when auto-selected or fallthrough
- Submit Post button linking to compose
- Loading skeleton, empty state ("No posts yet"), error state

**Smoke test:** Board resolves curator, shows posts. Cards link to threads.

### UP6: Thread View + Reply Tree

- `ThreadView.vue`: uses `useThread(slug, rootSubId)` composable
- Root post: full title, author, time, rendered markdown body
- `ReplyNode.vue`: depth-indented, collapsible branches
- `CuratorBanner.vue` when curator was auto-selected
- Back-to-board link
- Loading/empty/error states

**Smoke test:** Thread loads from curator's threadIndexFeed, replies show at correct depth.

### UP7: Markdown Rendering

- `MarkdownRenderer.vue`: renders markdown via `marked`, sanitizes with `DOMPurify`
- Custom `marked` renderer for `bzz://` image URLs → `<img src="/bzz/ref/">`
- Support: headings, bold, italic, links, code, code blocks, lists, blockquotes, images
- Integrated into `PostCard` (preview), `ThreadView` (full body), `ReplyNode` (body)

**Smoke test:** Posts with markdown formatting render correctly and safely.

### UP8: Compose Post with Rich Editor

- `ComposePostView.vue`: title input + Tiptap editor
- `MarkdownEditor.vue`: Tiptap configured for markdown I/O
- Toolbar: bold, italic, heading, link, code, blockquote, image upload
- Board context from route params
- Publish pipeline with `StatusBar.vue` progress
- Partial success messaging (Swarm published but chain skipped/failed)

**Smoke test:** Compose a post with formatting, publish succeeds, post appears on board after curator picks it up.

### UP9: Inline Reply

- `ReplyForm.vue`: appears inline below any comment when "Reply" is clicked
- Uses `publishReply()` from publish pipeline
- `parentSubmissionId` from the clicked comment, `rootSubmissionId` from thread root
- `StatusBar.vue` for progress
- `PendingReply.vue`: after success, show the reply as a visually distinct "pending — not yet curated" block below the parent. Does NOT insert into the curator's reply tree.
- Pending replies stored in Pinia, cleared when the curator's next threadIndex includes them

**Smoke test:** Reply to a post, see pending reply, curator picks it up and it appears in the real tree.

### UP10: Image/Media Support

Images follow a protocol-compliant model:

1. User picks/pastes/drags an image in the Tiptap editor
2. Image is published to Swarm via `window.swarm.publishData({ data, contentType })`
3. An `AttachmentDescriptor` is added to the post/reply object per protocol spec:
   ```json
   { "reference": "bzz://<ref>", "contentType": "image/png", "sizeBytes": 12345, "kind": "image" }
   ```
4. The `bzz://` reference is inserted into the markdown body as `![alt](bzz://<ref>)` for rendering convenience
5. The canonical source of truth is the `attachments` array — the markdown image syntax is a rendering aid

- `ImageUpload.vue`: handles file picker, paste, drag-and-drop, upload progress
- Custom `marked` extension: resolve `bzz://` URLs to `/bzz/` paths for `<img>` tags
- Size limits (e.g., 5MB per image) and format validation (png, jpg, gif, webp)
- Images work in both posts and replies

**Smoke test:** Upload an image in compose, see it in the preview, publish, see it rendered in the thread.

### UP11: Create Board

- `CreateBoardView.vue`: slug input with live preview, title, description
- Slug validation (lowercase alphanumeric + hyphens, max 32 chars)
- Publish to Swarm + register on-chain with progress
- Redirect to new board on success
- Linked from navigation header

**Smoke test:** Create a board, see it on the home page, navigate to it.

### UP12: Curator Picker

- `CuratorPickerView.vue`: card per curator with name, description, curated boards
- Per-board selection buttons with visual feedback
- Current selection shown, persisted to localStorage
- Accessible from curator banner on board/thread views

**Smoke test:** Select a curator, navigate to board, see content from chosen curator.

### UP13: User Profile

- `UserProfileView.vue`: address, submission history with proper post cards
- Uses user's feed index to show submissions
- Reply entries resolve `rootSubmissionId` before linking to thread
- Author addresses clickable throughout the app

**Smoke test:** Click author on a post, see their profile with submission history.

### UP14: Mobile Polish

- Responsive Tailwind breakpoints (sm, md, lg)
- Collapsible sidebar
- Touch-friendly forms and reply UI
- Readable typography on small screens

### UP15: Submission Lifecycle & Activity Feed

This is a unique UX concept with no equivalent in traditional social media.

In Swarmit, posting is not instant — it follows a lifecycle analogous to blockchain transaction settlement:

1. **Publishing** — content objects created on Swarm
2. **Announced** — transaction confirmed on Gnosis Chain
3. **In the mempool** — on-chain but no curator has picked it up yet
4. **Curated** — appears in one or more curator feeds (the "confirmation")
5. **Settled** — stable in curator views (but could be removed — "reorged")

The UX should make this lifecycle visible and useful, not hide it.

**Submission tracker store** (Pinia, persisted to localStorage):
- Tracks local submissions from the moment the user publishes
- Each entry has: `submissionRef`, `boardSlug`, `kind`, `title/preview`, `createdAt`, `lifecycle` state
- Lifecycle state updated by polling curators

**Curator polling composable** (`useSubmissionStatus`):
- For each pending submission, checks known curators' boardIndex feeds
- Reports which curators have picked up each submission
- Cheap: reuses TanStack Query cached boardIndexes when possible
- Polling interval: same as curator's poll interval (~30s)

**Activity panel** (sidebar or expandable drawer):
- Top section: recent submissions with live lifecycle status
  - "Publishing..." → "Announced on-chain" → "Waiting for curators..." → "Picked up by Curator X" → "In 2 curator feeds"
- Bottom section: full post history from `userFeedIndex`
- Most recent first, chronological order
- Each entry: board link, title/preview, time, curator pickup count
- Clicking an entry navigates to the thread

**Inline status integration:**
- In board/thread views, the current "pending curator indexing" placeholder is replaced with real lifecycle status
- Posts by the current user that aren't yet curated show their actual state
- Once a curator picks it up and the boardIndex refreshes, the pending indicator is removed automatically

**What this connects to:**
- The existing `userFeedIndex` is the user's on-chain post history — this panel renders it
- The `SubmissionAnnounced` events are the "mempool" — we can query for the user's pending submissions
- Curator `boardIndex` entries are the "confirmations" — we check if the submission appears
- `pendingReplies` in ThreadView is an early version of this concept — it gets subsumed by the real tracker

**Smoke test:**
1. Submit a post
2. See it appear in the activity panel as "Announced on-chain"
3. Wait for the curator to pick it up (~30s)
4. See the status change to "Picked up by Chronological Curator"
5. Navigate to the board — post appears in the curated view
6. The pending indicator in the activity panel is now "settled"

## Implementation Order

```
UP1  Vite + Vue Scaffold ← foundation
 ↓
UP2  Layout + Navigation
UP3  Data Layer + Caching ← can parallel with UP2
 ↓
UP4  Home Page
UP5  Board View + Post Cards
 ↓
UP6  Thread View + Reply Tree
UP7  Markdown Rendering ← needed by UP6
 ↓
UP8  Compose Post with Editor
UP9  Inline Reply ← first new functionality
UP10 Image/Media ← biggest new feature
 ↓
UP11 Create Board
UP12 Curator Picker    (parallel)
UP13 User Profile
 ↓
UP15 Submission Lifecycle & Activity Feed ← unique UX concept
 ↓
UP14 Mobile Polish
```

**Critical path:** UP1 → UP2+UP3 → UP5 → UP6+UP7 → UP8+UP9

## Testing Strategy

### Framework: Vitest + Vue Test Utils

Vitest comes free with Vite — same config, same module resolution. Vue Test Utils for component mounting. No additional setup beyond `npm install -D vitest @vue/test-utils`.

### What to test automatically

| Layer | Tool | Examples |
|-------|------|---------|
| Protocol modules | Vitest (unit) | references.js, objects.js — pure function tests |
| Composables | Vitest (unit) | useBoard, useThread, usePublish — mocked Swarm/chain |
| Components | Vue Test Utils | ReplyForm, ComposePost, ImageUpload — interaction tests |
| Stores | Vitest (unit) | Pinia stores — state transitions, persistence |

### What stays manual

- Freedom Browser integration (provider detection, Swarm publish, wallet connect)
- End-to-end from Swarm (CSP, routing, cache persistence)
- Visual regression (layout, responsiveness)

### TDD approach

Tests are written alongside each UP, not as a separate phase:
- **UP1:** test setup, migrate protocol module tests from curator repo
- **UP3:** composable tests are the highest-value target — data fetching + caching logic
- **UP8/UP9:** interaction tests for compose + reply forms
- Every UP adds tests for the code it introduces

### Test script

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

## Status (as of 2026-03-26)

### Completed
- **UP1**: Vite + Vue scaffold + compatibility spike (board read from Swarm confirmed)
- **UP2**: Layout + navigation (AppHeader, wallet connect, Swarm detection)
- **UP3**: Data layer (all composables: useBoard, useThread, useCurators, usePublish, useSwarm, useWallet, useBoardList)
- **UP4**: Home page (board cards from chain, cached)
- **UP5**: Board view + PostCard (bulk fetch, curator fallthrough, banner)
- **UP6**: Thread view + ReplyNode (depth indentation, curator fallthrough)
- **UP7**: Markdown rendering (marked + DOMPurify, bzz:// image URLs, scoped Marked instance)
- **UP8**: Compose post (usePublish pipeline, StatusBar progress, partial success)
- **UP9**: Inline reply (ReplyForm in thread, pending reply indicator, submissions store integration)
- **UP10**: Image upload for posts (textarea + image button, Swarm upload, attachment descriptors, AttachmentGallery fallback). Tiptap editor deferred — current approach is textarea + image button. Posts only per v1 spec; reply attachments would need a spec change.
- **UP11**: Create board (slug validation, publish + register, redirect)
- **UP12**: Curator picker (profile cards, per-board selection, persisted)
- **UP13**: User profile (feed resolution, submission history, reply navigation)
- **UP15**: Submission lifecycle & activity feed (Pinia store, curator polling, ActivityPanel sidebar with auto-show, SubmissionDetailView, inline status in thread/board views)

### Also completed (not in original plan)
- Read-side protocol validation at every Swarm trust boundary
- Wallet chain check (boot + chainChanged listener)
- IndexedDB query cache persistence (idb-keyval + TanStack Query persister)
- 56 automated tests (Vitest): protocol objects, references, image upload validation
- Curator service bugs fixed (profile publish loop, boardIndex ordering, bee-js v11 API)
- Activity sidebar with mobile bottom drawer (toggle, auto-show on publish)
- `bzzToGatewayUrl` utility in references.js for consistent bzz:// rendering

### Remaining
- **UP14**: Mobile polish — responsive Tailwind breakpoints, touch-friendly forms
- **Sidebar layout fix** — desktop sidebar width not constrained correctly, needs investigation in Freedom Browser with DevTools
- **Tiptap editor** — rich text editing for compose/reply, deferred from UP10

### Additional work identified during development
- Compose post UX: multi-step approval flow in Freedom Browser is clunky (needs browser-side permission trust model, not SPA fix)
- Curator service: consider lowering CONFIRMATIONS for faster pickup during development
- Test coverage: composable tests and wallet boot logic tests still needed
- Retry chain announcement: button in SubmissionDetailView for posts published to Swarm but not announced on-chain
- Migrate state.js to Pinia: old curator preference storage still uses vanilla state.js shim

## Regression Smoke Tests

After each UP, verify all of these still work:

- [ ] Home loads registered boards from chain
- [ ] Board view resolves curator-backed boardIndex and renders posts
- [ ] Thread view resolves threadIndexFeed and renders reply tree
- [ ] Compose post publishes to Swarm and announces on chain
- [ ] Create board publishes metadata and registers on chain
- [ ] Curator picker persists selection and affects board/thread rendering
- [ ] User profile resolves feed and shows submission history
- [ ] Cached pages render instantly on second visit
- [ ] Wallet connect/disconnect works correctly
- [ ] App loads and functions in Freedom Browser from a Swarm-hosted URL
