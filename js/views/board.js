/**
 * Board view — #/r/:slug
 * Loads board metadata, tries curators with fallthrough, renders post cards.
 */

import { fetchObject } from '../swarm/fetch.js';
import { getLatestBoardMetadata } from '../chain/events.js';
import { loadCurators, getCuratorCandidates, resolveBoard } from '../services/curator.js';
import { truncateAddress } from '../lib/format.js';
import { createPostCard } from '../components/post-card.js';

export async function render(container, params) {
  const slug = params.slug;
  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = `r/${slug}`;
  div.appendChild(h2);

  const statusEl = document.createElement('p');
  statusEl.className = 'muted';
  statusEl.textContent = 'Loading board...';
  div.appendChild(statusEl);

  const submitLink = document.createElement('a');
  submitLink.href = `#/r/${encodeURIComponent(slug)}/submit`;
  submitLink.className = 'btn btn-primary';
  submitLink.textContent = 'Submit Post';
  submitLink.style.cssText = 'display: inline-block; margin: 12px 0;';
  div.appendChild(submitLink);

  const postsContainer = document.createElement('div');
  div.appendChild(postsContainer);

  container.appendChild(div);

  try {
    // Step 1: Board metadata from chain
    statusEl.textContent = 'Loading board metadata...';
    let board = null;
    try {
      const meta = await getLatestBoardMetadata(slug);
      if (meta?.boardRef) {
        board = await fetchObject(meta.boardRef);
      }
    } catch {
      // Chain not available — continue without metadata
    }

    if (board) {
      h2.textContent = board.title || `r/${slug}`;
      if (board.description) {
        const desc = document.createElement('p');
        desc.className = 'muted';
        desc.textContent = board.description;
        desc.style.marginBottom = '8px';
        div.insertBefore(desc, submitLink);
      }
    }

    // Step 2: Build candidate list and try curators with fallthrough
    statusEl.textContent = 'Selecting curator...';
    const curators = await loadCurators();
    const { candidates, needsPrompt, preferredCandidate } = getCuratorCandidates(slug, board, curators);

    if (candidates.length === 0) {
      statusEl.textContent = 'No curators available for this board.';
      return;
    }

    statusEl.textContent = 'Loading curator view...';
    const result = await resolveBoard(slug, candidates, curators);

    if (!result) {
      statusEl.textContent = 'No curator has data for this board yet.';
      return;
    }

    const { curatorAddress, curatorProfile, boardIndex } = result;

    statusEl.textContent = `Curated by ${curatorProfile.name || truncateAddress(curatorAddress)} \u00b7 ${boardIndex.entries.length} posts`;

    // Show banner if auto-picked (needsPrompt) or if fallthrough landed on a different curator than preferred
    const showBanner = needsPrompt || (preferredCandidate && preferredCandidate.toLowerCase() !== curatorAddress.toLowerCase());
    if (showBanner) {
      const banner = document.createElement('div');
      banner.style.cssText = 'padding: 8px 12px; margin-bottom: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px;';
      const link = document.createElement('a');
      link.href = '#/curators';
      link.textContent = 'Change curator';
      banner.appendChild(document.createTextNode(`Showing view from ${curatorProfile.name || truncateAddress(curatorAddress)} \u2014 `));
      banner.appendChild(link);
      postsContainer.before(banner);
    }

    // Step 3: Fetch submissions + content in parallel
    const cards = await Promise.all(
      boardIndex.entries.map(async (entry) => {
        try {
          const submission = await fetchObject(entry.submissionRef);
          const content = await fetchObject(submission.contentRef);
          return createPostCard({ boardSlug: slug, submission: { ...submission, submissionId: entry.submissionId }, content });
        } catch (err) {
          console.warn(`Failed to load submission ${entry.submissionId}:`, err.message);
          return null;
        }
      })
    );

    for (const card of cards) {
      if (card) postsContainer.appendChild(card);
    }

  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}
