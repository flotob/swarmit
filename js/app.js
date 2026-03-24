/**
 * Swarmit — app entry point.
 * Detects providers, registers routes, boots the router.
 */

import * as router from './router.js';
import * as state from './state.js';
import { init as initHeader } from './components/header.js';
import { isAvailable as isSwarmAvailable } from './lib/swarm.js';
import { isAvailable as isEthereumAvailable } from './lib/ethereum.js';
import { fetchObject, cacheSize } from './swarm/fetch.js';
import { resolveFeed } from './swarm/feeds.js';

// ============================================
// Provider detection
// ============================================

function detectProviders() {
  const swarmAvailable = isSwarmAvailable();
  const ethereumAvailable = isEthereumAvailable();

  state.update({
    swarmDetected: swarmAvailable,
    swarmConnected: false,   // requires explicit requestAccess, not just detection
    walletConnected: false,  // requires explicit connect + chain switch
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
  // Debug views
  router.register('#/debug/swarm-read', renderSwarmReadSpike);
  router.register('#/debug/create-fixtures', async (container) => {
    const { render } = await import('./views/debug-fixtures.js');
    render(container);
  });

  router.register('#/', async (container) => {
    const { render } = await import('./views/home.js');
    render(container);
  });
  router.register('#/r/:slug', async (container, params) => {
    const { render } = await import('./views/board.js');
    render(container, params);
  });
  router.register('#/r/:slug/submit', async (container, params) => {
    const { render } = await import('./views/compose-post.js');
    render(container, params);
  });
  router.register('#/r/:slug/comments/:rootSubId', async (container, params) => {
    const { render } = await import('./views/thread.js');
    render(container, params);
  });
  router.register('#/u/:address', async (container, params) => {
    const { render } = await import('./views/user-profile.js');
    render(container, params);
  });
  router.register('#/curators', async (container, params) => {
    const { render } = await import('./views/curator-picker.js');
    render(container, params);
  });
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
// WP3: Swarm read spike — temporary debug view
// ============================================

function renderSwarmReadSpike(container) {
  const div = document.createElement('div');
  div.className = 'placeholder-view';

  const h2 = document.createElement('h2');
  h2.textContent = 'Swarm Read Spike';
  div.appendChild(h2);

  const desc = document.createElement('p');
  desc.className = 'muted';
  desc.textContent = 'Test fetching immutable objects and resolving feeds from Swarm.';
  div.appendChild(desc);

  // Immutable object fetch
  const section1 = document.createElement('div');
  section1.style.marginTop = '24px';

  const label1 = document.createElement('label');
  label1.textContent = 'Fetch immutable object by reference:';
  label1.style.display = 'block';
  label1.style.marginBottom = '8px';
  label1.style.fontSize = '13px';
  section1.appendChild(label1);

  const input1 = document.createElement('input');
  input1.type = 'text';
  input1.placeholder = 'bzz://... or 64-char hex';
  input1.style.cssText = 'width:100%;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-family:var(--font-mono);font-size:13px;';
  section1.appendChild(input1);

  const btn1 = document.createElement('button');
  btn1.className = 'btn btn-primary';
  btn1.textContent = 'Fetch Object';
  btn1.style.marginTop = '8px';
  section1.appendChild(btn1);

  const result1 = document.createElement('pre');
  result1.style.marginTop = '8px';
  result1.style.maxHeight = '300px';
  result1.style.overflow = 'auto';
  result1.textContent = '';
  section1.appendChild(result1);

  div.appendChild(section1);

  // Feed resolution
  const section2 = document.createElement('div');
  section2.style.marginTop = '24px';

  const label2 = document.createElement('label');
  label2.textContent = 'Resolve feed manifest:';
  label2.style.display = 'block';
  label2.style.marginBottom = '8px';
  label2.style.fontSize = '13px';
  section2.appendChild(label2);

  const input2 = document.createElement('input');
  input2.type = 'text';
  input2.placeholder = 'bzz://... feed manifest reference';
  input2.style.cssText = input1.style.cssText;
  section2.appendChild(input2);

  const btn2 = document.createElement('button');
  btn2.className = 'btn btn-primary';
  btn2.textContent = 'Resolve Feed';
  btn2.style.marginTop = '8px';
  section2.appendChild(btn2);

  const result2 = document.createElement('pre');
  result2.style.marginTop = '8px';
  result2.style.maxHeight = '300px';
  result2.style.overflow = 'auto';
  result2.textContent = '';
  section2.appendChild(result2);

  div.appendChild(section2);

  // Cache info
  const cacheInfo = document.createElement('p');
  cacheInfo.className = 'muted';
  cacheInfo.style.marginTop = '24px';
  cacheInfo.style.fontSize = '11px';
  cacheInfo.textContent = `Cache size: ${cacheSize()} objects`;
  div.appendChild(cacheInfo);

  container.appendChild(div);

  // Handlers
  btn1.addEventListener('click', async () => {
    const ref = input1.value.trim();
    if (!ref) { result1.textContent = 'Enter a reference'; return; }
    result1.textContent = 'Fetching...';
    try {
      const obj = await fetchObject(ref);
      result1.textContent = JSON.stringify(obj, null, 2);
      cacheInfo.textContent = `Cache size: ${cacheSize()} objects`;
    } catch (err) {
      result1.textContent = `Error: ${err.message}`;
    }
  });

  btn2.addEventListener('click', async () => {
    const ref = input2.value.trim();
    if (!ref) { result2.textContent = 'Enter a feed manifest reference'; return; }
    result2.textContent = 'Resolving...';
    try {
      const obj = await resolveFeed(ref);
      result2.textContent = JSON.stringify(obj, null, 2);
    } catch (err) {
      result2.textContent = `Error: ${err.message}`;
    }
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

// ES modules execute after DOM parsing but before DOMContentLoaded.
// Freedom Browser injects window.swarm at DOMContentLoaded via preload,
// so we must wait for that event before detecting providers.
if (document.readyState === 'complete') {
  boot();
} else {
  document.addEventListener('DOMContentLoaded', boot);
}
