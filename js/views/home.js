/**
 * Home view — #/
 * Lists all registered boards from chain events.
 */

import { fetchObject } from '../swarm/fetch.js';
import { getBoardRegistrations, getLatestBoardMetadata } from '../chain/events.js';
import { navigate } from '../router.js';

export async function render(container) {
  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = 'Boards';
  div.appendChild(h2);

  const statusEl = document.createElement('p');
  statusEl.className = 'muted';
  statusEl.textContent = 'Loading boards...';
  div.appendChild(statusEl);

  const listContainer = document.createElement('div');
  listContainer.style.marginTop = '16px';
  div.appendChild(listContainer);

  container.appendChild(div);

  try {
    const registrations = await getBoardRegistrations();

    if (registrations.length === 0) {
      statusEl.textContent = 'No boards registered yet.';
      return;
    }

    // Deduplicate by slug — keep latest registration
    const bySlug = new Map();
    for (const reg of registrations) bySlug.set(reg.slug, reg);
    const uniqueRegs = [...bySlug.values()];

    statusEl.textContent = `${uniqueRegs.length} board${uniqueRegs.length > 1 ? 's' : ''}`;

    // Fetch latest board metadata in parallel (folds BoardRegistered + BoardMetadataUpdated)
    const boards = await Promise.all(
      uniqueRegs.map(async (reg) => {
        try {
          const meta = await getLatestBoardMetadata(reg.slug);
          const board = meta?.boardRef ? await fetchObject(meta.boardRef) : null;
          return { reg, board };
        } catch {
          return { reg, board: null };
        }
      })
    );

    for (const { reg, board } of boards) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding: 16px; margin-bottom: 8px; cursor: pointer;';

      const title = document.createElement('div');
      title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 4px;';
      title.textContent = board?.title || `r/${reg.slug}`;
      card.appendChild(title);

      if (board?.description) {
        const desc = document.createElement('div');
        desc.style.cssText = 'font-size: 13px; color: var(--text-muted);';
        desc.textContent = board.description;
        card.appendChild(desc);
      }

      card.addEventListener('click', () => {
        navigate(`#/r/${encodeURIComponent(reg.slug)}`);
      });

      listContainer.appendChild(card);
    }

  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}
