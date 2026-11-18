Write-Host '--- free space ---'
Get-PSDrive C, D | Select-Object Name, @{n='FreeGB'; e={[math]::Round($_.Free/1GB, 1)}}
Write-Host '--- user temp size ---'
$t = $env:TEMP
$tsz = (Get-ChildItem $t -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
[PSCustomObject]@{ Path=$t; GB=[math]::Round($tsz/1GB,2) }
Write-Host '--- AppData\Local run-* dirs ---'
Get-ChildItem 'C:\Users\Administrator\AppData\Local' -Directory -Filter 'run*' -ErrorAction SilentlyContinue | ForEach-Object {
  $sz = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  [PSCustomObject]@{ Name=$_.Name; MB=[math]::Round($sz/1MB,1) }
} | Sort-Object MB -Descending | Select-Object -First 15
Write-Host '--- AppData\Local big dirs ---'
Get-ChildItem 'C:\Users\Administrator\AppData\Local' -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $sz = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  [PSCustomObject]@{ Name=$_.Name; GB=[math]::Round($sz/1GB,2) }
} | Sort-Object GB -Descending | Select-Object -First 10
