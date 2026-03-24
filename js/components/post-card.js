/**
 * Post card component — renders a submission summary for board listings.
 */

import { truncateAddress, timeAgo } from '../lib/format.js';

/**
 * Create a post card element.
 * @param {Object} params
 * @param {string} params.boardSlug
 * @param {Object} params.submission - The submission object
 * @param {Object} params.content - The post object (fetched via submission.contentRef)
 * @returns {HTMLElement}
 */
export function createPostCard({ boardSlug, submission, content }) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'padding: 16px; margin-bottom: 8px; cursor: pointer;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 6px; color: var(--text);';
  title.textContent = content?.title || '(untitled)';
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.style.cssText = 'font-size: 12px; color: var(--text-muted);';
  const author = content?.author?.address || submission?.author?.address || '?';
  const time = submission?.createdAt ? timeAgo(submission.createdAt) : '';
  meta.textContent = `${truncateAddress(author)} · ${time}`;
  card.appendChild(meta);

  // Click navigates to thread
  const submissionId = submission?.submissionId || submission?.submissionRef;
  if (submissionId) {
    card.addEventListener('click', () => {
      const ref = submissionId.replace('bzz://', '');
      window.location.hash = `#/r/${encodeURIComponent(boardSlug)}/comments/${ref}`;
    });
  }

  return card;
}
