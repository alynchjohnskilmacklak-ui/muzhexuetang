# Post-process converted notes: add frontmatter tags + generate index notes
$ErrorActionPreference = 'Stop'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统\知识库'
$logPath = 'D:\01muzhexuetang\convert_log.csv'

# --- 1. frontmatter for each converted note ---
$rows = Import-Csv $logPath -Encoding UTF8
$n = 0
foreach ($r in $rows) {
    if ($r.Status -ne 'ok') { continue }
    $dest = $r.Dest
    if (-not (Test-Path $dest)) { continue }
    $content = Get-Content $dest -Raw -Encoding UTF8
    if ($content -match '^\s*---\s*\r?\n') { continue }  # already has frontmatter
    $relParts = $dest.Substring($vault.Length + 1) -split '\\'
    $grade = $relParts[0]; $subj = $relParts[1]
    $fm = "---`ntags:`n  - 知识库`n  - $grade`n  - $subj`nsource: `"$($r.Rel.Replace('\','\\'))`"`n---`n`n"
    Set-Content -Path $dest -Value ($fm + $content) -Encoding UTF8
    $n++
}
"frontmatter added: $n"

# --- 2. per-grade index notes ---
$grades = Get-ChildItem $vault -Directory | Sort-Object Name
foreach ($g in $grades) {
    $lines = @()
    $lines += "# $($g.Name) 导航"
    $lines += ''
    $lines += '> 本册知识点笔记索引（自动生成）。'
    $lines += ''
    $subs = Get-ChildItem $g.FullName -Directory | Sort-Object Name
    foreach ($s in $subs) {
        $lines += "## $($s.Name)"
        $files = Get-ChildItem $s.FullName -Filter *.md -File | Sort-Object Name
        foreach ($f in $files) { $lines += "- [[$($f.BaseName)]]" }
        $lines += ''
    }
    Set-Content -Path (Join-Path $g.FullName '00-本册导航.md') -Value $lines -Encoding UTF8
}
"grade indexes: $($grades.Count)"

# --- 3. overview note ---
$lines = @()
$lines += '# 知识库总览'
$lines += ''
$lines += '> 由牧哲学堂 docx 知识文档自动转换生成。每篇笔记的 frontmatter 带 `知识库` 标签，可用标签或搜索定位。'
$lines += ''
$allMd = Get-ChildItem $vault -Recurse -Filter *.md -File | Where-Object { $_.Name -notin @('00-知识库总览.md') -and $_.Name -ne '00-本册导航.md' }
$lines += "共 $($allMd.Count) 篇笔记。"
$lines += ''
foreach ($g in $grades) {
    $lines += "## $($g.Name)"
    $subs = Get-ChildItem $g.FullName -Directory | Sort-Object Name
    foreach ($s in $subs) {
        $lines += "### $($s.Name)"
        $files = Get-ChildItem $s.FullName -Filter *.md -File | Sort-Object Name | Where-Object { $_.Name -ne '00-本册导航.md' }
        foreach ($f in $files) { $lines += "- [[$($f.BaseName)]]" }
        $lines += ''
    }
}
Set-Content -Path (Join-Path $vault '00-知识库总览.md') -Value $lines -Encoding UTF8
'overview written'
