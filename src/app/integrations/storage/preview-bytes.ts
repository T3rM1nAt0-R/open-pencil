/**
 * Previews this small hold no drawing: a .fig saved without a rendered cover embeds a blank
 * placeholder of about 70 bytes, which would otherwise stand in for a real preview forever.
 */
export const MIN_PREVIEW_BYTES = 256

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte)
}

/** The image type the bytes really are, whatever key or header they came under. */
export function previewMimeType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png'
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'image/jpeg'
  return null
}

/** The bytes when they are a real PNG or JPEG preview; null when missing, blank or not an image. */
export function usablePreview(bytes: Uint8Array | null | undefined): Uint8Array | null {
  if (!bytes || bytes.byteLength < MIN_PREVIEW_BYTES) return null
  return previewMimeType(bytes) ? bytes : null
}
