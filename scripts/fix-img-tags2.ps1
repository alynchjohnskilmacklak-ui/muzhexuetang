# Ultimate fix: blockquote-style multi-line <img> tags -> markdown images
$ErrorActionPreference = 'Continue'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'

$pat1 = '(?s)> <img\r?\n(?:> [^\r\n]*\r?\n)*?> [^\r\n]*?/>'
$pat2 = '(?s)<img\r?\n(?:[^\r\n]*\r?\n)*?[^\r\n]*?/>'

$fixed = 0
foreach ($f in @(Get-ChildItem $vault -Recurse -Filter *.md -File | Where-Object { $_.FullName -notmatch '\.obsidian|课本目录' })) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($null -eq $c -or $c -notmatch '<img') { continue }
    $before = $c
    $c = [regex]::Replace($c, $pat1, {
        param($m)
        if ($m.Value -match 'src="([^"]+)"') { return '![](' + $Matches[1] + ')' }
        return $m.Value
    })
    $c = [regex]::Replace($c, $pat2, {
        param($m)
        if ($m.Value -match 'src="([^"]+)"') { return '![](' + $Matches[1] + ')' }
        return $m.Value
    })
    if ($c -ne $before) {
        for ($t = 1; $t -le 5; $t++) {
            try { Set-Content -Path $f.FullName -Value $c -Encoding UTF8; break }
            catch { Start-Sleep -Milliseconds 400 }
        }
        $fixed++
    }
}
"fixed=$fixed"
