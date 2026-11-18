# Fix leftover <img ...> HTML tags in all markdown notes -> markdown image syntax
$ErrorActionPreference = 'Continue'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$fixed = 0; $checked = 0
foreach ($f in @(Get-ChildItem $vault -Recurse -Filter *.md -File | Where-Object { $_.FullName -notmatch '\.obsidian|课本目录' })) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($null -eq $c) { continue }
    if ($c -notmatch '<img') { continue }
    $checked++
    $n1 = $c
    $c = $c -replace '(?s)<img\s+src="([^"]+)"[\s\S]*?/>', '![]($1)'
    $c = $c -replace '(?s)<img\s+src="([^"]+)"[\s\S]*?>', '![]($1)'
    if ($c -ne $n1) {
        for ($t = 1; $t -le 5; $t++) {
            try { Set-Content -Path $f.FullName -Value $c -Encoding UTF8; break }
            catch { Start-Sleep -Milliseconds 400 }
        }
        $fixed++
    }
}
"checked=$checked fixed=$fixed"
