/**
 * Read-only Gnosis Chain RPC client via fetch.
 * No wallet connection required — used for all chain reads (board discovery,
 * submission events, curator declarations).
 */

import { GNOSIS_RPC_URL } from '../config.js';

let requestId = 0;

/**
 * Send a JSON-RPC request to the Gnosis Chain RPC endpoint.
 * @param {string} method
 * @param {any[]} params
 * @returns {Promise<any>} The result field from the RPC response
 */
async function rpcCall(method, params = []) {
  const id = ++requestId;

  const response = await fetch(GNOSIS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });

  if (!response.ok) {
    throw new Error(`RPC HTTP error: ${response.status}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  return json.result;
}

/**
 * eth_getLogs — fetch event logs matching a filter.
 * @param {{ address?, topics?, fromBlock?, toBlock? }} filter
 * @returns {Promise<Array>} Array of log objects
 */
export async function getLogs(filter) {
  return rpcCall('eth_getLogs', [{
    address: filter.address || undefined,
    topics: filter.topics || [],
    fromBlock: filter.fromBlock || '0x0',
    toBlock: filter.toBlock || 'latest',
  }]);
}

/**
 * eth_call — read-only contract call.
 * @param {{ to: string, data: string }} callObj
 * @param {string} [block='latest']
 * @returns {Promise<string>} Hex-encoded return data
 */
export async function ethCall(callObj, block = 'latest') {
  return rpcCall('eth_call', [callObj, block]);
}

/**
 * eth_blockNumber — get the current block number.
 * @returns {Promise<string>} Hex block number
 */
export async function getBlockNumber() {
  return rpcCall('eth_blockNumber');
}

/**
 * eth_getTransactionReceipt — get the receipt of a mined transaction.
 * @param {string} txHash
 * @returns {Promise<object|null>} Receipt object, or null if not yet mined
 */
export async function getTransactionReceipt(txHash) {
  return rpcCall('eth_getTransactionReceipt', [txHash]);
}

/**
 * Poll for a transaction receipt until mined or timeout.
 * @param {string} txHash
 * @param {{ timeout?: number, interval?: number }} [opts]
 * @returns {Promise<object>} Receipt object
 */
export async function waitForReceipt(txHash, { timeout = 60000, interval = 3000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const receipt = await getTransactionReceipt(txHash);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Transaction not mined within timeout');
}
