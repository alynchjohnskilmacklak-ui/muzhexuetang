# Remove _dup files whose content matches the original (whitespace-insensitive)
$ErrorActionPreference = 'Continue'
$v = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$dups = @(Get-ChildItem $v -Recurse -Filter '*_dup*' -File)
$removed = 0; $kept = 0
foreach ($d in $dups) {
    $baseName = ($d.BaseName -replace '_dup$', '') + $d.Extension
    $base = Join-Path $d.DirectoryName $baseName
    if (-not (Test-Path $base)) { Remove-Item $d.FullName -Force; $removed++; continue }
    $c1 = ((Get-Content $d.FullName -Raw -Encoding UTF8) -replace '\s', '')
    $c2 = ((Get-Content $base -Raw -Encoding UTF8) -replace '\s', '')
    if ($c1 -eq $c2) { Remove-Item $d.FullName -Force; $removed++ } else { $kept++ }
}
"removed identical: $removed, kept different: $kept"
"remaining dup: $((Get-ChildItem $v -Recurse -Filter '*_dup*' -File).Count)"
