/**
 * Shared test helpers for chain-layer multicall tests.
 */

import { Interface } from 'ethers'

const multicallIface = new Interface([
  'function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[] returnData)',
])

/**
 * Encode a fake Multicall3.aggregate3 return value for mocking ethCall.
 * @param {Array<[boolean, string]>} results - array of [success, returnData] tuples
 */
export function encodeAggregate3Return(results) {
  return multicallIface.encodeFunctionResult('aggregate3', [results])
}

/**
 * Decode an aggregate3 calldata payload to inspect the calls array in assertions.
 */
export function decodeAggregate3Calldata(data) {
  return multicallIface.decodeFunctionData('aggregate3', data)
}
