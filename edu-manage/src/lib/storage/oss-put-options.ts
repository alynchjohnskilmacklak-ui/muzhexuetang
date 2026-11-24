export type OssPutOptions = {
  headers: Record<string, string>
}

/** Force access-controlled application uploads to stay private regardless of bucket defaults. */
export function ossPutOptions(privateObject = false): OssPutOptions | undefined {
  return privateObject ? { headers: { 'x-oss-object-acl': 'private' } } : undefined
}
