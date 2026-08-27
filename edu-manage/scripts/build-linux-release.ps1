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

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\build-linux-release.ps1 -Registry https://registry.npmmirror.com
#>
param(
  [string]$Registry = ""
)

$ErrorActionPreference = 'Stop'

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ReleaseDir  = Join-Path $ProjectRoot 'release'
$InnerSh     = Join-Path $ProjectRoot 'tmp\build-inner.sh'
$TarName     = "edu-manage-runtime-$(Get-Date -Format 'yyyyMMdd-HHmm').tar.gz"
$NodeImage   = 'node:22-bookworm-slim'

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " edu-manage Linux 预构建（Docker 容器内）" -ForegroundColor Cyan
Write-Host " 项目: $ProjectRoot" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# ---- [1/4] 检查 Docker 引擎 ----
Write-Host "==> [1/4] 检查 Docker 引擎" -ForegroundColor Cyan
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[错误] Docker 引擎未运行，请先启动 Docker Desktop 并等待引擎就绪" -ForegroundColor Red
  exit 1
}
$dockerVer = docker version --format '{{.Server.Version}}'
Write-Host "   Docker 引擎 v$dockerVer 就绪"

if (-not (Test-Path (Join-Path $ProjectRoot 'package-lock.json'))) {
  Write-Host "[错误] 缺少 package-lock.json" -ForegroundColor Red
  exit 1
}

# ---- [2/4] 清理旧产物 ----
Write-Host "==> [2/4] 清理旧产物 $ReleaseDir" -ForegroundColor Cyan
if (Test-Path $ReleaseDir) { Remove-Item $ReleaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $ReleaseDir | Out-Null

# ---- [3/4] 生成容器内构建脚本并执行 ----
Write-Host "==> [3/4] 容器内构建（Linux Node 22，首次约 8-15 分钟）" -ForegroundColor Cyan
if ($Registry) { Write-Host "   npm registry: $Registry" } else { Write-Host "   npm registry: 官方（国内网络慢时可加 -Registry https://registry.npmmirror.com）" }

$registryLine = if ($Registry) { "npm config set registry $Registry" } else { "true" }

$inner = @'
#!/usr/bin/env bash
set -e
echo "== [1/6] 容器准备：安装 openssl（Prisma 引擎 libssl 绑定需要）=="
apt-get update >/dev/null 2>&1
apt-get install -y --no-install-recommends openssl ca-certificates >/dev/null 2>&1
rm -rf /var/lib/apt/lists/*
echo "== [2/6] 复制源码到容器工作区 =="
cd /src
tar -cf /tmp/src.tar --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./release --exclude=./tmp --exclude=./docs --exclude=./outputs --exclude=./output --exclude=./cachenpm --exclude=./flyer-reference --exclude=./.agents --exclude=./.claude --exclude=./.impeccable --exclude=./.review --exclude=./.env --exclude=./.env.* --exclude='*.tar' --exclude='*.tar.gz' --exclude='*.log' --exclude='*.db' --exclude='*.db-journal' --exclude='*.pem' .
mkdir -p /w
cd /w
tar -xf /tmp/src.tar
echo "== [3/6] npm ci =="
__REGISTRY_LINE__
npm ci --no-audit --no-fund 2>&1 | tail -1
echo "== [4/6] prisma generate + next build =="
export DATABASE_URL='postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder'
export PRISMA_ENGINES_MIRROR='https://registry.npmmirror.com/-/binary/prisma'
npx prisma generate
npm run build
echo "== [5/6] 组装 standalone 运行目录 =="
mkdir -p /assemble
cp -r .next/standalone/. /assemble/
cp -r .next/static /assemble/.next/static
cp -r public /assemble/public
cp -rn node_modules/. /assemble/node_modules/
cp -r prisma /assemble/prisma
cp -r scripts /assemble/scripts
cp package.json /assemble/
echo "== [6/6] 打包 =="
tar -czf /out/__TARNAME__ -C /assemble .
ls -lh /out/__TARNAME__
echo "BUILD_OK"
'@
$inner = $inner.Replace('__REGISTRY_LINE__', $registryLine).Replace('__TARNAME__', $TarName)
[System.IO.File]::WriteAllText($InnerSh, $inner.Replace("`r`n", "`n"), (New-Object System.Text.UTF8Encoding($false)))

$srcMount = ($ProjectRoot -replace '\\', '/') + ':/src:ro'
$outMount = ($ReleaseDir -replace '\\', '/') + ':/out'
$shMount  = ($InnerSh -replace '\\', '/') + ':/inner.sh:ro'

& docker run --rm -v $srcMount -v $outMount -v $shMount $NodeImage bash /inner.sh
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

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host " 构建完成 ✓" -ForegroundColor Green
Write-Host "  产物: release\$TarName  ($sizeMB MB)" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "下一步上传:" -ForegroundColor Yellow
Write-Host "  scp `".\release\$TarName`" root@<服务器IP>:/tmp/" -ForegroundColor White
Write-Host ""
Write-Host "服务器部署（免安装、免构建）:" -ForegroundColor Yellow
Write-Host "  cd /opt/edu-manage" -ForegroundColor White
Write-Host "  bash scripts/deploy-prebuilt-tar.sh /tmp/$TarName" -ForegroundColor White
Write-Host ""
