$targets = @(
  'C:\Users\Administrator\AppData\Local\Docker',
  'C:\Users\Administrator\AppData\Local\DockerDesktop',
  'C:\Users\Administrator\AppData\Local\wsl',
  'C:\ProgramData\Docker'
)
foreach ($t in $targets) {
  Get-ChildItem $t -Recurse -Filter *.vhdx -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 100MB } |
    Select-Object FullName, @{n='GB'; e={[math]::Round($_.Length/1GB, 2)}}
}
Write-Host '--- run-stale dirs sizes ---'
Get-ChildItem 'C:\Users\Administrator\AppData\Local' -Directory -Filter 'run*' -ErrorAction SilentlyContinue |
  ForEach-Object { $sz = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum; [PSCustomObject]@{ Name=$_.Name; GB=[math]::Round($sz/1GB,2) } }
