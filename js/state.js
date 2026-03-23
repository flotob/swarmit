/**
 * Minimal state store with subscribe/notify.
 */

const listeners = new Set();

const state = {
  // Current route context
  currentBoard: null,       // board object or null
  currentCurator: null,     // curator address for current board

  // User
  userAddress: null,        // connected wallet address or null
  userFeed: null,           // user's feed manifest bzzUrl or null

  // Provider status
  swarmConnected: false,
  walletConnected: false,
};

// Per-board curator preferences (persisted to localStorage)
const CURATOR_PREFS_KEY = 'swarmit-curator-prefs';

function loadCuratorPrefs() {
  try {
    return JSON.parse(localStorage.getItem(CURATOR_PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCuratorPrefs(prefs) {
  localStorage.setItem(CURATOR_PREFS_KEY, JSON.stringify(prefs));
}

export function getCuratorPref(boardId) {
  return loadCuratorPrefs()[boardId] || null;
}

export function setCuratorPref(boardId, curatorAddress) {
  const prefs = loadCuratorPrefs();
  prefs[boardId] = curatorAddress;
  saveCuratorPrefs(prefs);
}

export function update(changes) {
  Object.assign(state, changes);
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error('[State] listener error:', e); }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function get() {
  return state;
}
