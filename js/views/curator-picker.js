/**
 * Curator picker view — #/curators
 * Lists all declared curators, shows their profiles, allows per-board selection.
 * Also usable inline from board/thread views via the "Change curator" banner.
 */

import { fetchObject } from '../swarm/fetch.js';
import { loadCurators } from '../services/curator.js';
import { getCuratorPref, setCuratorPref } from '../state.js';
import { truncateAddress } from '../lib/format.js';

export async function render(container, params) {
  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = 'Curators';
  div.appendChild(h2);

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = 'Choose a curator to change how boards are moderated and ordered.';
  div.appendChild(desc);

  const statusEl = document.createElement('p');
  statusEl.className = 'muted';
  statusEl.textContent = 'Loading curators...';
  div.appendChild(statusEl);

  const listContainer = document.createElement('div');
  listContainer.style.marginTop = '16px';
  div.appendChild(listContainer);

  container.appendChild(div);

  try {
    const curators = await loadCurators();

    if (curators.length === 0) {
      statusEl.textContent = 'No curators have declared themselves yet.';
      return;
    }

    statusEl.textContent = `${curators.length} curator${curators.length > 1 ? 's' : ''} found`;

    // Fetch all curator profiles in parallel
    const profiles = await Promise.all(
      curators.map(async (c) => {
        try {
          const profile = await fetchObject(c.curatorProfileRef);
          return { address: c.curator, profile };
        } catch {
          return { address: c.curator, profile: null };
        }
      })
    );

    for (const { address, profile } of profiles) {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding: 16px; margin-bottom: 8px;';

      // Name + address
      const nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 4px;';
      nameEl.textContent = profile?.name || truncateAddress(address);
      card.appendChild(nameEl);

      const addrEl = document.createElement('div');
      addrEl.style.cssText = 'font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 8px;';
      addrEl.textContent = address;
      card.appendChild(addrEl);

      // Description
      if (profile?.description) {
        const descEl = document.createElement('p');
        descEl.style.cssText = 'font-size: 13px; margin-bottom: 12px; color: var(--text);';
        descEl.textContent = profile.description;
        card.appendChild(descEl);
      }

      // Board feeds
      if (profile?.boardFeeds) {
        const boards = Object.keys(profile.boardFeeds);
        if (boards.length > 0) {
          const boardsEl = document.createElement('div');
          boardsEl.style.cssText = 'font-size: 12px; color: var(--text-muted); margin-bottom: 12px;';
          boardsEl.textContent = `Curates: ${boards.map((b) => `r/${b}`).join(', ')}`;
          card.appendChild(boardsEl);
        }
      }

      // Per-board select buttons
      if (profile?.boardFeeds) {
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

        for (const boardSlug of Object.keys(profile.boardFeeds)) {
          const currentPref = getCuratorPref(boardSlug);
          const isSelected = currentPref?.toLowerCase() === address.toLowerCase();

          const btn = document.createElement('button');
          btn.className = isSelected ? 'btn btn-secondary' : 'btn btn-primary';
          btn.textContent = isSelected ? `Selected for r/${boardSlug}` : `Use for r/${boardSlug}`;
          btn.disabled = isSelected;
          btn.style.fontSize = '12px';

          btn.addEventListener('click', () => {
            setCuratorPref(boardSlug, address);
            btn.className = 'btn btn-secondary';
            btn.textContent = `Selected for r/${boardSlug}`;
            btn.disabled = true;

            // Reset other curators' buttons for this board
            listContainer.querySelectorAll(`[data-board="${boardSlug}"]`).forEach((other) => {
              if (other !== btn) {
                other.className = 'btn btn-primary';
                other.textContent = `Use for r/${boardSlug}`;
                other.disabled = false;
              }
            });
          });

          btn.setAttribute('data-board', boardSlug);
          btnRow.appendChild(btn);
        }

        card.appendChild(btnRow);
      }

      listContainer.appendChild(card);
    }

  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
}
