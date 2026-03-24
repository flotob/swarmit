/**
 * User profile view — #/u/:address
 * Shows a user's submission history by resolving their userFeedIndex.
 */

import { fetchObject } from '../swarm/fetch.js';
import { resolveFeed } from '../swarm/feeds.js';
import { truncateAddress, timeAgo } from '../lib/format.js';
import { getBoardRegistrations, getSubmissionsForBoard } from '../chain/events.js';
import { get as getState } from '../state.js';
import { navigate } from '../router.js';

export async function render(container, params) {
  const address = params.address;

  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = truncateAddress(address);
  div.appendChild(h2);

  const fullAddr = document.createElement('p');
  fullAddr.style.cssText = 'font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 16px; word-break: break-all;';
  fullAddr.textContent = address;
  div.appendChild(fullAddr);

  const statusEl = document.createElement('p');
  statusEl.className = 'muted';
  statusEl.textContent = 'Loading activity...';
  div.appendChild(statusEl);

  const listContainer = document.createElement('div');
  listContainer.style.marginTop = '16px';
  div.appendChild(listContainer);

  container.appendChild(div);

  try {
    statusEl.textContent = 'Looking up user feed...';
    let userFeedRef = null;

    // Check if this is the current user
    const state = getState();
    if (state.userAddress?.toLowerCase() === address.toLowerCase() && state.userFeed) {
      userFeedRef = state.userFeed;
    }

    // Search chain submissions in parallel across all boards
    if (!userFeedRef) {
      try {
        const regs = await getBoardRegistrations();
        // Fan out all board submission queries in parallel
        const results = await Promise.all(
          regs.map(async (reg) => {
            try {
              const subs = await getSubmissionsForBoard(reg.slug);
              const match = subs.find((s) => s.author?.toLowerCase() === address.toLowerCase());
              if (match) {
                const submission = await fetchObject(match.submissionRef);
                return submission?.author?.userFeed || null;
              }
            } catch {
              // Individual board scan failure is non-fatal
            }
            return null;
          })
        );
        userFeedRef = results.find((r) => r) || null;
      } catch {
        // Chain not available
      }
    }

    if (!userFeedRef) {
      statusEl.textContent = 'Could not find this user\'s feed.';
      return;
    }

    // Resolve the user feed to get their index
    statusEl.textContent = 'Loading submission history...';
    let feedIndex;
    try {
      feedIndex = await resolveFeed(userFeedRef);
    } catch {
      statusEl.textContent = 'User feed not available.';
      return;
    }

    if (!feedIndex?.entries?.length) {
      statusEl.textContent = 'No submissions yet.';
      return;
    }

    statusEl.textContent = `${feedIndex.entries.length} submission${feedIndex.entries.length > 1 ? 's' : ''}`;

    // Render entries (newest first)
    const entries = [...feedIndex.entries].reverse();

    for (const entry of entries) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding: 12px 16px; margin-bottom: 8px; cursor: pointer;';

      const meta = document.createElement('div');
      meta.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 4px;';
      meta.textContent = `${entry.kind} in r/${entry.boardId}`;
      if (entry.createdAt) meta.textContent += ` \u00b7 ${timeAgo(entry.createdAt)}`;
      card.appendChild(meta);

      const refEl = document.createElement('div');
      refEl.style.cssText = 'font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      refEl.textContent = entry.submissionRef || entry.submissionId;
      card.appendChild(refEl);

      const subRef = entry.submissionRef || entry.submissionId;
      if (subRef && entry.boardId) {
        card.addEventListener('click', async () => {
          let rootHex;
          if (entry.kind === 'post') {
            rootHex = subRef.replace('bzz://', '');
          } else {
            // Reply: fetch the submission to get rootSubmissionId
            try {
              const sub = await fetchObject(subRef);
              rootHex = (sub.rootSubmissionId || subRef).replace('bzz://', '');
            } catch {
              rootHex = subRef.replace('bzz://', '');
            }
          }
          navigate(`#/r/${encodeURIComponent(entry.boardId)}/comments/${rootHex}`);
        });
      }

      listContainer.appendChild(card);
    }

  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}
