/**
 * Thin re-exports from vendored ethers.js v6.
 * Only import what we actually need to keep the dependency surface small.
 */

import {
  AbiCoder,
  Interface,
  keccak256,
  toUtf8Bytes,
  hexlify,
  getBytes,
  zeroPadValue,
  dataSlice,
} from '../../vendor/ethers.js';

export { AbiCoder, Interface, keccak256, toUtf8Bytes, hexlify, getBytes, zeroPadValue, dataSlice };

const coder = AbiCoder.defaultAbiCoder();

/**
 * ABI-encode values.
 * @param {string[]} types
 * @param {any[]} values
 * @returns {string} hex-encoded data
 */
export function encode(types, values) {
  return coder.encode(types, values);
}

/**
 * ABI-decode data.
 * @param {string[]} types
 * @param {string} data
 * @returns {any[]}
 */
export function decode(types, data) {
  return coder.decode(types, data);
}
