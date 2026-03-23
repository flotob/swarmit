# Swarmit MVP Plan

Date: 2026-03-23
Status: Draft

This document translates [swarm-message-board-v1-spec.md](/Users/florian/Git/freedom-dev/freedom-browser/docs/swarm-message-board-v1-spec.md) into a concrete first product scope for Swarmit.

The goal of the MVP is not to solve every protocol problem. It is to prove the full loop:

- publish immutable content to Swarm
- announce submissions on Gnosis
- read curator-backed board and thread views
- let users switch curators

## 1. MVP Goals

Swarmit MVP should prove that:

1. a Swarm-hosted app can publish posts and replies through Freedom Browser
2. immutable user content plus feed-backed curator views is a workable reading and writing model
3. Gnosis can serve as the public coordination layer for board and submission discovery
4. curator competition is understandable in a real client UX

## 2. MVP Non-Goals

The MVP does not need:

- on-chain moderation
- voting or karma
- rich media editing
- moderation dashboards
- DAO governance flows
- mobile polish
- advanced spam resistance
- decentralized search
- profile customization beyond basics

## 3. MVP User Roles

### 3.1 Reader

Can:

- browse boards
- read threads
- switch curators

### 3.2 Author

Can:

- connect wallet
- publish posts
- publish replies
- see authored activity via their user feed

### 3.3 Curator Operator

Can:

- run an indexer
- publish board, thread, and global indexes
- declare a curator profile

### 3.4 Board Creator

Can:

- register a board
- publish board metadata
- optionally endorse curators and set a default curator

## 4. Required MVP Features

## 4.1 App Shell

The app MUST:

- be publishable as a Swarm-hosted SPA
- resolve from ENS to a stable application shell
- read data from both Gnosis and Swarm

## 4.2 Board Browsing

The app MUST:

- list available boards from chain and/or a curated global view
- open a board page
- resolve board metadata
- resolve a chosen curator's board feed
- render posts from the resulting `boardIndex`

## 4.3 Thread Reading

The app MUST:

- open a thread route by root submission id
- resolve a chosen curator's `threadIndex`
- fetch and render the reply tree

## 4.4 Posting

The app MUST:

- connect to `window.swarm`
- connect to `window.ethereum`
- publish immutable `post` + `submission` objects
- update the author's `userFeedIndex`
- send `SubmissionAnnounced`

## 4.5 Replying

The app MUST:

- publish immutable `reply` + `submission` objects
- update the author's `userFeedIndex`
- send `SubmissionAnnounced`

## 4.6 Curator Choice

The app MUST:

- show which curator is currently active
- allow switching curators
- persist explicit per-board curator choice

## 4.7 Basic Board Creation

The MVP SHOULD include:

- board registration flow
- board metadata publish flow

This can live in a minimal admin-oriented UI rather than polished end-user UX.

## 5. MVP Technical Components

## 5.1 Swarmit Client

Responsibilities:

- route handling
- `window.swarm` writes
- `window.ethereum` transaction flow
- curated read-path rendering
- curator switching

## 5.2 Contracts

Responsibilities:

- register boards
- update board metadata
- announce submissions
- declare curators

## 5.3 Curator/Indexer

Responsibilities:

- watch chain events
- fetch Swarm objects
- materialize `boardIndex`, `threadIndex`, and optionally `globalIndex`
- publish and update curator feeds

## 6. Recommended MVP Build Order

### Phase 1: Protocol Plumbing

- finalize contract event interface
- finalize object formats
- publish a test board manually
- publish a test curator profile manually

### Phase 2: Author Flow

- connect `window.swarm`
- connect wallet
- create post flow
- create reply flow
- user feed updates

Verification note:

- Phase 2 verification requires at least a minimal curator process to read published content back through curated views.
- A lightweight manual or script-based curator is acceptable before the full curator/indexer lands in Phase 4.

### Phase 3: Curated Reading

- board page
- thread page
- curator selection
- default curator fallback behavior

### Phase 4: Curator Infrastructure

- first indexer/curator implementation
- feed publishing for `boardIndex`, `threadIndex`, `globalIndex`

### Phase 5: Board Creation

- board registration UI
- board metadata update UI

## 7. MVP UX Priorities

The first product should optimize for:

- clarity over decentralization theater
- obvious active curator state
- understandable publish flow
- graceful handling of propagation delay
- visible distinction between immutable posts and curated views

The app SHOULD explicitly explain:

- publishing goes to the user's Swarm node
- announcements go to Gnosis
- board and thread views come from a chosen curator

## 8. Things to Defer

Defer until after MVP:

- votes
- moderation tooling
- media-rich post composer
- multiple identity personas
- notifications
- discovery ranking experiments
- cross-board subscriptions
- raw submission log browsing for end users

## 9. Success Criteria

The MVP is successful if all of the following work end to end:

1. a user opens Swarmit from Swarm
2. the user reads a board through a curator-backed view
3. the user publishes a post through Freedom Browser
4. the post is announced on Gnosis
5. the curator infrastructure ingests it
6. the post appears in the curated board and thread views
7. the user can switch to a different curator and see a different view of the same underlying protocol objects

## 10. Summary

Swarmit MVP should prove a simple but powerful idea:

- users publish immutable content
- Gnosis makes it publicly discoverable
- curators turn the raw protocol into readable board and thread views

That is enough to validate the architecture before building richer social features.
