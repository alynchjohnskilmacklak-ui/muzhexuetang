type RuntimeEnv = Record<string, string | undefined>

function isExplicitLocalDockerRuntime(env: RuntimeEnv): boolean {
  if (env.APP_RUNTIME_MODE !== 'local-docker') return false

  try {
    const siteUrl = new URL(env.NEXTAUTH_URL || '')
    const databaseUrl = new URL(env.DATABASE_URL || '')
    const isLoopbackSite = siteUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(siteUrl.hostname)
    const isLocalDatabase = ['host.docker.internal', 'localhost', '127.0.0.1'].includes(databaseUrl.hostname)

    return isLoopbackSite && isLocalDatabase
  } catch {
    return false
  }
}

export function productionSecurityEnvErrors(env: RuntimeEnv): string[] {
  if (
    env.NODE_ENV !== 'production' ||
    env.NEXT_PHASE === 'phase-production-build' ||
    isExplicitLocalDockerRuntime(env)
  ) return []

  const errors: string[] = []
  const authSecret = env.AUTH_SECRET || env.NEXTAUTH_SECRET || ''

  if (authSecret.length < 32) {
    errors.push('AUTH_SECRET/NEXTAUTH_SECRET 必须至少 32 个字符')
  }
  if (env.AUTH_SECRET && env.NEXTAUTH_SECRET && env.AUTH_SECRET !== env.NEXTAUTH_SECRET) {
    errors.push('AUTH_SECRET 与 NEXTAUTH_SECRET 必须保持一致')
  }

  try {
    const siteUrl = new URL(env.NEXTAUTH_URL || '')
    if (siteUrl.protocol !== 'https:') errors.push('NEXTAUTH_URL 必须使用 HTTPS')
  } catch {
    errors.push('NEXTAUTH_URL 必须是有效的公网 HTTPS 地址')
  }

  if (!env.DATABASE_URL_JUNIOR) errors.push('DATABASE_URL_JUNIOR 未配置')
  if (!env.DATABASE_URL_SENIOR) errors.push('DATABASE_URL_SENIOR 未配置')

  return errors
}

export function assertProductionSecurityEnv(env: RuntimeEnv = process.env): void {
  const errors = productionSecurityEnvErrors(env)
  if (errors.length > 0) {
    throw new Error(`生产环境安全配置检查失败：${errors.join('；')}`)
  }
}

