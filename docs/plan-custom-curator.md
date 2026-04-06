Good, I've read through the updated codebase. Here's what I see and what matters for custom curators.

## What changed (my quick take)

The refactoring landed clean:

- **swarmit-protocol** (v0.3.0): standalone library with builders, validators, reference helpers, chain ABI/encoders, optional Bee client. SPA and curator both consume it. SPA keeps thin shims in `src/protocol/` to avoid cascading import changes.
- **Curator profile as feed**: `resolveCuratorProfile()` in `feeds.js:53-77` with 30s TTL cache, 4 call sites swapped. `useCuratorProfiles` does periodic 30s refresh. The curator repo publishes to `CURATOR_PROFILE_FEED_NAME` ("curator-profile-v1") and calls `ensureDeclared()` once.
- **View caching**: available views + default view IDs persisted to localStorage so tabs render instantly on reload.

## Why custom curators are now almost free

The key insight: `resolveCuratorProfile(ref)` doesn't care where the ref came from. It takes any `bzz://` ref (feed manifest or immutable), fetches it, validates it as a curator profile, and returns the profile object. All downstream code (board resolution, global feed, view selection) operates on the resolved profile — not on the declaration source.

So the entire feature is:
1. Let the user paste a curator profile ref
2. Store it in localStorage
3. Merge it into the curator list that everything else already consumes

No protocol changes, no contract changes, no new feed resolution logic.

## The actual decisions to make

**1. Identifier for custom curators**

Every entry in the curator list has a `curator` field (currently an Ethereum address) used as:
- Dedup key in `useCuratorDeclarations`
- Preference key in `curatorPrefs` store
- Display fallback via `truncateAddress()`
- Match target in `buildCandidates` and `resolveCuratorBoardIndex`

For custom curators we don't have an address (and shouldn't require one). Options:

- **(a) Use the profileRef hex as the `curator` field.** Simple, unique, stable. `truncateAddress()` renders it as a hash snippet (`aef3...d821`) which is acceptable since `profileName()` resolves the actual name anyway. No collision with on-chain curators (different namespace). If the same curator is both on-chain and custom-added, they appear twice — minor paper cut, fixable later.
- **(b) Require the user to also paste the curator's Ethereum address.** Enables dedup with on-chain curators and shows a real address in the UI. But adds friction to the add flow for zero functional benefit.
- **(c) Extract the owner address from the Swarm feed metadata.** Would be ideal but requires an extra API call to the Bee node's feed endpoint, and the SPA talks to a gateway that may not expose that.

I'd go with **(a)** — the profileRef hex as identifier. The name from the profile is what the user actually sees.

**2. Where to merge custom curators into the data flow**

Current flow: `useCuratorDeclarations()` → TanStack query → chain events → deduped list.

Two clean options:

- **(a) New `useAllCurators()` composable** that wraps `useCuratorDeclarations()` and merges custom entries from a Pinia store. All consumers (`useBoard`, `useGlobalFeed`, `useThread`, `CuratorBar`, `CuratorPickerView`) switch from `useCuratorDeclarations()` to `useAllCurators()`. ~6 import swaps, zero logic change in consumers.
- **(b) Merge inside `useCuratorDeclarations()` itself** — read custom entries reactively and append. Fewer touch points but muddies the name (it's no longer just "declarations").

I lean **(a)** — cleaner separation, name stays honest.

**3. UI surfaces**

The CuratorBar dropdown currently only shows when `allCurators.length > 1`. With one on-chain curator, there's no dropdown → no way to add a custom one. So we need to always show the dropdown.

- **Dropdown**: always visible, add "Add custom curator..." at the bottom (after a separator). This is the primary entry point.
- **CuratorPickerView** (`/curators`): already shows on-chain curators with per-board selection. Extend with a section for custom curators (with remove button), plus an "Add" button.
- **Add flow**: I still lean **modal** (dialog) — the form is tiny (one input + preview + confirm). Keeps the user in context. But the existing `CuratorPickerView` is a natural home too if you'd rather keep everything page-based.

**4. Add flow details**

1. User clicks "Add custom curator..." in dropdown (or "Add" on curators page)
2. Dialog with one text input: "Curator profile feed URL" (placeholder: `bzz://...`)
3. On paste/blur: `resolveCuratorProfile(ref)` → validate → show preview card (name, description, board count, view feeds)
4. If invalid: inline error ("Not a valid curator profile", "Unreachable", etc.)
5. If already added: inline warning, prevent duplicate
6. Confirm → save to store → list updates reactively → dialog closes → optionally auto-select for current scope

**5. Storage shape**

```js
// useCustomCuratorsStore
customCurators: [
  { id: '<profileRef hex>', curatorProfileRef: 'bzz://...', addedAt: 1712419200000 }
]
```

Minimal. The name, boards, description all come from the live profile resolution — no need to snapshot them.

## What I'd build (file list)

| File | Change |
|---|---|
| `src/stores/customCurators.js` | New Pinia store, localStorage-backed |
| `src/composables/useAllCurators.js` | New composable: merge on-chain + custom |
| `src/components/AddCuratorDialog.vue` | New dialog: input + preview + confirm |
| `src/composables/useCurators.js` | Export stays, consumers switch to `useAllCurators` |
| `src/composables/useBoard.js` | Import swap: `useAllCurators` |
| `src/composables/useGlobalFeed.js` | Import swap: `useAllCurators` |
| `src/composables/useThread.js` | Import swap: `useAllCurators` |
| `src/composables/useSubmissionStatus.js` | Import swap: `useAllCurators` |
| `src/components/CuratorBar.vue` | Always show dropdown, add "Add custom" item |
| `src/views/CuratorPickerView.vue` | Custom curator section with remove + add |

Roughly ~200 LOC new, ~30 LOC changed across existing files.

---

What's your take? The main forks:
- **Identifier**: profileRef hex — ok?
- **Merge layer**: `useAllCurators()` wrapper — ok?
- **Add surface**: modal dialog triggered from dropdown + curators page — ok?