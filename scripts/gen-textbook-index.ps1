# Generate textbook-based index pages: 课本目录/<科目>-<教材>/<年级>.md grouped by 章节
$ErrorActionPreference = 'Stop'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$destBase = Join-Path $vault '课本目录'
New-Item -ItemType Directory -Force -Path $destBase | Out-Null

# ---------- collect notes + frontmatter ----------
$notes = @()
$skipNames = @('00-知识库总览.md', '00-本册导航.md', '00-资料库总览.md', '00-文件夹导航.md', '00-课本目录总览.md', '00-工作台.md')
$subjectDirs = @('01-语文', '02-数学', '03-英语', '04-生物', '05-物理', '06-化学', '07-地理', '08-政治', '09-历史')
foreach ($base in $subjectDirs) {
    foreach ($f in @(Get-ChildItem (Join-Path $vault $base) -Recurse -Filter *.md -File)) {
        if ($f.Name -in $skipNames) { continue }
        $raw = Get-Content $f.FullName -Raw -Encoding UTF8
        if ($null -eq $raw) { continue }
        $fm = @{}
        if ($raw -match '(?s)^---\r?\n(.*?)\r?\n---') {
            foreach ($line in ($Matches[1] -split "`r?`n")) {
                if ($line -match '^([^:]+):\s*"?(.*?)"?\s*$' -and $line -notmatch '^tags:' -and $line -notmatch '^\s*-') {
                    $fm[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"')
                }
            }
        }
        $notes += [PSCustomObject]@{
            Full = $f.FullName; Base = $f.BaseName
            年级 = $fm['年级']; 科目 = $fm['科目']; 教材 = $fm['教材']; 章节 = $fm['章节']; 类型 = $fm['类型']; 版本 = $fm['版本']
        }
    }
}
"notes: $($notes.Count)"

# ---------- basename frequency for links ----------
$baseCount = @{}
foreach ($n in $notes) { if ($baseCount.ContainsKey($n.Base)) { $baseCount[$n.Base]++ } else { $baseCount[$n.Base] = 1 } }
function Get-Link([PSCustomObject]$n) {
    if ($baseCount[$n.Base] -gt 1) {
        $rel = ($n.Full.Substring($vault.Length + 1) -replace '\\', '/')
        $rel = [System.IO.Path]::ChangeExtension($rel, '').TrimEnd('.')
        return '[[' + $rel + '|' + $n.Base + ']]'
    }
    return '[[' + $n.Base + ']]'
}

# ---------- chapter number for natural sort ----------
$cnMap = @{ '一' = 1; '二' = 2; '三' = 3; '四' = 4; '五' = 5; '六' = 6; '七' = 7; '八' = 8; '九' = 9; '零' = 0 }
function Get-ChNum([string]$ch) {
    if (-not $ch) { return 9999 }
    if ($ch -match '第([一二三四五六七八九十百千零\d]+)[章节课]') {
        $s = $Matches[1]
        if ($s -match '^\d+$') { return [int]$s }
        $num = 0
        if ($s -match '百') {
            $parts = $s -split '百'
            $num += $cnMap[$parts[0]] * 100
            $s = $parts[1]
        }
        if ($s -match '十') {
            $parts = $s -split '十'
            if ($parts[0]) { $num += $cnMap[$parts[0]] * 10 } else { $num += 10 }
            if ($parts[1]) { $num += $cnMap[$parts[1]] }
        } elseif ($s) { $num += $cnMap[$s] }
        return $num
    }
    if ($ch -match 'Unit\s*(\d+)') { return [int]$Matches[1] }
    if ($ch -match 'Starter Unit\s*(\d+)') { return [int]$Matches[1] + 1000 }
    if ($ch -match '专题([一二三四五六七八九十]+)') { return [int]$cnMap[$Matches[1]] + 2000 }
    if ($ch -match '^(\d+)') { return [int]$Matches[1] + 3000 }
    return 9998
}

# ---------- type icon ----------
$typeIcon = @{
    '知识归纳' = '📖'; '测试卷' = '📝'; '压轴训练' = '🔥'; '易错训练' = '⚠️'; '中考真题' = '🎯'
    '教辅资料' = '📚'; '分层作业' = '📄'; '默写' = '✍️'; '语法' = '🔤'; '单词' = '🔠'
    '模型训练' = '🧩'; '答案' = '✅'; '其他' = '📄'
}

# ---------- group ----------
$grouped = @{}
foreach ($n in $notes) {
    if (-not $n.科目) { continue }
    $grade = if ($n.年级) { $n.年级 } elseif ($n.类型 -eq '中考真题') { '中考真题' } else { continue }
    $key = "$($n.教材)|$($n.科目)|$grade"
    if (-not $grouped.ContainsKey($key)) { $grouped[$key] = @() }
    $grouped[$key] += $n
}

$written = 0
foreach ($key in ($grouped.Keys | Sort-Object)) {
    $parts = $key -split '\|'
    $ed = $parts[0]; $subj = $parts[1]; $grade = $parts[2]
    if (-not $grade) { continue }
    $dir = Join-Path $destBase ($subj + '-' + $ed)
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $lines = @()
    $lines += "# $subj（$ed）· $grade"
    $lines += ''
    $lines += '> 按课本目录整理。每章下列出全部相关笔记，按类型分类。'
    $lines += ''
    $byCh = @{}
    foreach ($n in $grouped[$key]) {
        $ch = if ($n.章节) { $n.章节 } else { '未按章节分类' }
        if (-not $byCh.ContainsKey($ch)) { $byCh[$ch] = @() }
        $byCh[$ch] += $n
    }
    $chapters = @($byCh.Keys | Sort-Object { Get-ChNum $_ }, { $_ })
    foreach ($ch in $chapters) {
        $lines += "## $ch"
        $lines += ''
        $byType = @{}
        foreach ($n in $byCh[$ch]) {
            $t = if ($n.类型) { $n.类型 } else { '其他' }
            if (-not $byType.ContainsKey($t)) { $byType[$t] = @() }
            $byType[$t] += $n
        }
        $typeOrder = @('知识归纳', '测试卷', '压轴训练', '易错训练', '模型训练', '分层作业', '默写', '语法', '单词', '教辅资料', '中考真题', '答案', '其他')
        foreach ($t in ($typeOrder | Where-Object { $byType.ContainsKey($_) })) {
            foreach ($n in ($byType[$t] | Sort-Object Base)) {
                $v = if ($n.版本) { "（$($n.版本)）" } else { '' }
                $lines += "- $($typeIcon[$t]) " + (Get-Link $n) + " $v"
            }
        }
        $lines += ''
    }
    $outPath = Join-Path $dir ($grade + '.md')
    for ($try = 1; $try -le 5; $try++) {
        try { Set-Content -Path $outPath -Value $lines -Encoding UTF8; break }
        catch { Start-Sleep -Milliseconds 600 }
    }
    $written++
}
"pages written: $written"

# ---------- 00-课本目录总览 ----------
$lines = @()
$lines += '# 课本目录总览'
$lines += ''
$lines += '> 按教材版本和年级组织的课本章节索引。进入某册后，按「第X章」查看该章全部资料（知识清单/测试卷/压轴/易错/真题）。'
$lines += ''
$subs = @(Get-ChildItem $destBase -Directory | Sort-Object Name)
foreach ($d in $subs) {
    $lines += "## $($d.Name)"
    foreach ($f in @(Get-ChildItem $d.FullName -Filter *.md -File | Sort-Object Name)) {
        $lines += "- [[课本目录/$($d.Name)/$($f.BaseName)|$($f.BaseName)]]"
    }
    $lines += ''
}
Set-Content -Path (Join-Path $destBase '00-课本目录总览.md') -Value $lines -Encoding UTF8
'overview done'
