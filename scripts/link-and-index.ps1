# Link notes by knowledge-point keywords + generate archive indexes
$ErrorActionPreference = 'Stop'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'

# ---------- 0. collect md files ----------
$mdFiles = @()
foreach ($base in @('01-语文', '02-数学', '03-英语', '04-生物', '05-物理', '06-化学', '07-地理', '08-政治', '09-历史', '99-其他')) {
    $mdFiles += @(Get-ChildItem (Join-Path $vault $base) -Recurse -Filter *.md -File -ErrorAction SilentlyContinue)
}
$indexNames = @('00-知识库总览.md', '00-本册导航.md', '00-资料库总览.md', '00-文件夹导航.md', '00-工作台.md')
$contentNotes = @($mdFiles | Where-Object { $_.Name -notin $indexNames })
"content notes: $($contentNotes.Count)"

# ---------- 1. token extraction ----------
$removals = @(
    '知识归纳与题型突破', '核心知识归纳', '知识点归纳', '知识归纳', '知识清单', '题型突破', '单元复习',
    '知识讲解', '知识考点', '基础知识专项讲练', '基础知识与中考创新题', '单元练习', '专项讲练',
    '语法梳理', '语法讲解', '考点汇总', '考点突破', '单元重点综合测试', '重点综合测试', '压轴训练',
    '易错训练', '综合测试', '测试卷', '考点卷', '单元卷', '单元重点', '专题练习', '创新题型',
    '新教材', '新人教版', '人教版', '冀教版', '冀少版', '老版', '新版', '秋季', '春季',
    '学年', '核心', '基础', '知识', '归纳', '梳理', '突破', '复习', '训练', '测试', '考点',
    '清单', '试卷', '讲义', '总结', '汇总', '专题', '创新', '解析', '答案', '例题', '习题',
    '七年级', '八年级', '九年级', '年级', '上册', '下册', '初中', '中考', '电子课本', '教师', '学生',
    '牧哲学堂', '教师资料', '学生资料', '可编辑版', '可修改版', '打印版', '删减版', '原卷', '解析版',
    '原卷版', '分层作业', '课时', '培优', '默写', '背诵', '单词表', '单词', '检测', '综合', '测评',
    '全国通用', '一轮复习', '衔接', '暑假', '初升高', '2025版', '单元检测', '综合检测', '月考',
    '期中', '期末', '开学', '寒假'
)
$stopTokens = @(
    'unit', 'units', '2024', '2025', '2026', '英语', '数学', '生物', '语文', '物理', '化学',
    '历史', '地理', '道法', '政治', '人教', '冀教', '万唯', '页', '版', '卷', '题', '知识点',
    '期中', '期末', '月考', '开学', '寒假', '暑假', '复习', '练习', '讲义', '教案', '课件'
)
function Get-Tokens([string]$name) {
    $t = [System.IO.Path]::GetFileNameWithoutExtension($name)
    $t = $t -replace '[（(【].*?[）)】]', ' '       # strip parenthetical groups
    $t = $t -replace '[·_—–，、,./\\：:]', ' '
    $t = $t -replace '-', ' '
    foreach ($r in $removals) { $t = $t.Replace($r, ' ') }
    $tokens = @($t -split '\s+' | Where-Object {
        $low = $_.ToLower()
        $_.Length -ge 2 -and $low -notmatch '^\d+$' -and $low -notin $stopTokens -and
        $low -notmatch '^第[\d一二三四五六七八九十百千]+$' -and
        $low -notmatch '^第.*[章节单元课]' -and
        $low -notmatch '版$|卷$|题$|类$|页$|章$|节$|册$|课$'
    })
    return @($tokens | ForEach-Object { $_.ToLower() } | Select-Object -Unique)
}

# ---------- 2. token -> files index ----------
$fileTokens = @{}
$tokenIndex = @{}
foreach ($f in $contentNotes) {
    $toks = Get-Tokens $f.Name
    if ($toks.Count -eq 0) { continue }
    $fileTokens[$f.FullName] = $toks
    foreach ($tk in $toks) {
        if (-not $tokenIndex.ContainsKey($tk)) { $tokenIndex[$tk] = @() }
        $tokenIndex[$tk] += $f.FullName
    }
}
"token types: $($tokenIndex.Count)"

# ---------- 3. basename frequency for link disambiguation ----------
$baseCount = @{}
foreach ($f in $mdFiles) { $b = $f.BaseName; if ($baseCount.ContainsKey($b)) { $baseCount[$b]++ } else { $baseCount[$b] = 1 } }
function Get-Link([string]$full) {
    $b = [System.IO.Path]::GetFileNameWithoutExtension($full)
    if ($baseCount[$b] -gt 1) {
        $rel = $full.Substring($vault.Length + 1) -replace '\\', '/'
        $rel = [System.IO.Path]::ChangeExtension($rel, '')
        $rel = $rel.TrimEnd('.')
        return '[[' + $rel + '|' + $b + ']]'
    }
    return '[[' + $b + ']]'
}

# ---------- 4. add 相关笔记 section ----------
function Write-Note([string]$path, [string]$text) {
    for ($try = 1; $try -le 3; $try++) {
        try {
            Set-Content -Path $path -Value $text -Encoding UTF8
            return $true
        } catch {
            Start-Sleep -Milliseconds 400
        }
    }
    "WARN write failed (3 tries): $path"
    return $false
}
$linked = 0
foreach ($f in $contentNotes) {
    if (-not $fileTokens.ContainsKey($f.FullName)) {
        # no tokens: remove any stale 相关笔记 section from a previous run
        $content = Get-Content $f.FullName -Raw -Encoding UTF8
        if ($content -match '## 相关笔记') {
            $content = $content -replace '(?s)\r?\n?## 相关笔记.*$', ''
            Write-Note $f.FullName ($content.TrimEnd() + "`n") | Out-Null
        }
        continue
    }
    $scores = @{}
    foreach ($tk in $fileTokens[$f.FullName]) {
        foreach ($other in $tokenIndex[$tk]) {
            if ($other -eq $f.FullName) { continue }
            if ($scores.ContainsKey($other)) { $scores[$other]++ } else { $scores[$other] = 1 }
        }
    }
    if ($scores.Count -eq 0) {
        # no matches: remove any stale 相关笔记 section from a previous run
        $content = Get-Content $f.FullName -Raw -Encoding UTF8
        if ($content -match '## 相关笔记') {
            $content = $content -replace '(?s)\r?\n?## 相关笔记.*$', ''
            Write-Note $f.FullName ($content.TrimEnd() + "`n") | Out-Null
        }
        continue
    }
    $top = @($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 8)
    $lines = @('', '## 相关笔记', '')
    foreach ($e in $top) { $lines += '- ' + (Get-Link $e.Key) }
    $content = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($null -eq $content) { "WARN null content: $($f.FullName)"; $content = '' }
    if ($content -match '(?s)## 相关笔记.*$') { $content = $content -replace '(?s)\r?\n?## 相关笔记.*$', '' }
    $content = $content.TrimEnd() + "`n" + ($lines -join "`n") + "`n"
    if (Write-Note $f.FullName $content) { $linked++ }
}
"notes linked: $linked"
'done'
