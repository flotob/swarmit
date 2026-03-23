/**
 * Swarmit — app entry point.
 * Detects providers, registers routes, boots the router.
 */

import * as router from './router.js';
import * as state from './state.js';
import { init as initHeader } from './components/header.js';

// ============================================
// Provider detection
// ============================================

function detectProviders() {
  const swarmAvailable = !!(window.swarm && typeof window.swarm.request === 'function');
  const ethereumAvailable = !!(window.ethereum && typeof window.ethereum.request === 'function');

  state.update({
    swarmConnected: swarmAvailable,
    walletConnected: false, // wallet requires explicit connect, not just detection
  });

  const statusEl = document.getElementById('provider-status');
  if (statusEl) {
    const badge = document.createElement('span');
    badge.className = 'badge';

    if (swarmAvailable && ethereumAvailable) {
      badge.classList.add('ok');
      badge.textContent = 'Swarm + Wallet available';
    } else if (swarmAvailable) {
      badge.classList.add('warn');
      badge.textContent = 'Swarm available, wallet not detected';
    } else if (ethereumAvailable) {
      badge.classList.add('warn');
      badge.textContent = 'Wallet available, Swarm not detected';
    } else {
      badge.classList.add('error');
      badge.textContent = 'No providers detected \u2014 open in Freedom Browser';
    }

    statusEl.textContent = '';
    statusEl.appendChild(badge);
  }

  return { swarmAvailable, ethereumAvailable };
}

// ============================================
// Placeholder views (replaced by real views in later WPs)
// ============================================

function placeholderView(name) {
  return (container, params) => {
    const div = document.createElement('div');
    div.className = 'placeholder-view';

    const h2 = document.createElement('h2');
    h2.textContent = name;
    div.appendChild(h2);

    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'This view will be implemented in a later work package.';
    div.appendChild(p);

    if (params && Object.keys(params).length > 0) {
      const pre = document.createElement('pre');
      pre.className = 'params';
      pre.textContent = JSON.stringify(params, null, 2);
      div.appendChild(pre);
    }

    container.appendChild(div);
  };
}

// ============================================
// Route registration
// ============================================

function registerRoutes() {
  router.register('#/', placeholderView('Home'));
  router.register('#/r/:slug', placeholderView('Board'));
  router.register('#/r/:slug/submit', placeholderView('Create Post'));
  router.register('#/r/:slug/comments/:rootSubId', placeholderView('Thread'));
  router.register('#/u/:address', placeholderView('User Profile'));
  router.register('#/curators', placeholderView('Curator Selection'));
  router.register('#/create-board', placeholderView('Create Board'));

  router.setNotFound((container) => {
    const div = document.createElement('div');
    div.className = 'placeholder-view';

    const h2 = document.createElement('h2');
    h2.textContent = 'Not Found';
    div.appendChild(h2);

    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Unknown route: ' + window.location.hash;
    div.appendChild(p);

    const a = document.createElement('a');
    a.href = '#/';
    a.textContent = 'Back to home';
    div.appendChild(a);

    container.appendChild(div);
  });
}

// ============================================
// Boot
// ============================================

function boot() {
  detectProviders();
  initHeader();
  registerRoutes();
  router.init(document.getElementById('app'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
