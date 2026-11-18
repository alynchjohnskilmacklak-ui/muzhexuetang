/** Build arguments without exposing credentials in the process command line. */
export function buildRestoreConnection(dbUrl: string, dumpPath: string) {
  const connection = new URL(dbUrl)
  if (!['postgres:', 'postgresql:'].includes(connection.protocol)) throw new Error('数据库连接协议无效')
  const database = decodeURIComponent(connection.pathname.replace(/^\//, ''))
  if (!connection.hostname || !database || !connection.username) throw new Error('数据库连接配置不完整')
  return {
    targetKey: JSON.stringify([connection.hostname.toLowerCase(), connection.port || '5432', database]),
    args: ['--single-transaction', '--exit-on-error', '--clean', '--if-exists', '--no-owner', '--no-acl',
      '--host', connection.hostname, '--port', connection.port || '5432',
      '--username', decodeURIComponent(connection.username), '--dbname', database, dumpPath],
    env: {
      PGPASSWORD: decodeURIComponent(connection.password),
      ...(connection.searchParams.get('sslmode') ? { PGSSLMODE: connection.searchParams.get('sslmode')! } : {}),
    },
  }
}
