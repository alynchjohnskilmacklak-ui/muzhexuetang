Get-PSDrive C, D | Select-Object Name, @{n='FreeGB'; e={[math]::Round($_.Free/1GB, 1)}}, @{n='UsedGB'; e={[math]::Round($_.Used/1GB, 1)}}
