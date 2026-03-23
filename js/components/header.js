/**
 * App header component.
 */

import * as state from '../state.js';

let headerEl = null;
let walletBtn = null;
let walletStatus = null;

export function init() {
  headerEl = document.getElementById('app-header');
  walletBtn = document.getElementById('wallet-connect-btn');
  walletStatus = document.getElementById('wallet-status');

  if (walletBtn) {
    walletBtn.addEventListener('click', handleWalletClick);
  }

  state.subscribe(render);
  render(state.get());
}

function render(s) {
  if (walletStatus) {
    if (s.walletConnected && s.userAddress) {
      const short = s.userAddress.slice(0, 6) + '...' + s.userAddress.slice(-4);
      walletStatus.textContent = short;
      walletStatus.title = s.userAddress;
      walletStatus.classList.add('connected');
    } else {
      walletStatus.textContent = '';
      walletStatus.classList.remove('connected');
    }
  }

  if (walletBtn) {
    walletBtn.textContent = s.walletConnected ? 'Connected' : 'Connect Wallet';
    walletBtn.classList.toggle('connected', s.walletConnected);
  }
}

async function handleWalletClick() {
  if (state.get().walletConnected) return;

  // Will be wired to lib/ethereum.js in WP2
  console.log('[Header] Wallet connect clicked — provider wrapper not yet available');
}
