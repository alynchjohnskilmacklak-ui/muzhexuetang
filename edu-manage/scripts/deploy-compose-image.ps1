[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_.-]*$')]
  [string]$VersionTag,
  [string]$Server = 'root@101.200.191.201',
  [string]$SshKey = 'C:\Users\Administrator\.ssh\id_rsa',
  [string]$NpmRegistry = 'https://registry.npmmirror.com'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Docker = (Get-Command docker -ErrorAction Stop).Source
$Ssh = (Get-Command ssh -ErrorAction Stop).Source
$Scp = (Get-Command scp -ErrorAction Stop).Source
$Image = "edu-manage-app:$VersionTag"
$ReleaseDir = Join-Path $ProjectRoot 'release'
$RawTarPath = Join-Path $ReleaseDir "edu-manage-app-$VersionTag.tar"
$TarPath = Join-Path $ReleaseDir "edu-manage-app-$VersionTag.tar.gz"
$ShaPath = "$TarPath.sha256"
$DeployHelper = Join-Path $PSScriptRoot 'deploy-compose-image.sh'
$RemoteHelper = '/opt/edu-manage-docker/source/scripts/deploy-compose-image.sh'
$RemoteTar = "/tmp/edu-manage-app-$VersionTag.tar.gz"
$TotalTimer = [System.Diagnostics.Stopwatch]::StartNew()

function Invoke-Native {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "命令失败 ($LASTEXITCODE): $File $($Arguments -join ' ')"
  }
}

function Compress-FastGzip {
  param([string]$SourcePath, [string]$DestinationPath)

  Add-Type -AssemblyName System.IO.Compression
  $SourceStream = $null
  $DestinationStream = $null
  $GzipStream = $null
  $Completed = $false
  try {
    $SourceStream = [System.IO.File]::OpenRead($SourcePath)
    $DestinationStream = [System.IO.File]::Create($DestinationPath)
    $GzipStream = [System.IO.Compression.GZipStream]::new(
      $DestinationStream,
      [System.IO.Compression.CompressionLevel]::Fastest,
      $true
    )
    $SourceStream.CopyTo($GzipStream)
    $Completed = $true
  }
  finally {
    if ($GzipStream) { $GzipStream.Dispose() }
    if ($DestinationStream) { $DestinationStream.Dispose() }
    if ($SourceStream) { $SourceStream.Dispose() }
    if (-not $Completed -and (Test-Path -LiteralPath $DestinationPath)) {
      Remove-Item -LiteralPath $DestinationPath -Force
    }
  }
}

if (-not (Test-Path -LiteralPath $SshKey -PathType Leaf)) {
  throw "找不到 SSH 私钥: $SshKey"
}
if (-not (Test-Path -LiteralPath $DeployHelper -PathType Leaf)) {
  throw "找不到生产部署脚本: $DeployHelper"
}
New-Item -ItemType Directory -Path $ReleaseDir -Force | Out-Null

Write-Host "==> 复用本地 Docker 缓存构建 $Image"
$PhaseTimer = [System.Diagnostics.Stopwatch]::StartNew()
Invoke-Native -File $Docker -Arguments @('buildx', 'build', '--progress=plain', '--load', '--builder', 'mzt-release', '--target', 'runner', '--build-arg', "NPM_REGISTRY=$NpmRegistry", '-t', $Image, $ProjectRoot)
Write-Host ("   构建耗时：{0:N1} 分钟" -f $PhaseTimer.Elapsed.TotalMinutes)

