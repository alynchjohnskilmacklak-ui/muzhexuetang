Write-Host '--- D:\DockerData size ---'
$dd = Get-ChildItem 'D:\DockerData' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum
[math]::Round($dd.Sum/1GB, 2)
Write-Host '--- Top C: directories ---'
Get-ChildItem 'C:\' -Directory -ErrorAction SilentlyContinue | ForEach-Object {
  $sz = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  [PSCustomObject]@{ Dir=$_.Name; GB=[math]::Round($sz/1GB,2) }
} | Sort-Object GB -Descending | Select-Object -First 12
