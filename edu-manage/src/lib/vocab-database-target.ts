export interface LocalVocabDatabaseTarget {
  host: string
  port: number
  database: string
}

/** The bulk vocabulary importer is deliberately limited to the local dev database. */
export function parseLocalEduManageTarget(connectionString: string): LocalVocabDatabaseTarget {
  let url: URL
  try {
    url = new URL(connectionString)
  } catch {
    throw new Error('词库导入要求有效的本地 edu_manage 数据库连接串。')
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('词库导入只支持 PostgreSQL 本地数据库。')
  }

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const isLoopback = host === '127.0.0.1' || host === 'localhost' || host === '::1'
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, '').split('/')[0] ?? '')
  const port = Number(url.port || 5432)

  if (!isLoopback || database !== 'edu_manage' || port !== 5432) {
    throw new Error('为避免误写生产数据，词库导入仅允许 127.0.0.1:5432/edu_manage。')
  }

  return { host, port, database }
}
