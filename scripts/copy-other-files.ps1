# Copy ALL non-convertible files (pdf/images/videos/etc.) from muzhexuetang into vault 资料库, mirroring layout
$ErrorActionPreference = 'Continue'
$root = 'D:\01muzhexuetang\muzhexuetang'
$destBase = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统\资料库'

$files = Get-ChildItem $root -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    $top = $rel.Split('\')[0]
    $top -notin @('coding', 'MinerU') -and $_.Name -notmatch '^\.' -and $_.Extension -notmatch '^\.(docx?|pptx?|xlsx?)$' -and $_.Name -notlike '*.qkdownloading'
}
"files to copy: $($files.Count)"

$copied = 0; $skipped = 0; $bytes = [long]0
foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1)
    $dest = Join-Path $destBase $rel
    if (Test-Path $dest) { $skipped++; continue }
    New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
    Copy-Item $f.FullName $dest -Force
    $copied++; $bytes += $f.Length
    if ($copied % 100 -eq 0) { "copied $copied files, $([math]::Round($bytes/1MB,0)) MB" }
}
"done. copied=$copied skipped=$skipped totalMB=$([math]::Round($bytes/1MB,0))"
