/**
 * Read and write the SwarmitUsernameRegistry contract.
 * All reads are feature-guarded — if the registry isn't configured,
 * functions return empty results with no RPC calls. Writes throw.
 */

import { Interface } from 'ethers';
import { iface as registryIface, encode, TOPICS } from 'swarmit-protocol/username-registry';
import { ethCall, getLogs } from '../lib/rpc.js';
import { sendTransaction } from '../lib/ethereum.js';
import {
  USERNAME_REGISTRY_ADDRESS,
  USERNAME_REGISTRY_DEPLOY_BLOCK,
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
 * Call Multicall3.aggregate3 and return the array of { success, returnData } results.
 */
async function multicallAggregate(calls) {
  const data = await ethCall({
    to: MULTICALL3_ADDRESS,
    data: multicallIface.encodeFunctionData('aggregate3', [calls]),
  });
  const [results] = multicallIface.decodeFunctionResult('aggregate3', data);
  return results;
}

/**
 * Decode one aggregate3 result via the registry interface. Returns null on failure.
 */
function decodeResult(result, functionName) {
  if (!result.success || !result.returnData || result.returnData === '0x') return null;
  try {
    return registryIface.decodeFunctionResult(functionName, result.returnData);
  } catch {
    return null;
  }
}

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

  const results = await multicallAggregate(calls);
  const out = new Map();
  for (let i = 0; i < results.length; i++) {
    const decoded = decodeResult(results[i], 'primaryNameOf');
    out.set(entries[i][0], decoded ? decoded[0] || '' : '');
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

/**
 * Enumerate all tokens currently owned by an address.
 * Scans Transfer events (received minus sent), then makes ONE multicall with
 * ownerOf + nameOfToken for each candidate plus primaryTokenOf for the address.
 * Filters locally by current ownership and flags the primary token.
 *
 * @param {string} address
 * @returns {Promise<{ tokens: Array<{ tokenId: bigint, name: string, isPrimary: boolean }> }>}
 */
export async function getOwnedTokens(address) {
  if (!isUsernameRegistryConfigured() || !address) return { tokens: [] };

  const paddedAddr = '0x' + address.slice(2).toLowerCase().padStart(64, '0');

  // Transfer(from, to, tokenId) — topic[2] = to (received), topic[1] = from (sent)
  const [received, sent] = await Promise.all([
    getLogs({
      address: USERNAME_REGISTRY_ADDRESS,
      topics: [TOPICS.Transfer, null, paddedAddr],
      fromBlock: USERNAME_REGISTRY_DEPLOY_BLOCK,
    }),
    getLogs({
      address: USERNAME_REGISTRY_ADDRESS,
      topics: [TOPICS.Transfer, paddedAddr],
      fromBlock: USERNAME_REGISTRY_DEPLOY_BLOCK,
    }),
  ]);

  // tokenId is topic[3] (indexed) in Transfer events
  const candidateIds = new Set(received.map((log) => BigInt(log.topics[3])));
  for (const log of sent) candidateIds.delete(BigInt(log.topics[3]));
  if (!candidateIds.size) return { tokens: [] };

  const idList = [...candidateIds];
  const ownerCalls = idList.map((tokenId) => ({
    target: USERNAME_REGISTRY_ADDRESS,
    allowFailure: true,
    callData: registryIface.encodeFunctionData('ownerOf', [tokenId]),
  }));
  const nameCalls = idList.map((tokenId) => ({
    target: USERNAME_REGISTRY_ADDRESS,
    allowFailure: true,
    callData: registryIface.encodeFunctionData('nameOfToken', [tokenId]),
  }));
  const primaryCall = {
    target: USERNAME_REGISTRY_ADDRESS,
    allowFailure: true,
    callData: registryIface.encodeFunctionData('primaryTokenOf', [address]),
  };

  const results = await multicallAggregate([...ownerCalls, ...nameCalls, primaryCall]);
  const ownerResults = results.slice(0, idList.length);
  const nameResults = results.slice(idList.length, idList.length * 2);
  const primaryDecoded = decodeResult(results[results.length - 1], 'primaryTokenOf');
  const primaryTokenId = primaryDecoded ? primaryDecoded[0] : 0n;

  const tokens = [];
  for (let i = 0; i < idList.length; i++) {
    const ownerDecoded = decodeResult(ownerResults[i], 'ownerOf');
    if (!ownerDecoded) continue;
    if (ownerDecoded[0].toLowerCase() !== address.toLowerCase()) continue;
    const nameDecoded = decodeResult(nameResults[i], 'nameOfToken');
    tokens.push({
      tokenId: idList[i],
      name: nameDecoded ? nameDecoded[0] : '',
      isPrimary: idList[i] === primaryTokenId,
    });
  }

  return { tokens };
}

/**
 * Claim a username. Sends a transaction with `value = maxPriceWei`.
 * The contract charges the actual price and refunds the difference.
 * @param {Object} params
 * @param {string} params.name - validated username (caller is responsible for normalization)
 * @param {bigint} params.maxPriceWei - hard cap on price paid (slippage guard)
 * @returns {Promise<string>} tx hash
 */
export async function claimUsername({ name, maxPriceWei }) {
  if (!isUsernameRegistryConfigured()) throw new Error('Username registry not configured');
  return sendTransaction({
    to: USERNAME_REGISTRY_ADDRESS,
    data: encode.claim({ name, maxPrice: maxPriceWei }),
    value: '0x' + maxPriceWei.toString(16),
  });
}

/**
 * Set a token the caller owns as their primary username.
 * @param {bigint} tokenId
 * @returns {Promise<string>} tx hash
 */
export async function setPrimaryUsername(tokenId) {
  if (!isUsernameRegistryConfigured()) throw new Error('Username registry not configured');
  return sendTransaction({
    to: USERNAME_REGISTRY_ADDRESS,
    data: encode.setPrimaryName({ tokenId }),
  });
}
