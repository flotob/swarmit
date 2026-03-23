/**
 * App header component.
 */

import * as state from '../state.js';
import * as ethereum from '../lib/ethereum.js';

let walletBtn = null;
let walletStatus = null;

export function init() {
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

  if (!ethereum.isAvailable()) {
    console.warn('[Header] Wallet provider not available');
    return;
  }

  try {
    walletBtn.disabled = true;
    walletBtn.textContent = 'Connecting...';
    await ethereum.connect();
  } catch (err) {
    console.error('[Header] Wallet connect failed:', err);
    walletBtn.textContent = 'Connect Wallet';
  } finally {
    walletBtn.disabled = false;
  }
}
