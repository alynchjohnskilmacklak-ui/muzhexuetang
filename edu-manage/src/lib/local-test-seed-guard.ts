export function assertLocalTestSeedEnvironment(env: Record<string, string | undefined>) {
  if (env.NODE_ENV === 'production') throw new Error('生产环境禁止写入本地测试数据')
  if (env.ALLOW_LOCAL_TEST_SEED !== '1') throw new Error('仅在明确设置 ALLOW_LOCAL_TEST_SEED=1 后允许写入本地测试数据')
  const url = new URL(env.DATABASE_URL || '')
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)) {
    throw new Error('本地测试种子仅允许连接明确的本机 PostgreSQL，不允许连接远程数据库')
  }
}
