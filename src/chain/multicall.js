/**
 * Multicall3 helpers for batching read-only contract calls.
 * Multicall3 lives at the same address on every major EVM chain:
 * https://github.com/mds1/multicall
 */

import { Interface } from 'ethers';
import { ethCall } from '../lib/rpc.js';
import { MULTICALL3_ADDRESS } from '../config.js';

const multicallIface = new Interface([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
]);

// Cap a single aggregate3 call to stay well under RPC eth_call gas limits.
// Typical limits are 30M+ gas; most view functions are a few thousand gas.
export const MAX_BATCH_SIZE = 250;

/**
 * Call Multicall3.aggregate3 and return the array of { success, returnData } results.
 * @param {Array<{ target: string, allowFailure: boolean, callData: string }>} calls
 * @returns {Promise<Array<{ success: boolean, returnData: string }>>}
 */
export async function multicallAggregate(calls) {
  const data = await ethCall({
    to: MULTICALL3_ADDRESS,
    data: multicallIface.encodeFunctionData('aggregate3', [calls]),
  });
  const [results] = multicallIface.decodeFunctionResult('aggregate3', data);
  return results;
}

/**
 * Decode one aggregate3 result via a caller-provided Interface.
 * Returns null on failure (empty data, call reverted, decode threw).
 * @param {{ success: boolean, returnData: string }} result
 * @param {string} functionName
 * @param {Interface} iface
 * @returns {any[] | null}
 */
export function decodeResult(result, functionName, iface) {
  if (!result.success || !result.returnData || result.returnData === '0x') return null;
  try {
    return iface.decodeFunctionResult(functionName, result.returnData);
  } catch {
    return null;
  }
}

/**
 * Split an array into fixed-size chunks. Used for splitting large multicall
 * batches across multiple aggregate3 calls to stay within gas limits.
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Case-insensitive dedup of string values. Returns a Map from lowercase key
 * to the first-seen original value (preserving checksum casing for addresses).
 * Skips null/undefined/empty entries.
 * @param {string[]} values
 * @returns {Map<string, string>}
 */
export function dedupeByLowercase(values) {
  const unique = new Map();
  for (const v of values) {
    if (!v) continue;
    const key = v.toLowerCase();
    if (!unique.has(key)) unique.set(key, v);
  }
  return unique;
}
