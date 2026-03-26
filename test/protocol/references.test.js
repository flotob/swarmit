import { describe, it, expect } from 'vitest'
import { refToHex, hexToBzz, isValidRef, isValidBzzRef, hexToBytes32, bytes32ToHex, refToBytes32, bytes32ToRef, slugToBoardId, bzzToGatewayUrl } from '../../src/protocol/references.js'

const VALID_HEX = 'a'.repeat(64)
const VALID_BZZ = `bzz://${'a'.repeat(64)}`

describe('refToHex', () => {
  it('extracts hex from bare hex', () => expect(refToHex(VALID_HEX)).toBe(VALID_HEX))
  it('strips bzz:// prefix', () => expect(refToHex(VALID_BZZ)).toBe(VALID_HEX))
  it('lowercases', () => expect(refToHex('A'.repeat(64))).toBe('a'.repeat(64)))
  it('rejects too short', () => expect(refToHex('abc')).toBe(''))
  it('rejects paths', () => expect(refToHex(`bzz://${'a'.repeat(64)}/path`)).toBe(''))
  it('rejects null', () => expect(refToHex(null)).toBe(''))
  it('rejects non-hex', () => expect(refToHex('g'.repeat(64))).toBe(''))
})

describe('hexToBzz', () => {
  it('normalizes bare hex', () => expect(hexToBzz(VALID_HEX)).toBe(VALID_BZZ))
  it('normalizes bzz://', () => expect(hexToBzz(VALID_BZZ)).toBe(VALID_BZZ))
  it('returns empty for invalid', () => expect(hexToBzz('bad')).toBe(''))
})

describe('isValidRef', () => {
  it('accepts bare hex', () => expect(isValidRef(VALID_HEX)).toBe(true))
  it('accepts bzz://', () => expect(isValidRef(VALID_BZZ)).toBe(true))
  it('rejects garbage', () => expect(isValidRef('nope')).toBe(false))
})

describe('isValidBzzRef', () => {
  it('accepts lowercase bzz://', () => expect(isValidBzzRef(VALID_BZZ)).toBe(true))
  it('rejects bare hex', () => expect(isValidBzzRef(VALID_HEX)).toBe(false))
  it('rejects uppercase', () => expect(isValidBzzRef(`bzz://${'A'.repeat(64)}`)).toBe(false))
})

describe('hexToBytes32 / bytes32ToHex', () => {
  it('round-trips', () => {
    const b32 = hexToBytes32(VALID_HEX)
    expect(b32).toBe(`0x${VALID_HEX}`)
    expect(bytes32ToHex(b32)).toBe(VALID_HEX)
  })
})

describe('refToBytes32 / bytes32ToRef', () => {
  it('round-trips from bzz', () => {
    const b32 = refToBytes32(VALID_BZZ)
    expect(bytes32ToRef(b32)).toBe(VALID_BZZ)
  })
})

describe('slugToBoardId', () => {
  it('produces deterministic hash', () => {
    const id1 = slugToBoardId('test')
    const id2 = slugToBoardId('test')
    expect(id1).toBe(id2)
    expect(id1.startsWith('0x')).toBe(true)
    expect(id1.length).toBe(66) // 0x + 64 hex
  })
  it('throws for empty', () => expect(() => slugToBoardId('')).toThrow())
})

describe('bzzToGatewayUrl', () => {
  it('converts bzz:// to /bzz/ path', () => expect(bzzToGatewayUrl(VALID_BZZ)).toBe(`/bzz/${VALID_HEX}/`))
  it('returns non-bzz input unchanged', () => expect(bzzToGatewayUrl('https://example.com')).toBe('https://example.com'))
  it('returns null/undefined unchanged', () => {
    expect(bzzToGatewayUrl(null)).toBeNull()
    expect(bzzToGatewayUrl(undefined)).toBeUndefined()
  })
})
