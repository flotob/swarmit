# Swarmit SPA — UI Rebuild Plan

## Current State

The SPA is functionally complete but looks like a proof of concept:
- Inline styles everywhere, no consistent design system
- No reply UI (pipeline exists but no form in thread view)
- Create Board page exists but isn't linked from navigation
- No image/media support
- Markdown renderer exists but is minimal
- No loading states, empty states, or error states with real design
- No mobile responsiveness

## Goal

A Reddit-like experience: familiar layout, clean typography, functional posting and replying, media support, and a design that doesn't look like a developer tool.

## Design Direction

Reddit-inspired but Swarm-native:
- Dark theme (already in place, refine it)
- Card-based post listings with vote/comment counts area (even if not functional yet)
- Threaded reply indentation with collapse
- Sidebar with board info and curator status
- Top navigation with board links, create board, user menu
- Compact information density like old.reddit.com rather than new Reddit's whitespace

## Work Packages

### UP1: Design System + CSS Overhaul

Replace inline styles with a proper CSS class system.

- Define form classes: `.form-input`, `.form-textarea`, `.form-label`, `.form-group`
- Define layout classes: `.content-with-sidebar`, `.sidebar`, `.main-content`
- Define post classes: `.post-card`, `.post-title`, `.post-meta`, `.post-body`
- Define thread classes: `.reply-node`, `.reply-header`, `.reply-body`, `.reply-actions`
- Define utility classes: `.loading`, `.empty-state`, `.error-state`
- Update `variables.css` with refined spacing, colors, and typography
- Add responsive breakpoints for mobile
- Remove all inline `style.cssText` from views and components

### UP2: Navigation + Layout Shell

Redesign the app shell to match Reddit's layout.

- Top bar: logo, search (placeholder), board links, Create Board button, user menu (address + connect)
- Board-scoped header when inside `#/r/:slug` (board name, description, submit button, curator indicator)
- Sidebar: board rules/description, curator info, related boards (when on a board page)
- Footer: minimal
- Mobile: hamburger menu, collapsible sidebar

### UP3: Home Page Redesign

- Board cards with title, description, subscriber/post count placeholders
- "Create Board" call to action
- If curator's globalIndex is available, show cross-board recent posts
- Empty state when no boards exist

### UP4: Board View Redesign

- Post cards: title, author, time ago, comment count, board badge
- Sort options placeholder (Hot / New / Top — only "New" works for now, others are UI-only)
- "Submit Post" button prominent
- Curator indicator bar (which curator, change link)
- Pagination or infinite scroll placeholder (load more button)
- Empty state: "No posts yet. Be the first!"

### UP5: Post Card Component

- Title (clickable → thread)
- Author address (clickable → user profile) with truncation
- Time ago
- Preview of body text (first ~200 chars)
- Comment count (from threadIndex nodes if available)
- Board badge (when shown in global/cross-board context)

### UP6: Thread View Redesign

- Root post displayed prominently: full title, author, time, full markdown body, media
- Reply form directly below root post (always visible)
- Threaded replies with depth indentation, collapse/expand per branch
- Each reply: author, time, markdown body, "Reply" button
- Inline reply form that appears when clicking "Reply" on any comment
- Back to board link

### UP7: Inline Reply

Wire the existing `publishReply()` pipeline into the thread view.

- Reply form: textarea + submit button
- Appears inline below the comment being replied to
- Uses `parentSubmissionId` from the clicked comment, `rootSubmissionId` from the thread root
- Multi-step status bar (same as compose-post)
- After success: show the new reply optimistically in the tree (even before curator picks it up)

### UP8: Compose Post Redesign

- Full-width form with title input and markdown editor area
- Markdown toolbar: bold, italic, link, code, image
- Live preview panel (toggle or side-by-side)
- Board selector if navigated to from home (pre-filled if from board)
- Status bar during publish (existing, just styled better)

### UP9: Image/Media Support

- Image upload via Freedom Browser's `publishData` API
- Insert image reference into markdown as `![alt](bzz://<ref>)`
- Display images in post/reply bodies (markdown renderer resolves `bzz://` image URLs)
- Image preview in compose form
- Attachment descriptors per protocol spec (contentType, sizeBytes, kind)
- Size limits and format validation

### UP10: Create Board Polish

- Link from navigation (always visible)
- Better form design with slug preview ("Your board will be at r/your-slug")
- Governance info section (currently hardcoded to EOA)
- Success state with link to the new board

### UP11: Curator Picker Redesign

- Card per curator with avatar placeholder, name, description
- Per-board selection with visual feedback
- Show which boards each curator covers
- Active curator highlighted
- Accessible from board header

### UP12: User Profile Redesign

- User address as header
- Submission history with proper post cards (not just refs)
- Filter by board, by type (posts/replies)
- Link to user's posts from post/reply author addresses throughout the app

### UP13: Loading, Empty, Error States

- Skeleton loading screens for board and thread views
- Meaningful empty states ("No posts yet", "No curators", "Board not found")
- Error states with retry buttons
- Connection status indicator (Swarm/wallet) persistent in header

### UP14: Mobile Responsiveness

- Responsive layout at 768px and 480px breakpoints
- Collapsible sidebar
- Touch-friendly reply/compose forms
- Readable typography on small screens

## Implementation Order

```
UP1  Design System ← foundation for everything else
 ↓
UP2  Navigation + Layout Shell
UP3  Home Page
 ↓
UP4  Board View
UP5  Post Card
 ↓
UP6  Thread View
UP7  Inline Reply ← first new functionality
 ↓
UP8  Compose Post Redesign
UP9  Image/Media ← biggest new feature
 ↓
UP10 Create Board Polish
UP11 Curator Picker
UP12 User Profile
 ↓
UP13 Loading/Empty/Error States
UP14 Mobile
```

**Critical path:** UP1 → UP2 → UP4+UP5 → UP6+UP7 → UP9

UP3, UP10, UP11, UP12 can happen in parallel once UP1+UP2 are done.

## Open Questions

1. **DOM helper** — should we extract the `el()` helper from debug-fixtures into a shared utility, or adopt a lightweight templating approach? The current `document.createElement` chains will get unwieldy with richer UI.
2. **CSS approach** — stay with vanilla CSS, or adopt something like CSS modules or a minimal utility framework? Given the "no build tools" constraint, vanilla CSS with good class naming is probably the right call.
3. **Markdown editor** — build a minimal toolbar ourselves, or vendor a lightweight editor? For v1, a simple toolbar that inserts markdown syntax is probably enough.
4. **Image upload UX** — drag-and-drop, paste, or file picker? Freedom Browser's `publishData` supports all, but the UX differs.

## Notes

- The `el()` helper from `debug-fixtures.js` should be extracted to `js/lib/dom.js` and used by all views. This will significantly reduce boilerplate.
- The `/simplify` review pattern should continue for each UP.
- The reviewer/spec AI should check UP7 (reply) and UP9 (media) for protocol compliance.
