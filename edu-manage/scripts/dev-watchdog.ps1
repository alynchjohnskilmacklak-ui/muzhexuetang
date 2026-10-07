# 本地 dev 服务器守护脚本：每 20 秒检测 localhost:3000，挂掉自动重启
# 用法（后台运行）：powershell -ExecutionPolicy Bypass -File scripts\dev-watchdog.ps1
$project = 'D:\01muzhexuetang\muzhexuetang\coding\edu-manage'
$log = Join-Path $project 'dev-server.log'
$watchLog = Join-Path $project 'dev-watchdog.log'
Set-Location $project
while ($true) {
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:3000/login' -UseBasicParsing -TimeoutSec 6
    } catch {
        Start-Sleep -Seconds 2
        # 二次确认，避免误杀刚启动的实例
        $alive = $false
        try { $null = Invoke-WebRequest -Uri 'http://localhost:3000/login' -UseBasicParsing -TimeoutSec 6; $alive = $true } catch { $alive = $false }
        if (-not $alive) {
            Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -gt (Get-Date).AddHours(-6) } | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "cd /d `"$project`" && set NEXT_TELEMETRY_DISABLED=1 && npm run dev > `"$log`" 2>&1" -WindowStyle Hidden
            Add-Content -Path $watchLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') dev 重启"
        }
    }
    Start-Sleep -Seconds 20
}
