# Add structured frontmatter (年级/科目/教材/章节/类型/版本/年份) to every content note
$ErrorActionPreference = 'Stop'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'

$gradePattern = '七年级上册|七年级下册|八年级上册|八年级下册|九年级上册|九年级下册|高一上册|高二上册|高一|高二'

$physMap = @{
    '01机械运动' = '第一章 机械运动'; '02声现象' = '第二章 声现象'; '03物态变化' = '第三章 物态变化'
    '04光现象' = '第四章 光现象'; '05透镜及其应用' = '第五章 透镜及其应用'; '06质量与密度' = '第六章 质量与密度'
    '01内能及其内能的利用' = '第十三章 内能及其利用'; '02电学基础' = '第十五章 电流和电路'
    '03欧姆定律' = '第十七章 欧姆定律'; '04电功率' = '第十八章 电功率'; '05生活用电' = '第十九章 生活用电'
    '06电生磁' = '第二十章 电与磁'; '07能源与可持续发展' = '第二十一章 能源与可持续发展'
    '电学大单元' = '电学综合'; '电学微专题' = '电学综合'
}

$subjectOrder = @('生物', '化学', '物理', '英语', '数学', '语文', '历史', '道法', '政治', '地理')
$typeWordsTest = @('单元卷', '测试卷', '综合测试', '单元测试', '综合检测', '单元检测', '检测', '测评', '考点卷', '试题', '试卷', '测试')
$typeWordsKnow = @('知识清单', '知识归纳', '知识点归纳', '核心知识', '梳理', '知识讲解', '讲义', '考点', '知识')

function Get-Meta([string]$rel, [string]$name) {
    $meta = [ordered]@{ 年级 = ''; 科目 = ''; 教材 = ''; 章节 = ''; 类型 = ''; 版本 = ''; 年份 = '' }
    # grade
    if ($rel -match $gradePattern) { $meta.年级 = $Matches[0] }
    if ($meta.年级 -eq '高一') { $meta.年级 = '高一上册' }; if ($meta.年级 -eq '高二') { $meta.年级 = '高二上册' }
    # subject: filename first, then folders deepest-first
    $subj = ''
    foreach ($kw in $subjectOrder) { if ($name -match $kw) { $subj = $kw; break } }
    if (-not $subj) {
        $folders = @($rel -split '\\')
        for ($i = $folders.Count - 2; $i -ge 0; $i--) {
            foreach ($kw in $subjectOrder) { if ($folders[$i] -match $kw) { $subj = $kw; break } }
            if ($subj) { break }
        }
    }
    if ($subj -eq '政治') { $subj = '道法' }
    $meta.科目 = $subj
    # textbook edition
    $ed = ''
    if ($rel -match '冀教版2024') { $ed = '冀教版2024' } elseif ($rel -match '冀少版2024') { $ed = '冀少版2024' }
    elseif ($rel -match '人教版2024') { $ed = '人教版2024' } elseif ($rel -match '冀教版') { $ed = '冀教版' }
    elseif ($rel -match '冀少版') { $ed = '冀少版' } elseif ($rel -match '统编版') { $ed = '统编版' } elseif ($rel -match '人教版') { $ed = '人教版' }
    if (-not $ed) {
        $ed = switch ($subj) {
            '数学' { '冀教版' }; '生物' { '冀少版' }; '英语' { '人教版' }; '物理' { '人教版' }
            '化学' { '人教版' }; '语文' { '统编版' }; '历史' { '统编版' }; '道法' { '统编版' }; '地理' { '人教版' }
            default { '' }
        }
    }
    $meta.教材 = $ed
    # chapter
    $ch = ''
    if ($name -match '^(第[一二三四五六七八九十百千\d]+单元第[一二三四五六七八九十百千]+章)\s*([^（(【\s]+)') {
        $ch = $Matches[1] + ' ' + $Matches[2]
    } elseif ($name -match '^(第[一二三四五六七八九十百千\d]+章)\s*([^（(【\s]+)') {
        $t = $Matches[2]
        $t = $t -replace '(单元重点综合测试|单元复习|知识归纳与题型突破|知识归纳|题型突破|易错训练|压轴训练|综合测试|单元重点|压轴|易错|训练|测试|知识|归纳|梳理|突破|模型|考点|专项|复习|重点|基础|讲义|资料|题)$', ''
        $ch = $Matches[1] + ' ' + $t
    } elseif ($name -match '^(第[一二三四五六七八九十百千\d]+单元)') {
        $ch = $Matches[1]
    } elseif ($name -match '(Starter Unit\s*\d+|Unit\s*\d+)') {
        $ch = $Matches[1]
    } elseif ($name -match '^第\d+课\s*(.+?)(?=[（(【]|$)') {
        $t = $Matches[1] -replace '(九年级化学上册|八年级上册|七年级上册|九年级|八年级|七年级|上册|下册|年级|化学|数学|英语|生物|物理|语文|原卷版|解析版|学生版|教师版)', ''
        $ch = '第' + (($Matches[0] -replace '^第(\d+)课.*', '$1')) + '课 ' + $t.Trim()
    } elseif ($name -match '^专题[一二三四五六七八九十]+') {
        $ch = $Matches[0]
    } else {
        foreach ($k in $physMap.Keys) { if ($name -match [regex]::Escape($k)) { $ch = $physMap[$k]; break } }
    }
    $meta.章节 = $ch.Trim()
    # type
    $type = '其他'
    if ($name -match '中考|真题') { $type = '中考真题' }
    elseif ($name -match '压轴') { $type = '压轴训练' }
    elseif ($name -match '易错') { $type = '易错训练' }
    elseif ($name -match '默写') { $type = '默写' }
    elseif ($name -match '分层作业') { $type = '分层作业' }
    elseif ($name -match '模型') { $type = '模型训练' }
    elseif ($name -match '语法') { $type = '语法' }
    elseif ($name -match '单词') { $type = '单词' }
    elseif ($name -match '2025版资料|教师资料|学生资料|教辅') { $type = '教辅资料' }
    else {
        $hit = $false
        foreach ($w in $typeWordsTest) { if ($name -match $w) { $type = '测试卷'; $hit = $true; break } }
        if (-not $hit) { foreach ($w in $typeWordsKnow) { if ($name -match $w) { $type = '知识归纳'; break } } }
    }
    $meta.类型 = $type
    # version
    $ver = ''
    if ($name -match '教师版|教师资料|教师') { $ver = '教师版' }
    elseif ($name -match '学生版|学生资料|学生') { $ver = '学生版' }
    elseif ($name -match '原卷版|原卷') { $ver = '原卷版' }
    elseif ($name -match '解析版|解析') { $ver = '解析版' }
    elseif ($name -match '答案') { $ver = '答案版' }
    $meta.版本 = $ver
    # year
    if ($name -match '(19|20)\d{2}') { $meta.年份 = $Matches[0] }
    return $meta
}

