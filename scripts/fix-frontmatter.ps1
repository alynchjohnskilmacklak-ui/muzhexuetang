# Fix frontmatter details: edition years, mid-name chapter patterns, physics type
$ErrorActionPreference = 'Stop'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'

$edBySubject = @{ '数学' = '冀教版2024'; '生物' = '冀少版2024'; '英语' = '人教版2024'; '物理' = '人教版'; '化学' = '人教版'; '语文' = '统编版'; '历史' = '统编版'; '道法' = '统编版'; '地理' = '人教版' }

function Get-ChFromName([string]$name) {
    if ($name -match '^(第[一二三四五六七八九十百千\d]+单元第[一二三四五六七八九十百千]+章)\s*([^（(【\s]+)') {
        return ($Matches[1] + ' ' + $Matches[2]).Trim()
    }
    if ($name -match '^(第[一二三四五六七八九十百千\d]+章)\s*([^（(【\s]+)') {
        $t = $Matches[2]
        foreach ($r in @('知识归纳与题型突破', '易错训练与压轴训练', '压轴训练与易错训练', '单元重点综合测试', '单元复习', '知识归纳', '题型突破', '易错训练', '压轴训练', '综合测试', '单元重点', '压轴', '易错', '训练', '测试', '知识', '归纳', '梳理', '突破', '模型', '考点', '专项', '复习', '重点', '基础', '讲义', '资料', '题')) { $t = $t.Replace($r, '') }
        $t = $t.TrimEnd('与', '和', '及', '、', '，', ',', ' ')
        return ($Matches[1] + ' ' + $t).Trim()
    }
    return ''
}

$targets = @()
$targets += @(Get-ChildItem (Join-Path $vault '知识库') -Recurse -Filter *.md -File)
$targets += @(Get-ChildItem (Join-Path $vault '资料库') -Recurse -Filter *.md -File)
$skipNames = @('00-知识库总览.md', '00-本册导航.md', '00-资料库总览.md', '00-文件夹导航.md')
$targets = @($targets | Where-Object { $_.Name -notin $skipNames })
$fixed = 0

foreach ($f in $targets) {
    $raw = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($null -eq $raw -or $raw -notmatch '(?s)^---\r?\n(.*?)\r?\n---\r?\n(.*)$') { continue }
    $fmText = $Matches[1]; $body = $Matches[2]
    $fm = @{}
    foreach ($line in ($fmText -split "`r?`n")) {
        if ($line -match '^([^:\s]+):\s*"?(.*?)"?\s*$') { $fm[$Matches[1]] = $Matches[2].Trim().Trim('"') }
    }
    $changed = $false
    # 1) edition year for 知识库 notes (or any note whose edition has no year but subject default has one)
    if ($fm['教材'] -in @('冀教版', '冀少版', '人教版')) {
        $dflt = $edBySubject[$fm['科目']]
        if ($dflt) { $fm['教材'] = $dflt; $changed = $true }
    }
    # 2) mid-name chapter: 第N章：主题, and clean chapter titles
    $name = $f.Name
    if (-not $fm['章节']) {
        if ($name -match '第([\d一二三四五六七八九十百千]+)章[：:]\s*([^（(【\s]+)') {
            $fm['章节'] = '第' + $Matches[1] + '章 ' + $Matches[2]; $changed = $true
        }
    } elseif ($fm['章节'] -match '^(第[一二三四五六七八九十百千\d]+[章单元])') {
        $better = Get-ChFromName $name
        if ($better -and $better -ne $fm['章节']) { $fm['章节'] = $better; $changed = $true }
    }
    # 3) physics 题 files: 类型 其他 -> 测试卷
    if ($fm['科目'] -eq '物理' -and $fm['类型'] -eq '其他' -and $fm['章节']) {
        $fm['类型'] = '测试卷'; $changed = $true
    }
    # 4) 中考真题 without grade -> 年级 中考真题
    if ($fm['类型'] -eq '中考真题' -and -not $fm['年级']) {
        $fm['年级'] = '中考真题'; $changed = $true
    }
    if (-not $changed) { continue }
    # rebuild frontmatter preserving tags block
    $rel = $f.FullName.Substring($vault.Length + 1)
    $baseTag = if ($rel.StartsWith('知识库')) { '知识库' } else { '资料库' }
    $tags = @($baseTag)
    foreach ($k in @('年级', '科目', '教材')) { if ($fm[$k]) { $tags += $fm[$k] } }
    if ($fm['年级'] -and $tags -notcontains $fm['年级']) { $tags += $fm['年级'] }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('---')
    [void]$sb.AppendLine('tags:')
    foreach ($t in ($tags | Select-Object -Unique)) { [void]$sb.AppendLine("  - $t") }
    foreach ($k in @('年级', '科目', '教材', '章节', '类型', '版本', '年份')) {
        if ($fm[$k]) { [void]$sb.AppendLine("$k`: `"$($fm[$k])`"") }
    }
    if ($fm['source']) { [void]$sb.AppendLine("source: `"$($fm['source'] -replace '\\', '\\')`"") }
    [void]$sb.AppendLine('---')
    [void]$sb.AppendLine('')
    for ($try = 1; $try -le 3; $try++) {
        try { Set-Content -Path $f.FullName -Value ($sb.ToString() + $body.TrimStart("`r", "`n")) -Encoding UTF8; break }
        catch { Start-Sleep -Milliseconds 400 }
    }
    $fixed++
}
"fixed: $fixed"
