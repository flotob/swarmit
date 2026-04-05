import { describe, it, expect } from 'vitest'
import { bzzToGatewayUrl } from '../../src/protocol/references.js'

// Tests for the library-provided reference helpers (refToHex, hexToBzz, …)
// live in swarmit-protocol. Only the Vue-app-specific bzzToGatewayUrl is
// tested here.

const VALID_HEX = 'a'.repeat(64)
const VALID_BZZ = `bzz://${VALID_HEX}`

describe('bzzToGatewayUrl', () => {
  it('converts bzz:// to /bzz/ path', () => expect(bzzToGatewayUrl(VALID_BZZ)).toBe(`/bzz/${VALID_HEX}/`))
  it('returns non-bzz input unchanged', () => expect(bzzToGatewayUrl('https://example.com')).toBe('https://example.com'))
  it('returns null/undefined unchanged', () => {
    expect(bzzToGatewayUrl(null)).toBeNull()
    expect(bzzToGatewayUrl(undefined)).toBeUndefined()
  })
})