$contentNotes = @()
$contentNotes += @(Get-ChildItem (Join-Path $vault '知识库') -Recurse -Filter *.md -File)
$contentNotes += @(Get-ChildItem (Join-Path $vault '资料库') -Recurse -Filter *.md -File)
$skipNames = @('00-知识库总览.md', '00-本册导航.md', '00-资料库总览.md', '00-文件夹导航.md')
$contentNotes = @($contentNotes | Where-Object { $_.Name -notin $skipNames })
"notes to tag: $($contentNotes.Count)"

$n = 0
foreach ($f in $contentNotes) {
    $rel = $f.FullName.Substring($vault.Length + 1)
    $meta = Get-Meta $rel $f.Name
    $body = ''
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($null -eq $content) { "WARN null: $($f.FullName)"; continue }
    if ($content -match '^---\r?\n.*?\r?\n---\r?\n?(.*)$' -or $content -match '(?s)^---\r?\n.*?\r?\n---\r?\n(.*)$') {
        $body = $Matches[1]
    } else {
        $body = $content
    }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('---')
    [void]$sb.AppendLine('tags:')
    $tagSet = @('知识库', '资料库')
    if ($meta.年级) { $tagSet += $meta.年级 }
    if ($meta.科目) { $tagSet += $meta.科目 }
    if ($meta.教材) { $tagSet += $meta.教材 }
    foreach ($t in ($tagSet | Select-Object -Unique)) { [void]$sb.AppendLine("  - $t") }
    [void]$sb.AppendLine("年级: `"$($meta.年级)`"")
    [void]$sb.AppendLine("科目: `"$($meta.科目)`"")
    [void]$sb.AppendLine("教材: `"$($meta.教材)`"")
    [void]$sb.AppendLine("章节: `"$($meta.章节)`"")
    [void]$sb.AppendLine("类型: `"$($meta.类型)`"")
    if ($meta.版本) { [void]$sb.AppendLine("版本: `"$($meta.版本)`"") }
    if ($meta.年份) { [void]$sb.AppendLine("年份: `"$($meta.年份)`"") }
    [void]$sb.AppendLine("source: `"$($rel.Replace('\', '\\'))`"")
    [void]$sb.AppendLine('---')
    [void]$sb.AppendLine('')
    $out = $sb.ToString() + $body.TrimStart("`r", "`n")
    for ($try = 1; $try -le 3; $try++) {
        try { Set-Content -Path $f.FullName -Value $out -Encoding UTF8; break }
        catch { Start-Sleep -Milliseconds 400 }
    }
    $n++
}
"tagged: $n"
