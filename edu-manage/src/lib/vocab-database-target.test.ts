import { describe, expect, it } from 'vitest'
import { parseLocalEduManageTarget } from './vocab-database-target'

describe('词库导入目标安全检查', () => {
  it('只接受 loopback 上的 edu_manage 数据库', () => {
    expect(parseLocalEduManageTarget('postgresql://user:secret@127.0.0.1:5432/edu_manage')).toMatchObject({
      host: '127.0.0.1',
      database: 'edu_manage',
    })
    expect(parseLocalEduManageTarget('postgresql://user:secret@localhost:5432/edu_manage')).toMatchObject({
      host: 'localhost',
      database: 'edu_manage',
    })
  })

  it.each([
    'postgresql://user:secret@db.example.com:5432/edu_manage',
    'postgresql://user:secret@127.0.0.1:5432/production',
    'not-a-url',
  ])('拒绝非本地或非目标数据库 URL：%s', (url) => {
    expect(() => parseLocalEduManageTarget(url)).toThrow()
  })
})
