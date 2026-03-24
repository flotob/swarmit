/**
 * Thread view — #/r/:slug/comments/:rootSubId
 * Loads board metadata for curator selection, tries curators with fallthrough,
 * resolves threadIndexFeed from boardIndex entry, renders reply tree.
 */

import { fetchObject } from '../swarm/fetch.js';
import { getLatestBoardMetadata } from '../chain/events.js';
import { hexToBzz } from '../protocol/references.js';
import { loadCurators, getCuratorCandidates, resolveThread } from '../services/curator.js';
import { truncateAddress } from '../lib/format.js';
import { createReplyNode } from '../components/reply-node.js';

export async function render(container, params) {
  const slug = params.slug;
  const rootSubRef = hexToBzz(params.rootSubId);

  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const back = document.createElement('a');
  back.href = `#/r/${encodeURIComponent(slug)}`;
  back.textContent = `\u2190 r/${slug}`;
  back.style.cssText = 'display: inline-block; margin-bottom: 12px; font-size: 13px;';
  div.appendChild(back);

  const statusEl = document.createElement('p');
  statusEl.className = 'muted';
  statusEl.textContent = 'Loading thread...';
  div.appendChild(statusEl);

  const threadContainer = document.createElement('div');
  div.appendChild(threadContainer);

  container.appendChild(div);

  if (!rootSubRef) {
    statusEl.textContent = 'Invalid thread reference.';
    return;
  }

  try {
    // Step 1: Load board metadata so curator selection uses defaultCurator/endorsedCurators
    let board = null;
    try {
      const meta = await getLatestBoardMetadata(slug);
      if (meta?.boardRef) {
        board = await fetchObject(meta.boardRef);
      }
    } catch {
      // Continue without board metadata
    }

    // Step 2: Build candidate list and try curators with fallthrough
    statusEl.textContent = 'Selecting curator...';
    const curators = await loadCurators();
    const { candidates, needsPrompt, preferredCandidate } = getCuratorCandidates(slug, board, curators);

    if (candidates.length === 0) {
      statusEl.textContent = 'No curators available.';
      return;
    }

    statusEl.textContent = 'Loading thread...';
    const result = await resolveThread(slug, rootSubRef, candidates, curators);

    if (!result) {
      statusEl.textContent = 'No curator has a thread view for this post.';
      return;
    }

    const { curatorAddress, curatorProfile, threadIndex } = result;

    // Step 3: Fetch all submissions + content in parallel
    statusEl.textContent = `Loading ${threadIndex.nodes.length} posts...`;

    const nodeData = await Promise.all(
      threadIndex.nodes.map(async (node) => {
        try {
          const submission = await fetchObject(node.submissionId);
          const content = await fetchObject(submission.contentRef);
          return { node, submission, content };
        } catch (err) {
          console.warn(`Failed to load node ${node.submissionId}:`, err.message);
          return { node, submission: null, content: null };
        }
      })
    );

    // Step 4: Render
    statusEl.textContent = `${threadIndex.nodes.length} posts \u00b7 curated by ${curatorProfile.name || truncateAddress(curatorAddress)}`;

    const showBanner = needsPrompt || (preferredCandidate && preferredCandidate.toLowerCase() !== curatorAddress.toLowerCase());
    if (showBanner) {
      const banner = document.createElement('div');
      banner.style.cssText = 'padding: 8px 12px; margin-bottom: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px;';
      const link = document.createElement('a');
      link.href = '#/curators';
      link.textContent = 'Change curator';
      banner.appendChild(document.createTextNode(`Showing view from ${curatorProfile.name || truncateAddress(curatorAddress)} \u2014 `));
      banner.appendChild(link);
      threadContainer.before(banner);
    }

    for (const { node, submission, content } of nodeData) {
      const el = createReplyNode({
        submission,
        content,
        depth: node.depth || 0,
        isRoot: node.parentSubmissionId === null,
      });
      threadContainer.appendChild(el);
    }

  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}
