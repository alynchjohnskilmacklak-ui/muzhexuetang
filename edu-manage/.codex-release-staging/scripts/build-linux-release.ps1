<#
.SYNOPSIS
  本机一键构建 Linux x64 预发布包（Docker 容器内构建，与服务器 Ubuntu/Node 22 完全一致）

.DESCRIPTION
  流程：Windows 源码（只读挂载）→ Docker Linux Node 22 容器
       → npm ci → prisma generate → Next.js production build
       → 组装 standalone 运行目录 → 输出 release\edu-manage-runtime-<日期>.tar.gz

  服务器部署（免安装、免构建）:
      scp ".\release\edu-manage-runtime-xxx.tar.gz" root@服务器IP:/tmp/
      cd /opt/edu-manage
      bash scripts/deploy-prebuilt-tar.sh /tmp/edu-manage-runtime-xxx.tar.gz

  说明：
  - 构建全程在 Linux 容器内进行，源码通过只读挂载传入，产物只写 release\ 目录，
    不污染 Windows 的 node_modules / .next。
  - 使用容器内 tar 复制源码，规避 Docker Desktop (WSL2) 构建上下文偶发丢失文件的问题。
  - 容器内安装 openssl，保证 Prisma 引擎的 libssl 绑定与服务器 Ubuntu 一致。

.PARAMETER Registry
  npm registry 镜像地址，如 https://registry.npmmirror.com（默认官方 registry，国内网络建议使用镜像）

.PARAMETER KeepLocalReleases
  本机 release 目录保留的完整发布包数量，默认 2 个。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1 -Registry https://registry.npmmirror.com