Write-Host '==> 导出镜像、快速压缩并生成 SHA256'
$PhaseTimer.Restart()
Invoke-Native -File $Docker -Arguments @('save', $Image, '-o', $RawTarPath)
Compress-FastGzip -SourcePath $RawTarPath -DestinationPath $TarPath
$RawBytes = (Get-Item -LiteralPath $RawTarPath).Length
$CompressedBytes = (Get-Item -LiteralPath $TarPath).Length
$TransferFormat = 'gzip'
if ($CompressedBytes -ge $RawBytes) {
  Remove-Item -LiteralPath $TarPath -Force
  $TarPath = $RawTarPath
  $ShaPath = "$TarPath.sha256"
  $RemoteTar = "/tmp/edu-manage-app-$VersionTag.tar"
  $CompressedBytes = $RawBytes
  $TransferFormat = '原始 tar（压缩未减小体积）'
}
$TarHash = (Get-FileHash -LiteralPath $TarPath -Algorithm SHA256).Hash.ToLowerInvariant()
$HashLine = "$TarHash  $(Split-Path -Leaf $TarPath)"
[System.IO.File]::WriteAllText($ShaPath, $HashLine, [System.Text.Encoding]::ASCII)
$SavedPercent = if ($RawBytes -gt 0) { [math]::Max(0, (1 - ($CompressedBytes / $RawBytes)) * 100) } else { 0 }
if ($TarPath -ne $RawTarPath) { Remove-Item -LiteralPath $RawTarPath -Force }
Write-Host ("   导出与压缩耗时：{0:N1} 分钟；{1:N1} MB → {2:N1} MB（减少 {3:N0}%）；格式：{4}" -f $PhaseTimer.Elapsed.TotalMinutes, ($RawBytes / 1MB), ($CompressedBytes / 1MB), $SavedPercent, $TransferFormat)

Write-Host '==> 更新服务器的 Compose 安全部署脚本'
$PhaseTimer.Restart()
$RemoteHelperUpload = '{0}:/tmp/deploy-compose-image.sh' -f $Server
Invoke-Native -File $Scp -Arguments @('-i', $SshKey, $DeployHelper, $RemoteHelperUpload)
Invoke-Native -File $Ssh -Arguments @('-i', $SshKey, $Server, "install -D -m 755 /tmp/deploy-compose-image.sh $RemoteHelper")
Invoke-Native -File $Ssh -Arguments @('-i', $SshKey, $Server, 'rm -f /tmp/deploy-compose-image.sh')
Write-Host ("   部署脚本更新耗时：{0:N1} 分钟" -f $PhaseTimer.Elapsed.TotalMinutes)

Write-Host '==> 上传镜像包和校验文件'
$PhaseTimer.Restart()
$RemoteUpload = '{0}:/tmp/' -f $Server
Invoke-Native -File $Scp -Arguments @('-i', $SshKey, $TarPath, $ShaPath, $RemoteUpload)
Write-Host ("   上传耗时：{0:N1} 分钟" -f $PhaseTimer.Elapsed.TotalMinutes)

Write-Host '==> 线上切换；通过健康检查后服务器只留 latest'
$PhaseTimer.Restart()
Invoke-Native -File $Ssh -Arguments @('-i', $SshKey, $Server, "bash $RemoteHelper $RemoteTar $Image")
Write-Host ("   远端加载与切换耗时：{0:N1} 分钟" -f $PhaseTimer.Elapsed.TotalMinutes)

Write-Host '==> 本地镜像标签也只留 latest，保留构建缓存以加快下次部署'
Invoke-Native -File $Docker -Arguments @('tag', $Image, 'edu-manage-app:latest')
$AppImageRefs = @(& $Docker image ls --format '{{.Repository}}:{{.Tag}}')
if ($LASTEXITCODE -ne 0) { throw '读取本地应用镜像标签失败' }
foreach ($Ref in $AppImageRefs) {
  if ($Ref -match '^edu-manage-app:' -and $Ref -ne 'edu-manage-app:latest') {
    & $Docker image rm $Ref
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "本地旧镜像仍被容器引用，未删除: $Ref"
    }
  }
}

Remove-Item -LiteralPath $TarPath, $ShaPath -Force
Write-Host '==> 部署完成，本地只保留一个 edu-manage-app 镜像标签'
& $Docker system df
if ($LASTEXITCODE -ne 0) { throw '读取 Docker 空间统计失败' }
Write-Host ("总耗时：{0:N1} 分钟" -f $TotalTimer.Elapsed.TotalMinutes)
