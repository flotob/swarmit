/**
 * Contract address, configuration checks, and read helpers for the Vue app.
 * ABI, iface, TOPICS, and BYTES32_ZERO come from swarmit-protocol/chain
 * and are re-exported here so existing imports in events.js etc. keep working.
 */

import { iface, TOPICS, BYTES32_ZERO } from 'swarmit-protocol/chain';
import { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK } from '../config.js';
import { ethCall } from '../lib/rpc.js';

export { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK, iface, TOPICS, BYTES32_ZERO };

const ADDRESS_ZERO = '0x' + '0'.repeat(40);

/**
 * Check if the contract address has been configured (not the placeholder).
 */
export function isContractConfigured() {
  return !!(CONTRACT_ADDRESS && CONTRACT_ADDRESS !== ADDRESS_ZERO);
}

/**
 * Throw if the contract address is still the placeholder.
 * Call this at the entry point of any read or write operation.
 */
export function assertContractConfigured() {
  if (!isContractConfigured()) {
    throw new Error('Contract address not configured — update CONTRACT_ADDRESS in config.js');
  }
}

/**
 * Check if a bytes32 value is the zero sentinel.
 */
export function isZeroBytes32(val) {
  return !val || val === BYTES32_ZERO;
}

/**
 * Read-only contract call. Symmetric with send() in transactions.js.
 * @param {string} functionName - ABI function name
 * @param {any[]} args - Encoded arguments
 * @returns {Promise<Result>} Decoded return values
 */
export async function contractRead(functionName, args) {
  assertContractConfigured();
  const data = await ethCall({
    to: CONTRACT_ADDRESS,
    data: iface.encodeFunctionData(functionName, args),
  });
  return iface.decodeFunctionResult(functionName, data);
}
