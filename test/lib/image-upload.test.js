import { describe, it, expect } from 'vitest'
import { validateImage, buildAttachmentDescriptor, ALLOWED_TYPES, MAX_SIZE_BYTES } from '../../src/lib/image-upload.js'

describe('validateImage', () => {
  function makeFile(type, size) {
    return { type, size, name: 'test.png' }
  }

  it('accepts valid PNG', () => {
    expect(validateImage(makeFile('image/png', 1000))).toBeNull()
  })

  it('accepts valid JPEG', () => {
    expect(validateImage(makeFile('image/jpeg', 1000))).toBeNull()
  })

  it('accepts valid GIF', () => {
    expect(validateImage(makeFile('image/gif', 1000))).toBeNull()
  })

  it('accepts valid WebP', () => {
    expect(validateImage(makeFile('image/webp', 1000))).toBeNull()
  })

  it('rejects unsupported MIME type', () => {
    const err = validateImage(makeFile('image/svg+xml', 1000))
    expect(err).toContain('Unsupported format')
  })

  it('rejects non-image MIME type', () => {
    const err = validateImage(makeFile('application/pdf', 1000))
    expect(err).toContain('Unsupported format')
  })

  it('rejects empty MIME type', () => {
    const err = validateImage(makeFile('', 1000))
    expect(err).toContain('Unsupported format')
  })

  it('rejects file over 5MB', () => {
    const err = validateImage(makeFile('image/png', MAX_SIZE_BYTES + 1))
    expect(err).toContain('too large')
  })

  it('accepts file exactly at 5MB limit', () => {
    expect(validateImage(makeFile('image/png', MAX_SIZE_BYTES))).toBeNull()
  })

  it('rejects null file', () => {
    expect(validateImage(null)).toContain('No file')
  })
})

describe('buildAttachmentDescriptor', () => {
  it('builds a valid descriptor', () => {
    const file = { type: 'image/png', size: 12345, name: 'photo.png' }
    const desc = buildAttachmentDescriptor({ bzzUrl: `bzz://${'a'.repeat(64)}`, file })

    expect(desc.reference).toBe(`bzz://${'a'.repeat(64)}`)
    expect(desc.contentType).toBe('image/png')
    expect(desc.sizeBytes).toBe(12345)
    expect(desc.name).toBe('photo.png')
    expect(desc.kind).toBe('image')
  })

  it('omits name when file has no name', () => {
    const file = { type: 'image/jpeg', size: 100, name: '' }
    const desc = buildAttachmentDescriptor({ bzzUrl: `bzz://${'b'.repeat(64)}`, file })
    expect(desc.name).toBeUndefined()
  })
})
