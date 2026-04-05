import { ZeroAddress } from 'ethers';
import { BYTES32_ZERO } from 'swarmit-protocol/chain';
import { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK } from '../config.js';
import { ethCall } from '../lib/rpc.js';
import { iface } from 'swarmit-protocol/chain';

export { CONTRACT_ADDRESS, CONTRACT_DEPLOY_BLOCK };

export function isContractConfigured() {
  return typeof CONTRACT_ADDRESS === 'string' && CONTRACT_ADDRESS !== ZeroAddress;
}

export function assertContractConfigured() {
  if (!isContractConfigured()) {
    throw new Error('Contract address not configured — update CONTRACT_ADDRESS in config.js');
  }
}

export function isZeroBytes32(val) {
  return !val || val === BYTES32_ZERO;
}

/**
 * Read-only contract call. Symmetric with sendCalldata() in transactions.js.
 */
export async function contractRead(functionName, args) {
  assertContractConfigured();
  const data = await ethCall({
    to: CONTRACT_ADDRESS,
    data: iface.encodeFunctionData(functionName, args),
  });
  return iface.decodeFunctionResult(functionName, data);
}
