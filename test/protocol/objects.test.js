import { describe, it, expect } from 'vitest'
import { buildPost, buildReply, buildSubmission, buildBoard, buildBoardIndex, buildThreadIndex, buildGlobalIndex, buildUserFeedIndex, buildCuratorProfile, validate } from '../../src/protocol/objects.js'

const VALID_REF = `bzz://${'a'.repeat(64)}`
const AUTHOR = { address: '0x1234567890abcdef1234567890abcdef12345678', userFeed: VALID_REF }

describe('builders produce valid objects', () => {
  it('buildPost', () => {
    const post = buildPost({ author: AUTHOR, title: 'Hello', body: { kind: 'markdown', text: 'World' } })
    const { valid, errors } = validate(post)
    expect(errors).toEqual([])
    expect(valid).toBe(true)
  })

  it('buildPost with attachments', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'With image',
      body: { kind: 'markdown', text: 'See attached' },
      attachments: [{ reference: VALID_REF, contentType: 'image/png', sizeBytes: 12345, kind: 'image' }],
    })
    const { valid, errors } = validate(post)
    expect(errors).toEqual([])
    expect(valid).toBe(true)
    expect(post.attachments).toHaveLength(1)
    expect(post.attachments[0].reference).toBe(VALID_REF)
  })

  it('buildPost without attachments omits the field', () => {
    const post = buildPost({ author: AUTHOR, title: 'No images', body: { kind: 'markdown', text: 'Text only' } })
    expect(post.attachments).toBeUndefined()
  })

  it('buildReply', () => {
    const reply = buildReply({ author: AUTHOR, body: { kind: 'markdown', text: 'Reply' } })
    const { valid } = validate(reply)
    expect(valid).toBe(true)
  })

  it('buildSubmission (post)', () => {
    const sub = buildSubmission({ boardId: 'test', kind: 'post', contentRef: VALID_REF, author: AUTHOR })
    const { valid } = validate(sub)
    expect(valid).toBe(true)
  })

  it('buildSubmission (reply)', () => {
    const sub = buildSubmission({ boardId: 'test', kind: 'reply', contentRef: VALID_REF, author: AUTHOR, parentSubmissionId: VALID_REF, rootSubmissionId: VALID_REF })
    const { valid } = validate(sub)
    expect(valid).toBe(true)
  })

  it('buildBoard', () => {
    const board = buildBoard({ slug: 'test', title: 'Test', description: 'Desc', governance: { chainId: 100, type: 'eoa', address: '0x1' } })
    const { valid } = validate(board)
    expect(valid).toBe(true)
  })

  it('buildBoardIndex', () => {
    const idx = buildBoardIndex({ boardId: 'test', curator: '0x1', entries: [{ submissionId: VALID_REF, submissionRef: VALID_REF }] })
    const { valid } = validate(idx)
    expect(valid).toBe(true)
  })

  it('buildThreadIndex', () => {
    const idx = buildThreadIndex({ rootSubmissionId: VALID_REF, curator: '0x1', nodes: [{ submissionId: VALID_REF, parentSubmissionId: null, depth: 0 }] })
    const { valid } = validate(idx)
    expect(valid).toBe(true)
  })

  it('buildGlobalIndex', () => {
    const idx = buildGlobalIndex({ curator: '0x1', entries: [{ boardId: 'test', submissionId: VALID_REF, submissionRef: VALID_REF }] })
    const { valid } = validate(idx)
    expect(valid).toBe(true)
  })

  it('buildUserFeedIndex', () => {
    const idx = buildUserFeedIndex({ author: '0x1', entries: [{ submissionId: VALID_REF, submissionRef: VALID_REF, boardId: 'test', kind: 'post', createdAt: Date.now() }] })
    const { valid } = validate(idx)
    expect(valid).toBe(true)
  })

  it('buildCuratorProfile', () => {
    const p = buildCuratorProfile({ curator: '0x1', name: 'Test', description: 'Desc', globalIndexFeed: VALID_REF })
    const { valid } = validate(p)
    expect(valid).toBe(true)
  })
})

