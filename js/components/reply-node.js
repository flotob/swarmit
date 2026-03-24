/**
 * Reply tree node component — recursive rendering of threaded replies.
 */

import { createMarkdownElement } from './markdown.js';
import { truncateAddress, timeAgo } from '../lib/format.js';

/**
 * Create a reply node element with depth-based indentation.
 * @param {Object} params
 * @param {Object} params.submission - The submission object
 * @param {Object} params.content - The post or reply content object
 * @param {number} params.depth - Nesting depth (0 = root post)
 * @param {boolean} [params.isRoot] - True for the root post (rendered differently)
 * @returns {HTMLElement}
 */
export function createReplyNode({ submission, content, depth, isRoot }) {
  const node = document.createElement('div');
  node.style.cssText = `margin-left: ${Math.min(depth, 6) * 24}px; padding: 12px 0; border-bottom: 1px solid var(--border);`;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 6px;';
  const author = content?.author?.address || submission?.author?.address || '?';
  const time = submission?.createdAt || content?.createdAt;
  header.textContent = truncateAddress(author) + (time ? ` · ${timeAgo(time)}` : '');
  node.appendChild(header);

  // Title (root post only)
  if (isRoot && content?.title) {
    const title = document.createElement('h3');
    title.style.cssText = 'font-size: 18px; margin-bottom: 8px;';
    title.textContent = content.title;
    node.appendChild(title);
  }

  // Body
  if (content?.body?.text) {
    node.appendChild(createMarkdownElement(content.body.text));
  }

  return node;
}
