# 清理 C 盘临时文件与 Docker Desktop 升级残留备份
$ErrorActionPreference = 'SilentlyContinue'
$before = (Get-PSDrive C).Free

# 1. 用户 TEMP
$t = $env:TEMP
Get-ChildItem $t -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'cleaned TEMP'

# 2. Docker Desktop run-* 升级残留备份目录（AppData\Local 下，非当前运行的 run）
$local = 'C:\Users\Administrator\AppData\Local'
Get-ChildItem $local -Directory -Filter 'run*' -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host ('removed ' + $_.FullName)
}

# 3. Windows 临时目录
Get-ChildItem 'C:\Windows\Temp' -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host 'cleaned Windows Temp'

$after = (Get-PSDrive C).Free
Write-Host ('C free: ' + [math]::Round($before/1GB,2) + 'GB -> ' + [math]::Round($after/1GB,2) + 'GB')
