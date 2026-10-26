Get-ChildItem 'C:\' -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1GB } | Select-Object Name, @{n='GB'; e={[math]::Round($_.Length/1GB, 2)}}
