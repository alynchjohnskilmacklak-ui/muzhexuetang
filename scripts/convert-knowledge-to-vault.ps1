# Convert knowledge docx files to Markdown into the Obsidian vault
$ErrorActionPreference = 'Continue'
$list = Get-Content 'D:\01muzhexuetang\knowledge_files.txt' -Encoding UTF8
$root = 'D:\01muzhexuetang\muzhexuetang'
$vaultBase = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统\知识库'
$logPath = 'D:\01muzhexuetang\convert_log.csv'
$summaryPath = 'D:\01muzhexuetang\convert_summary.txt'

# Build entry list with dedup
$entries = @()
$relSet = @{}
foreach ($line in $list) {
    $parts = $line -split "`t"
    if ($parts.Count -lt 2) { continue }
    $rel = $parts[0]; $top = $parts[1]
    $name = Split-Path $rel -Leaf
    # skip "(N).docx" copies when the base file exists
    if ($name -match '^(.*)\(\d+\)\.docx$') {
        $baseRel = (Split-Path $rel -Parent) + '\' + $matches[1] + '.docx'
        if ($relSet.ContainsKey($baseRel)) { continue }
    }
    $relSet[$rel] = $true

    # grade from top-level folder
    $grade = switch -Regex ($top) {
        '七年级上册'   { '七年级上册' }
        '七年级下册'   { '七年级下册' }
        '八年级上册'   { '八年级上册' }
        '八年级下册'   { '八年级下册' }
        '九年级上册'   { '九年级上册' }
        '九年级下册'   { '九年级下册' }
        '内部资料'     { '内部资料' }
        '重点汇总'     { '重点汇总' }
        default        { '其他' }
    }
    if ($top -match '三期') { $grade = '2025三期-' + $grade }

    # subject: prefer filename, then parent folder name
    $subj = '其他'
    $parent = Split-Path $rel -Parent
    foreach ($cand in @($name, $parent)) {
        foreach ($kw in @('数学', '生物', '英语', '语文', '物理', '化学', '历史', '地理')) {
            if ($cand -match $kw) { $subj = $kw; break }
        }
        if ($subj -ne '其他') { break }
        if ($cand -match '道法|政治') { $subj = '道法'; break }
    }
    if ($grade -eq '重点汇总') { $subj = '综合' }

    $destDir = Join-Path $vaultBase ($grade + '\' + $subj)
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $dest = Join-Path $destDir ([System.IO.Path]::GetFileNameWithoutExtension($name) + '.md')
    $entries += [PSCustomObject]@{ Src = Join-Path $root $rel; Rel = $rel; Dest = $dest; Grade = $grade; Subj = $subj }
}

"total_after_dedup=$($entries.Count)" | Set-Content $summaryPath -Encoding UTF8
$results = @()
$i = 0
foreach ($e in $entries) {
    $i++
    $status = 'ok'
    $err = ''
    if (-not (Test-Path $e.Dest)) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            & npx.cmd -y @firecrawl/anydoc $e.Src -o $e.Dest *> $null
            if ($LASTEXITCODE -ne 0) { $status = 'fail'; $err = "exit=$LASTEXITCODE" }
        } catch { $status = 'fail'; $err = $_.Exception.Message }
        $sw.Stop()
        if ($status -eq 'ok' -and -not (Test-Path $e.Dest)) { $status = 'fail'; $err = 'no output' }
        if ($status -eq 'ok' -and (Get-Item $e.Dest).Length -eq 0) { $status = 'fail'; $err = 'empty output' }
        "[$i/$($entries.Count)] $status $err $($e.Rel) ($([math]::Round($sw.Elapsed.TotalSeconds,1))s)"
    } else {
        "[$i/$($entries.Count)] skip (exists) $($e.Rel)"
    }
    if ($status -ne 'ok') { $err = $err }
    $results += [PSCustomObject]@{ Rel = $e.Rel; Dest = $e.Dest; Status = $status; Err = $err }
}
$results | Export-Csv $logPath -NoTypeInformation -Encoding UTF8
"done. ok=$(@($results | Where-Object Status -eq 'ok').Count) fail=$(@($results | Where-Object Status -ne 'ok').Count)" | Add-Content $summaryPath -Encoding UTF8
