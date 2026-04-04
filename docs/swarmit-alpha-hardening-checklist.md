# Swarmit Alpha Hardening Checklist

Date: 2026-04-04
Status: Working checklist

## Purpose

This checklist is for bringing Swarmit from a technically impressive prototype to a practically coherent first alpha.

It is intentionally product-facing as well as technical. The main question is not just "does it work?" but also:

- what do new users see by default?
- what are the spam and abuse surfaces?
- what scales badly if usage grows?
- what needs to feel complete enough for real outsiders to try?

## Core Principle

For alpha, the protocol may remain open and permissionless while the default app experience becomes more curated and intentional.

That means:

- on-chain registration can stay open
- default app surfaces should not blindly feature everything declared on-chain
- user-customized discovery should be supported explicitly

## 1. Contracts And Protocol Boundaries

### Board registration

- [ ] Decide whether board registration remains free for alpha
- [ ] Decide whether board registration remains permissionless for alpha
- [ ] Document clearly that board registration is namespace creation, not default app featuring
- [ ] Confirm whether board governance transfer is needed before alpha
- [ ] Confirm whether board metadata update flow is complete enough for real usage

### Curator declaration

- [ ] Decide whether curator declaration remains free for alpha
- [ ] Decide whether curator declaration remains permissionless for alpha
- [ ] Document clearly that curator declaration is discovery/addressability, not default app endorsement
- [ ] Decide whether an explicit "inactive curator" convention is needed before alpha

### Submission and votes

- [ ] Confirm `SwarmitRegistryV2` is the alpha contract target
- [ ] Confirm contract addresses and deploy blocks are finalized in SPA + curator config
- [ ] Confirm rollout/rebuild guidance is documented for fresh curator DBs
- [ ] Confirm reply voting semantics are documented clearly enough for clients/curators

## 2. Default Discovery UX

### Boards

- [ ] Stop using "all registered boards on-chain" as the default board bar
- [ ] Define the default board bar as:
  - boards curated by the selected/default curator
  - plus optional user-pinned boards
- [ ] Add a product decision for whether there is also an app-endorsed starter list
- [ ] Decide whether "browse all boards" exists in alpha, or is deferred
- [ ] Add "add board by slug" flow

### Curators

- [ ] Stop using "all declared curators on-chain" as the default curated picker surface
- [ ] Define the default curator list as:
  - app-endorsed curators
  - board-endorsed/default curators
  - optionally user-added curators
- [ ] Add "add curator by address" flow
- [ ] Decide whether a separate advanced "all curators" screen exists in alpha or later

### View coherence

- [ ] Ensure the visible board list and the visible feed correspond conceptually
- [ ] Ensure default feed/view indicators are truthful in the UI
- [ ] Ensure `hot` as default is reflected consistently in both data loading and active tab styling

## 3. Scaling And Performance

### Chain discovery

- [ ] Remove alpha-critical dependence on replaying all `BoardRegistered` logs in the main UI
- [ ] Remove alpha-critical dependence on replaying all `CuratorDeclared` logs in the main UI
- [ ] Keep direct board lookup by slug viable
- [ ] Keep direct curator lookup by address viable

### Feed/index scaling

- [ ] Accept current board/global index scale limits for alpha, but document them
- [ ] Keep the pagination WIP alive as the next major protocol concern
- [ ] Confirm current curator poll/publish cadence is acceptable for the expected alpha load

### Curator storage

- [ ] Confirm SQLite rollout is the official alpha storage backend
- [ ] Confirm rebuild-from-chain is the supported recovery model
- [ ] Decide whether any curator observability/admin commands are needed before alpha

## 4. Abuse, Safety, And Liability

### Boards

- [ ] Decide how NSFW / abusive / junk boards are handled in default surfaces
- [ ] Decide whether the default app excludes them by curator policy, app policy, or both
- [ ] Decide whether user-added boards can bypass default curation intentionally

### Curators

- [ ] Decide how malicious/spam curators are excluded from default surfaces
- [ ] Decide whether app-endorsed curator list is hardcoded, Swarm-hosted, or otherwise managed

### Content

- [ ] Confirm the relationship between board governance, curators, and moderation is understandable in the UI
- [ ] Confirm abuse-reporting / safety messaging expectations for alpha

## 5. Product Completeness

### First-run experience

- [ ] Decide what a totally fresh user sees on first launch
- [ ] Decide which curator is the default curator
- [ ] Decide which boards are visible before the user customizes anything
- [ ] Decide whether "no boards found" is ever a realistic first-run state

### User control

- [ ] Support user-pinned boards
- [ ] Support user-selected curator per board
- [ ] Support user-selected global curator
- [ ] Support resetting to defaults

### Explainability

- [ ] Explain the difference between:
  - on-chain registration
  - curator coverage
  - app endorsement
  - user customization
- [ ] Ensure users can understand why a board is visible in the top bar
- [ ] Ensure users can understand why a curator appears in the picker

## 6. Release Readiness

- [ ] Fresh end-to-end test on clean chain + clean curator DB + clean SPA config
- [ ] Confirm builder docs and rollout notes are current
- [ ] Confirm no stale V1/V2 contract assumptions remain in SPA or curator
- [ ] Confirm the default discovery model is intentional, not accidental
- [ ] Confirm the alpha story can be explained in one paragraph to an outsider

## Recommended Alpha Decisions

If we want the simplest coherent alpha:

- keep board registration permissionless and free
- keep curator declaration permissionless and free
- do not feature all boards by default
- do not feature all curators by default
- define the top board bar from the selected/default curator's board coverage
- let users add boards by slug
- let users add curators by address
- keep "all registered boards" and "all declared curators" out of the main UX

## Deferred Topics

These matter, but do not need to be solved before alpha:

- board registration economics
- DAO-governed featured board list
- DAO-governed featured curator list
- global searchable board directory
- curator unregister semantics
- large-scale pagination and feed segmentation
