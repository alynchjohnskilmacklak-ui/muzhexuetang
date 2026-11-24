const utf8Encoder = new TextEncoder()

export function utf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).byteLength
}

/** Truncate without splitting a Unicode code point and keep the result within a UTF-8 byte limit. */
export function truncateUtf8Bytes(value: string, maxBytes: number, suffix = '…'): string {
  const limit = Math.max(0, Math.floor(maxBytes))
  if (utf8ByteLength(value) <= limit) return value
  if (limit === 0) return ''

  const suffixBytes = utf8ByteLength(suffix)
  const includeSuffix = suffixBytes <= limit
  const contentLimit = includeSuffix ? limit - suffixBytes : limit
  let result = ''
  let resultBytes = 0

  for (const character of value) {
    const characterBytes = utf8ByteLength(character)
    if (resultBytes + characterBytes > contentLimit) break
    result += character
    resultBytes += characterBytes
  }

  return `${result.trimEnd()}${includeSuffix ? suffix : ''}`
}
