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
  const swarmAvailable = !!(window.swarm && window.swarm.isFreedomBrowser);
  const ethereumAvailable = !!(window.ethereum);

  const statusEl = document.getElementById('provider-status');
  if (statusEl) {
    if (swarmAvailable && ethereumAvailable) {
      statusEl.innerHTML = '<span class="badge ok">Swarm + Wallet available</span>';
    } else if (swarmAvailable) {
      statusEl.innerHTML = '<span class="badge warn">Swarm available, wallet not detected</span>';
    } else if (ethereumAvailable) {
      statusEl.innerHTML = '<span class="badge warn">Wallet available, Swarm not detected</span>';
    } else {
      statusEl.innerHTML = '<span class="badge error">No providers detected — open in Freedom Browser</span>';
    }
  }

  return { swarmAvailable, ethereumAvailable };
}

// ============================================
// Placeholder views (replaced by real views in later WPs)
// ============================================

function placeholderView(name) {
  return (container, params) => {
    container.innerHTML = `
      <div class="placeholder-view">
        <h2>${name}</h2>
        <p class="muted">This view will be implemented in a later work package.</p>
        ${params ? `<pre class="params">${JSON.stringify(params, null, 2)}</pre>` : ''}
      </div>
    `;
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
    container.innerHTML = `
      <div class="placeholder-view">
        <h2>Not Found</h2>
        <p class="muted">Unknown route: <code>${window.location.hash}</code></p>
        <a href="#/">Back to home</a>
      </div>
    `;
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
