/**
 * Image upload validation constants and helpers.
 */

export const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
export const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Validate a File for image upload.
 * @param {File} file
 * @returns {string|null} Error message, or null if valid.
 */
export function validateImage(file) {
  if (!file) return 'No file provided'
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported format: ${file.type || 'unknown'}. Use PNG, JPEG, GIF, or WebP.`
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 5MB.`
  }
  return null
}

/**
 * Build an attachment descriptor from an uploaded image.
 * @param {{ bzzUrl: string, file: File }} params
 * @returns {object} AttachmentDescriptor per v1 spec
 */
export function buildAttachmentDescriptor({ bzzUrl, file }) {
  return {
    reference: bzzUrl,
    contentType: file.type,
    sizeBytes: file.size,
    name: file.name || undefined,
    kind: 'image',
  }
}
