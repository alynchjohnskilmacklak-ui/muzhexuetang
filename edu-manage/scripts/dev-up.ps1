$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$serverLog = Join-Path $project 'dev-server.log'
$watchLog = Join-Path $project 'dev-watchdog.log'
Set-Location $project

function Test-DevEndpoint {
    try {
        $response = Invoke-WebRequest -Uri 'http://localhost:3000/login' -UseBasicParsing -TimeoutSec 4
        return $response.StatusCode -lt 500
    } catch {
        $statusCode = 0
        if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
        return ($statusCode -ge 200 -and $statusCode -lt 400)
    }
}

function Get-ProjectListener {
    $listeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
    foreach ($listener in $listeners) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)" -ErrorAction SilentlyContinue
        if (-not $process -or $process.Name -notin @('node.exe', 'cmd.exe', 'powershell.exe', 'pwsh.exe')) { continue }

        $owned = $false
        $current = $process
        for ($depth = 0; $depth -lt 5 -and $current; $depth++) {
            $commandLine = [string]$current.CommandLine
            if ($commandLine.IndexOf($project, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and $commandLine -match '(?i)(next(?:\.js)?\s+dev|npm\s+run\s+dev|dev-up\.ps1|dev-run\.cmd)') {
                $owned = $true
                break
            }
            if (-not $current.ParentProcessId) { break }
            $current = Get-CimInstance Win32_Process -Filter "ProcessId = $($current.ParentProcessId)" -ErrorAction SilentlyContinue
        }

        return [pscustomobject]@{ ProcessId = [int]$listener.OwningProcess; Owned = $owned }
    }
    return $null
}

function Test-ProjectDockerDevContainer {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $containers = @(& docker ps --filter 'name=^/edu-manage-local-dev$' --format '{{.Names}}' 2>$null)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedPreference
    }

    if ($exitCode -ne 0 -or $containers -notcontains 'edu-manage-local-dev') { return $false }
    return (Test-DevEndpoint)
}

function Test-DockerEngine {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedPreference
    }
    return ($exitCode -eq 0)
}

function Try-StartDockerEngine {
    $script:dockerDesktopState = 'not-found'
    if (Test-DockerEngine) { return $true }
    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    $derivedDesktop = $null
    if ($dockerCommand) {
        $dockerDirectory = Split-Path -Parent $dockerCommand.Source
        $desktopRoot = Split-Path -Parent (Split-Path -Parent $dockerDirectory)
        $derivedDesktop = Join-Path $desktopRoot 'Docker Desktop.exe'
    }
    $desktopCandidates = @(
        $derivedDesktop,
        (Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\Docker Desktop.exe'),
        'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    )
    $desktop = $desktopCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $desktop) { return $false }
    if (-not (Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue)) {
        Start-Process -FilePath $desktop -WindowStyle Hidden
        $script:dockerDesktopState = 'started'
    } else {
        $script:dockerDesktopState = 'running'
    }
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        Start-Sleep -Seconds 2
        if (Test-DockerEngine) { return $true }
    }
    return $false
}

function Invoke-LocalDatabaseCheck {
    $savedPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $rawOutput = & node (Join-Path $project 'scripts/check-local-db.cjs') 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $savedPreference
    }
    $safeOutput = @($rawOutput | ForEach-Object {
        if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message }
        else { [string]$_ }
    })
    return [pscustomobject]@{ ExitCode = $exitCode; Output = $safeOutput }
}

if (Test-ProjectDockerDevContainer) {
    Write-Host '牧哲学堂 Docker 源码热更新服务已就绪：http://localhost:3000/login'
    exit 0
}

$dbStatus = Invoke-LocalDatabaseCheck
if ($dbStatus.ExitCode -ne 0) {
    $dbMessage = $dbStatus.Output -join [Environment]::NewLine
    if ($dbMessage -match 'configured database host is not reachable' -and (Try-StartDockerEngine)) {
        Start-Sleep -Seconds 4
        $dbStatus = Invoke-LocalDatabaseCheck
    } elseif ($dbMessage -match 'configured database host is not reachable') {
        if ($script:dockerDesktopState -eq 'not-found') {
            Write-Host '未找到 Docker Desktop 安装程序，无法自动启动本地数据库引擎。'
        } elseif ($script:dockerDesktopState -eq 'started') {
            Write-Host '已尝试启动 Docker Desktop，但引擎未就绪。'
        } else {
            Write-Host 'Docker Desktop 已运行，但引擎未就绪。'
        }
        Write-Host '请检查 Docker Desktop 后端服务权限；启动器不会使用生产 compose 或猜测要启动的数据库容器。'
    }
    if ($dbStatus.ExitCode -ne 0) {
        Write-Host '数据库健康检查未通过。本地页面没有启动；请检查项目 .env 配置并确认对应数据库服务正在运行。'
        Write-Host ($dbStatus.Output -join [Environment]::NewLine)
        exit 1
    }
}
Write-Host '本地数据库连接正常。'

$listener = Get-ProjectListener
if (Test-DevEndpoint) {
    if ($listener -and $listener.Owned) {
        Write-Host '牧哲学堂本地开发服务已就绪：http://localhost:3000/login'
        exit 0
    }

    Write-Host 'localhost:3000 有响应，但不是当前项目可确认的 Next 开发服务。若由生产模式 Docker 容器占用，源码修改不会热更新。请先停止 edu-manage-local-app，再运行本启动器；数据库容器无需停止。'
    exit 2
}

if ($listener) {
    if (-not $listener.Owned) {
        Write-Host '端口 3000 被其他或无法确认归属的进程占用。为保护其他项目，没有结束该进程。'
        exit 2
    }
    Stop-Process -Id $listener.ProcessId -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

$remaining = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
if ($remaining.Count -gt 0) {
    Write-Host '端口 3000 仍被占用，没有结束未确认归属的进程。'
    exit 2
}

$runScript = Join-Path $PSScriptRoot 'dev-run.cmd'
$runArguments = '/d /c "' + $runScript + '"'
Start-Process -FilePath 'cmd.exe' -ArgumentList $runArguments -WorkingDirectory $project -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 45; $attempt++) {
    Start-Sleep -Seconds 2
    if (Test-DevEndpoint) {
        $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Add-Content -Path $watchLog -Value "$stamp 本地 dev 服务已启动并通过 /login 健康检查"
        Write-Host '本地开发服务已就绪：http://localhost:3000/login'
        exit 0
    }
}

Write-Host "开发服务器启动后未通过健康检查。请查看 $serverLog 的末尾日志。"
exit 1
