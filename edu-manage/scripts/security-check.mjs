import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.cwd()
const checks = []

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function assertCheck(name, pass, detail = '') {
  checks.push({ name, pass, detail })
}

function isTracked(relativePath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relativePath], { cwd: root, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const middlewarePath = join(root, 'src/middleware.ts')
const proxyPath = join(root, 'src/proxy.ts')
assertCheck('proxy exists', existsSync(proxyPath))
assertCheck('middleware removed for Next 16 proxy convention', !existsSync(middlewarePath))

const proxy = existsSync(proxyPath) ? read('src/proxy.ts') : ''
assertCheck('proxy exports Next proxy handler', /export async function proxy/.test(proxy))
assertCheck('api requests return 401 json when unauthenticated', /NextResponse\.json\(\{\s*error/.test(proxy) && /status:\s*401/.test(proxy))
assertCheck('api sessionMark is checked', /currentSessionToken/.test(proxy) && !/!\s*pathname\.startsWith\(['"]\/api/.test(proxy))

const setup = read('src/app/api/setup/route.ts')
assertCheck('setup disabled in production', /NODE_ENV\s*===\s*['"]production['"]/.test(setup) && /status:\s*404/.test(setup))
assertCheck('setup requires setup token', /SETUP_TOKEN/.test(setup) && /x-setup-token/.test(setup) && /status:\s*403/.test(setup))
assertCheck('setup response does not expose passwords', !/password:\s*['"][^'"]+['"]/.test(setup))

const loginAccounts = read('src/lib/login-accounts.ts')
const leakedAdminPasswordA = String.fromCharCode(114, 101, 110, 48, 51, 49, 50, 49, 51)
const leakedAdminPasswordB = String.fromCharCode(109, 97, 115, 104, 97, 111, 107, 117, 110)
const adminAccountsIdentifier = ['ADMIN', 'ACCOUNTS'].join('_')
const removedTeacherCredentialIdentifier = String.fromCharCode(116, 101, 97, 99, 104, 101, 114, 80, 97, 115, 115, 119, 111, 114, 100)
const pinyinPasswordComparePattern = new RegExp(['password', '\\s*!==\\s*', 'chineseToPinyin'].join(''))
assertCheck('admin hardcoded passwords removed', !loginAccounts.includes(leakedAdminPasswordA) && !loginAccounts.includes(leakedAdminPasswordB) && !loginAccounts.includes(adminAccountsIdentifier))
assertCheck('teacher pinyin password login removed', !loginAccounts.includes(removedTeacherCredentialIdentifier) && !pinyinPasswordComparePattern.test(loginAccounts))
assertCheck('teacher uninitialized account is rejected', /账号未初始化，请联系管理员/.test(loginAccounts))
assertCheck('password verification requires bcrypt hash', /startsWith\(['"]\$2/.test(loginAccounts) && !/storedPassword\s*===\s*plainPassword/.test(loginAccounts))

const uploads = read('src/app/api/uploads/[filename]/route.ts')
assertCheck('uploads require auth', /requireAuthenticatedUser\(\)/.test(uploads))
assertCheck('uploads keep traversal safety', /safeRelativePath/.test(uploads) && /path\.resolve/.test(uploads) && /startsWith\(rootPath/.test(uploads))
assertCheck('uploads are private cached', /private,\s*max-age=86400,\s*immutable/.test(uploads) && /ETag/.test(uploads) && !/public,\s*max-age=31536000,\s*immutable/.test(uploads))

const uploadCreate = read('src/app/api/upload/route.ts')
assertCheck('upload creation validates live session', /requireAuthenticatedUser\(\)/.test(uploadCreate))
assertCheck('upload type and resource ownership are validated', /canUseUploadType/.test(uploadCreate) && /validateUploadAssociations/.test(uploadCreate))
assertCheck('orphan uploads are cleaned after metadata failure', /deleteFile/.test(uploadCreate) && /文件记录保存失败/.test(uploadCreate))

const aiChat = read('src/app/api/ai/chat/route.ts')
assertCheck('ai has per-user rate limit', /rateLimitBuckets/.test(aiChat) && /AI_RATE_LIMIT_PER_MINUTE/.test(aiChat) && /AI_RATE_LIMIT_PER_DAY/.test(aiChat))
assertCheck('ai returns 429 on rate limit', /status:\s*429/.test(aiChat) && /请求过于频繁，请稍后再试/.test(aiChat))

const nextConfig = read('next.config.ts')
assertCheck('security headers configured', /X-Frame-Options/.test(nextConfig) && /X-Content-Type-Options/.test(nextConfig) && /Permissions-Policy/.test(nextConfig) && /object-src 'none'/.test(nextConfig))
assertCheck('hsts production only', /NODE_ENV\s*===\s*['"]production['"]/.test(nextConfig) && /Strict-Transport-Security/.test(nextConfig))

const envSecurity = read('src/lib/env-security.ts')
assertCheck('production environment is validated at startup', existsSync(join(root, 'src/instrumentation.ts')) && /assertProductionSecurityEnv/.test(envSecurity))
assertCheck('production requires HTTPS and strong auth secret', /https:/.test(envSecurity) && /authSecret\.length\s*<\s*32/.test(envSecurity))

const dangerGuard = read('src/lib/danger-guard.ts')
const restoreRoute = read('src/app/api/admin/data-admin/restore/route.ts')
const backupRoute = read('src/app/api/admin/data-admin/backup/route.ts')
const studentExportRoute = read('src/app/api/settings/export/students/route.ts')
const financeExportRoute = read('src/app/api/settings/export/finance/route.ts')
assertCheck('danger confirmation phrase is server controlled',
  /expectedPhrase:\s*string/.test(dangerGuard)
  && !/body\.expectedPhrase/.test(dangerGuard)
  && /assertDangerAuth\(body,\s*['"]恢复并覆盖现有数据['"]\)/.test(restoreRoute))
assertCheck('backup API does not expose server paths',
  /backupId/.test(backupRoute)
  && !/path:\s*dirPath/.test(backupRoute)
  && !/path:\s*backupPath/.test(backupRoute))
assertCheck('sensitive exports are audited and private cached',
  /EXPORT_STUDENTS/.test(studentExportRoute)
  && /EXPORT_FINANCE/.test(financeExportRoute)
  && /no-store, private/.test(studentExportRoute)
  && /no-store, private/.test(financeExportRoute))

// Local development may legitimately contain these files; the security
// boundary is that they must never be committed or included in release tarballs.
assertCheck('root .env is not tracked', !isTracked('.env'))
assertCheck('local sqlite dev.db is not tracked', !isTracked('prisma/dev.db'))

const failed = checks.filter((check) => !check.pass)
for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`)
}

if (failed.length) {
  process.exitCode = 1
}