describe('validation catches errors', () => {
  it('rejects missing protocol', () => {
    const { valid } = validate({ foo: 'bar' })
    expect(valid).toBe(false)
  })

  it('rejects bare hex refs in submission', () => {
    const sub = buildSubmission({ boardId: 'test', kind: 'post', contentRef: 'a'.repeat(64), author: AUTHOR })
    const { valid, errors } = validate(sub)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('bzz://'))).toBe(true)
  })

  it('rejects reply without parent/root', () => {
    const sub = buildSubmission({ boardId: 'test', kind: 'reply', contentRef: VALID_REF, author: AUTHOR })
    const { valid } = validate(sub)
    expect(valid).toBe(false)
  })

  it('rejects post with parentSubmissionId', () => {
    const sub = buildSubmission({ boardId: 'test', kind: 'post', contentRef: VALID_REF, author: AUTHOR, parentSubmissionId: VALID_REF, rootSubmissionId: VALID_REF })
    // buildSubmission doesn't add parent/root for posts, but if we manually add it:
    sub.parentSubmissionId = VALID_REF
    const { valid } = validate(sub)
    expect(valid).toBe(false)
  })

  it('rejects boardIndex with malformed entries', () => {
    const idx = buildBoardIndex({ boardId: 'test', curator: '0x1', entries: [{}] })
    const { valid } = validate(idx)
    expect(valid).toBe(false)
  })

  it('rejects post with invalid attachment reference', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Bad attachment',
      body: { kind: 'markdown', text: 'Test' },
      attachments: [{ reference: 'not-a-ref', contentType: 'image/png' }],
    })
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('attachments[0].reference'))).toBe(true)
  })

  it('rejects post with attachment missing contentType', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Missing type',
      body: { kind: 'markdown', text: 'Test' },
      attachments: [{ reference: VALID_REF }],
    })
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('contentType'))).toBe(true)
  })

  it('rejects post with non-array attachments', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Bad type',
      body: { kind: 'markdown', text: 'Test' },
    })
    post.attachments = 'not-an-array'
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('must be an array'))).toBe(true)
  })

  it('passes post with valid attachments', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Good attachment',
      body: { kind: 'markdown', text: 'Test' },
      attachments: [{ reference: VALID_REF, contentType: 'image/png', sizeBytes: 100, kind: 'image', name: 'test.png' }],
    })
    const { valid } = validate(post)
    expect(valid).toBe(true)
  })

  // Link post tests
  it('validates link-only post', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Link post',
      link: { url: 'https://example.com/article' },
    })
    const { valid, errors } = validate(post)
    expect(errors).toEqual([])
    expect(valid).toBe(true)
    expect(post.body).toBeUndefined()
  })

  it('validates link+body post', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Link with commentary',
      link: { url: 'https://example.com' },
      body: { kind: 'markdown', text: 'My thoughts on this' },
    })
    const { valid } = validate(post)
    expect(valid).toBe(true)
  })

  it('validates link post with preview hints', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'With preview',
      link: {
        url: 'https://example.com',
        title: 'Example',
        description: 'A description',
        siteName: 'Example.com',
        thumbnailRef: VALID_REF,
      },
    })
    const { valid } = validate(post)
    expect(valid).toBe(true)
  })

  it('validates attachment-only post (no body)', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Media only',
      attachments: [{ reference: VALID_REF, contentType: 'image/png', kind: 'image' }],
    })
    const { valid } = validate(post)
    expect(valid).toBe(true)
    expect(post.body).toBeUndefined()
  })

  it('rejects post with none of body/link/attachments', () => {
    const post = buildPost({ author: AUTHOR, title: 'Empty post' })
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('at least one of'))).toBe(true)
  })

  it('rejects link post with invalid URL', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Bad link',
      link: { url: 'ftp://example.com' },
    })
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('http'))).toBe(true)
  })

  it('rejects link post with missing URL', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'No URL',
      link: { title: 'Something' },
    })
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('link.url'))).toBe(true)
  })

  it('rejects link post with invalid thumbnailRef', () => {
    const post = buildPost({
      author: AUTHOR,
      title: 'Bad thumbnail',
      link: { url: 'https://example.com', thumbnailRef: 'not-a-ref' },
    })
    const { valid, errors } = validate(post)
    expect(valid).toBe(false)
    expect(errors.some(e => e.includes('thumbnailRef'))).toBe(true)
  })

  it('reply without body is still invalid', () => {
    const reply = { protocol: 'freedom-board/reply/v1', author: AUTHOR, createdAt: Date.now() }
    const { valid } = validate(reply)
    expect(valid).toBe(false)
  })
})
