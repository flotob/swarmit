# Creating Test Fixtures

## Overview

Test fixtures can be created using the debug page at `#/debug/create-fixtures` in the running Swarmit SPA. The page uses the protocol object builders and validators from WP4 to construct all 9 protocol object types, publishes them to Swarm, and optionally registers them on-chain.

## Prerequisites

- Open the SPA in Freedom Browser (Swarm provider required for publishing)
- For on-chain registration: wallet connected + contract deployed

## What the fixture page publishes

### Swarm objects (works now)

1. **User feed** — creates a feed via Freedom Browser's `createFeed`
2. **Board** (`freedom-board/board/v1`) — slug "test", title "Test Board"
3. **Post** (`freedom-board/post/v1`) — "Hello Swarm!" test post
4. **Submission for post** (`freedom-board/submission/v1`) — kind "post", links to post contentRef
5. **Reply** (`freedom-board/reply/v1`) — test reply to the post
6. **Submission for reply** (`freedom-board/submission/v1`) — kind "reply", links parent/root to post submission
7. **BoardIndex** (`freedom-board/board-index/v1`) — curator view with the post submission
8. **ThreadIndex** (`freedom-board/thread-index/v1`) — reply tree with root post + reply
9. **UserFeedIndex** (`freedom-board/user-feed/v1`) — author's submission history
10. **GlobalIndex** (`freedom-board/global-index/v1`) — cross-board front page with the test post
11. **CuratorProfile** (`freedom-board/curator/v1`) — "Test Curator" with board feed pointing at boardIndex and global feed pointing at globalIndex

All 9 protocol object types are covered. Every object is validated via `validate()` before publishing. The page displays all resulting `bzz://` references.

**Identity requirement:** Wallet connection is required before publishing. All identity-coupled fields (`author.address`, `board.governance.address`, `curatorProfile.curator`) use the connected wallet address. Chain actions are blocked if the wallet changes after publish.

### On-chain registration (needs deployed contract)

Separate buttons for each chain action:

- **Register Board** — calls `registerBoard("test", boardRef)`
- **Announce Post** — calls `announceSubmission` with null parent/root (top-level)
- **Announce Reply** — calls `announceSubmission` with parent/root pointing to post submission
- **Declare Curator** — calls `declareCurator(curatorProfileRef)`

These are disabled/blocked until `CONTRACT_ADDRESS` in `config.js` is updated from the placeholder.

## Identity notes

- `board.governance.address` matches the connected wallet address
- `curatorProfile.curator` matches the connected wallet address
- `author.userFeed` is a real feed if feed creation succeeds, otherwise a placeholder
- All `author.address` fields match the connected wallet (or a test address if no wallet)

## Using the fixtures

After publishing, use the refs to test:

- **`#/debug/swarm-read`** — paste any ref to fetch and inspect the published objects
- **Board/thread views** (WP8) — once implemented, navigate to `#/r/test` to see the fixture board
- **Chain reads** (WP5) — once contract is deployed, event readers will find the registered fixtures

## Thread feed discovery

The fixture page creates a board feed for the curator and points it at the boardIndex. Thread-level feed discovery is not yet defined in the protocol — the threadIndex is published as a standalone immutable object. How clients discover thread feeds will be designed in WP8.
