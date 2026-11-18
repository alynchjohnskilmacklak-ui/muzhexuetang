$ok = $false
for ($i = 0; $i -lt 40; $i++) {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { $ok = $true; break }
  Start-Sleep -Seconds 5
}
if ($ok) {
  docker version --format 'Docker engine ready'
} else {
  Write-Host 'Docker not ready after 200s'
  exit 1
}