#>
param(
  [string]$Registry = "",
  [ValidateRange(1, 10)]
  [int]$KeepLocalReleases = 2
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ReleaseDir  = Join-Path $ProjectRoot 'release'
$InnerSh     = Join-Path $ProjectRoot 'tmp\build-inner.sh'
$TarName     = "edu-manage-runtime-$(Get-Date -Format 'yyyyMMdd-HHmm').tar.gz"
$NodeImage   = 'node:22-bookworm-slim'
$ReleaseId   = [System.IO.Path]::GetFileNameWithoutExtension([System.IO.Path]::GetFileNameWithoutExtension($TarName)).Replace('edu-manage-runtime-', '')
$SourceCommit = (& git -C $ProjectRoot rev-parse --short=12 HEAD 2>$null)
if (-not $SourceCommit) { $SourceCommit = 'unknown' }

# Docker Desktop may be installed system-wide or per-user.  A terminal that
# was opened before Docker was reinstalled can retain a stale PATH, so resolve
# the executable explicitly instead of assuming `docker` is discoverable.
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerCandidates = @(
  if ($dockerCommand) { $dockerCommand.Source }
  (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe')
  (Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin\docker.exe')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique
$DockerExe = $dockerCandidates | Select-Object -First 1

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " edu-manage Linux 预构建（Docker 容器内）" -ForegroundColor Cyan
Write-Host " 项目: $ProjectRoot" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ---- [1/4] 检查 Docker 引擎 ----
Write-Host "==> [1/4] 检查 Docker 引擎" -ForegroundColor Cyan
if (-not $DockerExe) {
  Write-Host "[错误] 找不到 docker.exe。请确认 Docker Desktop 已完整安装" -ForegroundColor Red
  exit 1
}
& $DockerExe info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[错误] Docker 引擎未运行，请先启动 Docker Desktop 并等待引擎就绪" -ForegroundColor Red
  exit 1
}
$dockerVer = & $DockerExe version --format '{{.Server.Version}}'
Write-Host "   Docker 引擎 v$dockerVer 就绪"
Write-Host "   Docker CLI: $DockerExe"

if (-not (Test-Path (Join-Path $ProjectRoot 'package-lock.json'))) {
  Write-Host "[错误] 缺少 package-lock.json" -ForegroundColor Red
  exit 1
}

# ---- [2/4] 准备输出目录（保留旧版本，便于回滚） ----
Write-Host "==> [2/4] 准备输出目录 $ReleaseDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path $InnerSh -Parent) -Force | Out-Null

# ---- [3/4] 生成容器内构建脚本并执行 ----
Write-Host "==> [3/4] 容器内构建（Linux Node 22，首次约 8-15 分钟）" -ForegroundColor Cyan
if ($Registry) { Write-Host "   npm registry: $Registry" } else { Write-Host "   npm registry: 官方（国内网络慢时可加 -Registry https://registry.npmmirror.com）" }

$registryLine = if ($Registry) { "npm config set registry $Registry" } else { "true" }

$inner = @'
#!/usr/bin/env bash
set -e
echo "== [1/8] 容器准备：安装 openssl（Prisma 引擎 libssl 绑定需要）=="
apt-get update >/dev/null 2>&1
apt-get install -y --no-install-recommends openssl ca-certificates >/dev/null 2>&1
rm -rf /var/lib/apt/lists/*
echo "== [2/8] 复制源码到容器工作区 =="
cd /src
tar -cf /tmp/src.tar --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./release --exclude=./tmp --exclude=./docs --exclude=./outputs --exclude=./output --exclude=./cachenpm --exclude=./flyer-reference --exclude=./.agents --exclude=./.claude --exclude=./.impeccable --exclude=./.review --exclude=./.env --exclude=./.env.* --exclude='./.codex-dev*' --exclude='*.tar' --exclude='*.tar.gz' --exclude='*.zip' --exclude='*.log' --exclude='*.db' --exclude='*.db-journal' --exclude='*.pem' --exclude='*.tsbuildinfo' .
mkdir -p /w
cd /w
tar -xf /tmp/src.tar
echo "== [3/8] npm ci =="
__REGISTRY_LINE__
npm ci --no-audit --no-fund 2>&1 | tail -1
echo "== [4/8] prisma generate + next build =="
export DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder'
export PRISMA_ENGINES_MIRROR='https://registry.npmmirror.com/-/binary/prisma'
npx prisma generate
npm run build

echo "== [5/8] 准备独立 Prisma 迁移工具 =="
PRISMA_VERSION="$(node -p "require('./node_modules/prisma/package.json').version")"
mkdir -p /prisma-tools
npm install --prefix /prisma-tools --no-package-lock --no-save --no-audit --no-fund --omit=optional "prisma@$PRISMA_VERSION" >/dev/null

echo "== [6/8] 组装精简 standalone 运行目录 =="
mkdir -p /assemble
cp -a .next/standalone/. /assemble/
mkdir -p /assemble/.next
rm -rf /assemble/.next/static
cp -a .next/static /assemble/.next/static

# Next standalone does not need the complete development node_modules tree.
# It already contains the traced runtime dependencies.  Only public runtime
# assets are copied here; server-managed directories are linked from shared/
# by deploy-prebuilt-tar.sh and must never be overwritten by a release.
rm -rf /assemble/public
mkdir -p /assemble/public
tar -C public -cf - \
  --exclude='./uploads' \
  --exclude='./services' \
  --exclude='./marketing' \
  --exclude='./business-assets' \
  --exclude='./volunteer/docs' \
  . | tar -C /assemble/public -xf -

mkdir -p /assemble/prisma /assemble/scripts
cp -a prisma/schema.prisma /assemble/prisma/
cp -a prisma/migrations /assemble/prisma/
cp -a scripts/backup-db.sh /assemble/scripts/
cp -a scripts/migrate-all.sh /assemble/scripts/
cp -a scripts/deploy-prebuilt-tar.sh /assemble/scripts/
cp -a package.json /assemble/
cp -a /prisma-tools /assemble/.deploy-tools
printf '{\n  "releaseId": "%s",\n  "sourceCommit": "%s",\n  "node": "%s",\n  "next": "%s",\n  "prisma": "%s",\n  "builtAt": "%s"\n}\n' \
  "$RELEASE_ID" \
  "$SOURCE_COMMIT" \
  "$(node -v)" \
  "$(node -p "require('./node_modules/next/package.json').version")" \
  "$PRISMA_VERSION" \
  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" > /assemble/release-manifest.json

echo "== [7/8] Linux 容器内启动冒烟检查 =="
cd /assemble
export NODE_ENV=production
export PORT=3100
export HOSTNAME=127.0.0.1
export NEXTAUTH_URL=https://example.com
export AUTH_URL=https://example.com
export AUTH_SECRET=0123456789abcdef0123456789abcdef
export DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder
export DATABASE_URL_JUNIOR=postgresql://placeholder:placeholder@127.0.0.1:5432/junior
export DATABASE_URL_SENIOR=postgresql://placeholder:placeholder@127.0.0.1:5432/senior
node server.js >/tmp/release-smoke.log 2>&1 &
APP_PID=$!
SMOKE_OK=0
for _ in $(seq 1 40); do
  if node -e "fetch('http://127.0.0.1:3100/login').then(r => { if (!r.ok) process.exit(1) })" 2>/dev/null; then
    SMOKE_OK=1
    break
  fi
  sleep 0.25
done
kill "$APP_PID" 2>/dev/null || true
wait "$APP_PID" 2>/dev/null || true
if [ "$SMOKE_OK" != "1" ]; then
  cat /tmp/release-smoke.log >&2
  echo "Linux runtime smoke test failed" >&2
  exit 1
fi
echo "   /login health check passed"

echo "== [8/8] 打包 =="
tar -czf /out/__TARNAME__ -C /assemble .
ls -lh /out/__TARNAME__
echo "BUILD_OK"
'@
$inner = $inner.Replace('__REGISTRY_LINE__', $registryLine).Replace('__TARNAME__', $TarName)
[System.IO.File]::WriteAllText($InnerSh, $inner.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))

$srcMount = ($ProjectRoot -replace '\\', '/') + ':/src:ro'
$outMount = ($ReleaseDir -replace '\\', '/') + ':/out'
$shMount  = ($InnerSh -replace '\\', '/') + ':/inner.sh:ro'

& $DockerExe run --rm -e "RELEASE_ID=$ReleaseId" -e "SOURCE_COMMIT=$SourceCommit" -v $srcMount -v $outMount -v $shMount $NodeImage bash /inner.sh
if ($LASTEXITCODE -ne 0) {
  Write-Host "[错误] 容器内构建失败，请查看上方日志" -ForegroundColor Red
  exit 1
}

# ---- [4/4] 检查产物 ----
$tarPath = Join-Path $ReleaseDir $TarName
if (-not (Test-Path $tarPath)) {
  Write-Host "[错误] 未找到构建产物 $TarName" -ForegroundColor Red
  exit 1
}
$sizeMB = [math]::Round((Get-Item $tarPath).Length / 1MB, 1)
$hash = (Get-FileHash -LiteralPath $tarPath -Algorithm SHA256).Hash.ToLowerInvariant()
$shaPath = "$tarPath.sha256"
[System.IO.File]::WriteAllText($shaPath, "$hash  $TarName`n", (New-Object System.Text.UTF8Encoding($false)))

$archiveEntries = & tar -tzf $tarPath
$requiredEntries = @(
  './server.js',
  './release-manifest.json',
  './prisma/schema.prisma',
  './scripts/backup-db.sh',
  './scripts/migrate-all.sh',
  './scripts/deploy-prebuilt-tar.sh'
)
$missingEntries = @($requiredEntries | Where-Object { $archiveEntries -notcontains $_ })
if ($LASTEXITCODE -ne 0 -or $missingEntries.Count -gt 0) {
  if ($missingEntries.Count -gt 0) {
    Write-Host "[错误] 安装包缺少: $($missingEntries -join ', ')" -ForegroundColor Red
  }
  Write-Host "[错误] 产物完整性检查失败" -ForegroundColor Red
  exit 1
}
$forbiddenEntries = @($archiveEntries | Where-Object {
  $_ -match '^\./public/(uploads|services|marketing|business-assets|volunteer/docs)/' `
    -or $_ -match '^\./public/public/' `
    -or $_ -match '^\./node_modules/typescript/' `
    -or $_ -match '^\./prisma/(dev\.db|seed\.ts|cleanup-test-data\.ts)' `
    -or ($_ -match '^\./scripts/[^/]+$' -and $_ -notmatch '^\./scripts/(backup-db\.sh|migrate-all\.sh|deploy-prebuilt-tar\.sh)$')
})
if ($forbiddenEntries.Count -gt 0) {
  Write-Host "[错误] 产物包含共享数据、开发依赖或非生产脚本" -ForegroundColor Red
  $forbiddenEntries | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  exit 1
}

Remove-Item -LiteralPath $InnerSh -Force -ErrorAction SilentlyContinue

# 新包完整生成后才清理旧包。本机仅保留最近版本用于快速重传；
# 服务器端由 deploy-prebuilt-tar.sh 独立保留最近 5 个已部署版本。
$releaseArchives = @(Get-ChildItem -LiteralPath $ReleaseDir -File -Filter 'edu-manage-runtime-*.tar.gz' | Sort-Object LastWriteTime -Descending)
foreach ($oldArchive in ($releaseArchives | Select-Object -Skip $KeepLocalReleases)) {
  Remove-Item -LiteralPath $oldArchive.FullName -Force
  Remove-Item -LiteralPath "$($oldArchive.FullName).sha256" -Force -ErrorAction SilentlyContinue
}
Get-ChildItem -LiteralPath $ReleaseDir -File -Filter 'edu-manage-runtime-*.tar.gz.sha256' | ForEach-Object {
  $pairedArchive = $_.FullName.Substring(0, $_.FullName.Length - '.sha256'.Length)
  if (-not (Test-Path -LiteralPath $pairedArchive)) {
    Remove-Item -LiteralPath $_.FullName -Force
  }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host " 构建完成 ✓" -ForegroundColor Green
Write-Host "  产物: release\$TarName  ($sizeMB MB)" -ForegroundColor Green
Write-Host "  校验: release\$TarName.sha256" -ForegroundColor Green
Write-Host "  SHA256: $hash" -ForegroundColor Green
Write-Host "  本地保留: 最近 $KeepLocalReleases 个完整发布包" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步上传:" -ForegroundColor Yellow
Write-Host "  scp `".\release\$TarName`" root@<服务器IP>:/tmp/" -ForegroundColor White
Write-Host "  scp `".\release\$TarName.sha256`" root@<服务器IP>:/tmp/" -ForegroundColor White
Write-Host ""
Write-Host "服务器部署（免安装、免构建）:" -ForegroundColor Yellow
Write-Host "  cd /opt/edu-manage" -ForegroundColor White
Write-Host "  bash scripts/deploy-prebuilt-tar.sh /tmp/$TarName" -ForegroundColor White
Write-Host ""
