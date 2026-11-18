# Reorganize vault into clean subject-based structure: 学科/课本|牧哲学堂资料|题库/年级
$ErrorActionPreference = 'Stop'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$logPath = 'D:\01muzhexuetang\reorg_log.txt'

$subjPrefix = @{ '语文' = '01'; '数学' = '02'; '英语' = '03'; '生物' = '04'; '物理' = '05'; '化学' = '06'; '地理' = '07'; '政治' = '08'; '历史' = '09' }
$subjectOrder = @('语文', '数学', '英语', '生物', '物理', '化学', '地理', '政治', '历史')
$typeQuiz = @('测试卷', '压轴训练', '易错训练', '中考真题', '分层作业', '默写', '单词', '模型训练', '答案')
$gradePattern = '七年级上册|七年级下册|八年级上册|八年级下册|九年级上册|九年级下册|高一上册|高二上册'

$lines = @()
function Log([string]$m) { $script:lines += $m }

$moved = 0; $skipped = 0; $other = 0
$sources = @()
foreach ($base in @('知识库', '资料库')) {
    $sources += @(Get-ChildItem (Join-Path $vault $base) -Recurse -File -Force -ErrorAction SilentlyContinue)
}
"source files: $($sources.Count)"

foreach ($f in $sources) {
    $name = $f.Name
    if ($name -in @('00-知识库总览.md', '00-资料库总览.md', '00-本册导航.md', '00-文件夹导航.md', '00-工作台.md')) { continue }
    $rel = $f.FullName.Substring($vault.Length + 1)
    $lookup = $rel

    # --- subject ---
    $subj = ''
    if ($f.Extension -eq '.md') {
        $raw = Get-Content $f.FullName -Raw -Encoding UTF8
        if ($raw -match '(?s)^---\r?\n(.*?)\r?\n---') {
            if ($Matches[1] -match '(?m)^科目:\s*"?(.+?)"?\s*$') { $subj = $Matches[1].Trim().Trim('"') }
        }
    }
    if (-not $subj) {
        foreach ($kw in $subjectOrder) { if ($lookup -match $kw) { $subj = $kw; break } }
    }
    if ($subj -in @('道法', '道德')) { $subj = '政治' }
    if ($subj -in @('道德与法治')) { $subj = '政治' }

    # --- category ---
    $cat = ''
    if ($rel -match '电子课本|电子课本文件夹|课本$|^\d+[\\/]\d+[\\/]05') { $cat = '课本' }
    elseif ($rel -match '万唯|真题|单元练习|单元测试|测评') { $cat = '题库' }
    elseif ($f.Extension -eq '.md' -and $raw -match '(?m)^类型:\s*"?(.+?)"?\s*$' -and $Matches[1].Trim().Trim('"') -in $typeQuiz) { $cat = '题库' }
    elseif ($rel -match '题[\\/]|题库|试题|试卷|测试卷|压轴|易错|默写|作业|练习') { $cat = '题库' }
    elseif ($rel -match '知识|清单|归纳|梳理|讲义|语法|资料|重点|总结|汇总|考点|复习') { $cat = '牧哲学堂资料' }
    else { $cat = '牧哲学堂资料' }

    # --- grade ---
    $grade = ''
    if ($f.Extension -eq '.md' -and $raw -match '(?m)^年级:\s*"?(.+?)"?\s*$') { $grade = $Matches[1].Trim().Trim('"') }
    if (-not $grade -and $lookup -match $gradePattern) { $grade = $Matches[0] }
    if ($grade -eq '中考真题') { $grade = '中考真题' }
    if ($grade -in @('高一', '高二')) { $grade = $grade + '上册' }

    # --- dest ---
    if ($subj) {
        $destDir = Join-Path $vault ($subjPrefix[$subj] + '-' + $subj)
        $destDir = Join-Path $destDir $cat
        if ($grade) { $destDir = Join-Path $destDir $grade }
    } else {
        $destDir = Join-Path $vault '99-其他'
        if ($grade) { $destDir = Join-Path $destDir $grade }
        $other++
    }
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $dest = Join-Path $destDir $name
    if (Test-Path $dest) {
        if ((Get-Item $dest).Length -eq $f.Length) { Remove-Item $f.FullName -Force; $skipped++; continue }
        $dest = Join-Path $destDir ([System.IO.Path]::GetFileNameWithoutExtension($name) + '_dup' + $f.Extension)
    }
    for ($try = 1; $try -le 5; $try++) {
        try { Move-Item -Path $f.FullName -Destination $dest -Force; break }
        catch { Start-Sleep -Milliseconds 600 }
    }
    $moved++
    if ($moved % 200 -eq 0) { "moved $moved" }
}
Log "moved=$moved skipped_dups=$skipped other=$other"

# --- cleanup empty skeleton dirs ---
foreach ($base in @('知识库', '资料库')) {
    $baseDir = Join-Path $vault $base
    if (Test-Path $baseDir) {
        Get-ChildItem $baseDir -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
            if (-not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item $_.FullName -Force }
        }
        if (-not (Get-ChildItem $baseDir -Force -ErrorAction SilentlyContinue)) { Remove-Item $baseDir -Force; Log "removed $base" }
    }
}
Set-Content -Path $logPath -Value $lines -Encoding UTF8
"done. moved=$moved skipped_dups=$skipped other=$other"
