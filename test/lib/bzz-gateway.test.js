import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { bzzToGatewayUrl } from '../../src/protocol/references.js'

// Tests for the library-provided reference helpers (refToHex, hexToBzz, …)
// live in swarmit-protocol. Only the Vue-app-specific bzzToGatewayUrl is
// tested here.

const VALID_HEX = 'a'.repeat(64)
const VALID_BZZ = `bzz://${VALID_HEX}`

describe('bzzToGatewayUrl', () => {
  describe('with window.swarm (Freedom Browser)', () => {
    beforeEach(() => { globalThis.window = { swarm: {} } })
    afterEach(() => { delete globalThis.window })

    it('returns relative /bzz/ path', () => expect(bzzToGatewayUrl(VALID_BZZ)).toBe(`/bzz/${VALID_HEX}/`))
  })

  describe('without window.swarm (gateway mode)', () => {
    beforeEach(() => { globalThis.window = {} })
    afterEach(() => { delete globalThis.window })

    it('returns absolute gateway URL', () =>
      expect(bzzToGatewayUrl(VALID_BZZ)).toMatch(new RegExp(`^https?://[^/]+/bzz/${VALID_HEX}/$`)))
  })

  it('returns non-bzz input unchanged', () => expect(bzzToGatewayUrl('https://example.com')).toBe('https://example.com'))
  it('returns null/undefined unchanged', () => {
    expect(bzzToGatewayUrl(null)).toBeNull()
    expect(bzzToGatewayUrl(undefined)).toBeUndefined()
  })
})
