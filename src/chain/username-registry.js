/**
 * Read the SwarmitUsernameRegistry contract.
 * All reads are feature-guarded — if the registry isn't configured,
 * functions return empty results with no RPC calls.
 */

import { Interface } from 'ethers';
import { iface as registryIface } from 'swarmit-protocol/username-registry';
import { ethCall } from '../lib/rpc.js';
import {
  USERNAME_REGISTRY_ADDRESS,
  MULTICALL3_ADDRESS,
  isUsernameRegistryConfigured,
} from '../config.js';

export { isUsernameRegistryConfigured };

// See https://github.com/mds1/multicall for the full contract.
export const multicallIface = new Interface([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

// Cap a single aggregate3 call to stay well under RPC eth_call gas limits.
// Typical limits are 30M+ gas; primaryNameOf is ~5k gas per call.
const MAX_BATCH_SIZE = 250;

/**
 * Fetch a single address's primary username.
 * @param {string} address - 0x-prefixed EVM address
 * @returns {Promise<string>} The primary name, or empty string if none
 */
export async function getPrimaryName(address) {
  if (!isUsernameRegistryConfigured() || !address) return '';
  const data = await ethCall({
    to: USERNAME_REGISTRY_ADDRESS,
    data: registryIface.encodeFunctionData('primaryNameOf', [address]),
  });
  const [name] = registryIface.decodeFunctionResult('primaryNameOf', data);
  return name || '';
}

/**
 * Batch-fetch primary usernames for many addresses via Multicall3.
 * Deduplicates input, chunks into MAX_BATCH_SIZE-sized calls, and runs
 * chunks in parallel. Returns a Map keyed by lowercase address.
 * Missing/failed lookups are mapped to empty string.
 *
 * @param {string[]} addresses
 * @returns {Promise<Map<string, string>>} lowercase address → name
 */
export async function getPrimaryNames(addresses) {
  const result = new Map();
  if (!isUsernameRegistryConfigured() || !addresses?.length) return result;

  // Dedupe (lowercase), preserve original checksum for the call encoding
  const unique = new Map();
  for (const addr of addresses) {
    if (!addr) continue;
    const key = addr.toLowerCase();
    if (!unique.has(key)) unique.set(key, addr);
  }
  if (!unique.size) return result;

  const entries = [...unique.entries()];
  const chunks = [];
  for (let i = 0; i < entries.length; i += MAX_BATCH_SIZE) {
    chunks.push(entries.slice(i, i + MAX_BATCH_SIZE));
  }

  const chunkResults = await Promise.all(chunks.map(fetchChunk));
  for (const chunk of chunkResults) {
    for (const [key, name] of chunk) result.set(key, name);
  }

  return result;
}

/**
 * Encode + call Multicall3 aggregate3 for a single chunk of [lowercase, checksum] entries.
 */
async function fetchChunk(entries) {
  const calls = entries.map(([, addr]) => ({
    target: USERNAME_REGISTRY_ADDRESS,
    allowFailure: true,
    callData: registryIface.encodeFunctionData('primaryNameOf', [addr]),
  }));

  const data = await ethCall({
    to: MULTICALL3_ADDRESS,
    data: multicallIface.encodeFunctionData('aggregate3', [calls]),
  });

  const [results] = multicallIface.decodeFunctionResult('aggregate3', data);
  const out = new Map();
  for (let i = 0; i < results.length; i++) {
    const key = entries[i][0];
    const { success, returnData } = results[i];
    if (!success || !returnData || returnData === '0x') {
      out.set(key, '');
      continue;
    }
    try {
      const [name] = registryIface.decodeFunctionResult('primaryNameOf', returnData);
      out.set(key, name || '');
    } catch {
      out.set(key, '');
    }
  }
  return out;
}

/**
 * Fetch the current username mint price in wei.
 * @returns {Promise<bigint>}
 */
export async function getCurrentUsernamePrice() {
  if (!isUsernameRegistryConfigured()) return 0n;
  const data = await ethCall({
    to: USERNAME_REGISTRY_ADDRESS,
    data: registryIface.encodeFunctionData('currentMintPrice', []),
  });
  const [price] = registryIface.decodeFunctionResult('currentMintPrice', data);
  return BigInt(price);
}
