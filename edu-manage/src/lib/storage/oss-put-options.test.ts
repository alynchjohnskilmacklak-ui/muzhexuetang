import { describe, expect, it } from 'vitest'
import { ossPutOptions } from './oss-put-options'

describe('OSS upload access options', () => {
  it('marks protected application uploads private even when the bucket default is public', () => {
    expect(ossPutOptions(true)).toEqual({
      headers: { 'x-oss-object-acl': 'private' },
    })
  })

  it('leaves the default ACL untouched when an upload is not marked private', () => {
    expect(ossPutOptions(false)).toBeUndefined()
  })
})
