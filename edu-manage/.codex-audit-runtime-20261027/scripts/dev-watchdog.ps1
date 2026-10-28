# 本地 dev 服务器守护脚本：只调用带端口归属检查的启动器。
# 不会结束无法确认属于本项目的 Node 或其他进程。
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$watchLog = Join-Path $project 'dev-watchdog.log'
Set-Location $project
while ($true) {
    try {
        $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/login' -UseBasicParsing -TimeoutSec 6
    } catch {
        $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Add-Content -Path $watchLog -Value "$stamp /login 不可用，交由安全启动器检查数据库和端口归属"
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'dev-up.ps1') *>> $watchLog
    }
    Start-Sleep -Seconds 20
}
