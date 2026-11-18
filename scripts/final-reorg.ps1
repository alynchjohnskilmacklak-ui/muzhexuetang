# Final cleanup: move 道法 to 政治, organize Wanwei series per subject, categorize 99-其他
$ErrorActionPreference = 'Continue'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$logPath = 'D:\01muzhexuetang\final_reorg_log.txt'
$lines = @()
function Log([string]$m) { $script:lines += $m }

function Move-Safe([string]$src, [string]$destDir) {
    if (-not (Test-Path $src)) { return 'missing' }
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $dest = Join-Path $destDir (Split-Path $src -Leaf)
    if (Test-Path $dest) {
        $c1 = ((Get-Content $src -Raw -Encoding UTF8 -ErrorAction SilentlyContinue) -replace '\s', '')
        $c2 = ((Get-Content $dest -Raw -Encoding UTF8 -ErrorAction SilentlyContinue) -replace '\s', '')
        if ($c1 -eq $c2) { Remove-Item $src -Force; return 'dup-removed' }
        $dest = Join-Path $destDir (([System.IO.Path]::GetFileNameWithoutExtension($dest)) + '_dup' + [System.IO.Path]::GetExtension($dest))
    }
    for ($t = 1; $t -le 5; $t++) {
        try { Move-Item $src $dest -Force; return 'moved' }
        catch { Start-Sleep -Milliseconds 500 }
    }
    return 'failed'
}

# ---------- Part 1: 道法/道德与法治 -> 08-政治 ----------
$other = Join-Path $vault '99-其他'
$pol = Join-Path $vault '08-政治'
# 电子课本
foreach ($g in @('七年级上册', '七年级下册', '八年级上册', '八年级下册', '九年级上册', '九年级下册')) {
    $f = Get-ChildItem (Join-Path $other $g) -Filter "*道德与法治*.pdf" -ErrorAction SilentlyContinue
    foreach ($x in $f) { Log "政治课本: $(Move-Safe $x.FullName (Join-Path $pol "课本\$g"))  <- $($x.Name)" }
}
# 真题
foreach ($x in @(Get-ChildItem (Join-Path $other '中考真题') -Filter "*道德与法治*.md" -ErrorAction SilentlyContinue)) {
    Log "政治真题: $(Move-Safe $x.FullName (Join-Path $pol '题库\中考真题'))  <- $($x.Name)"
}
# 知识点归纳
foreach ($x in @(Get-ChildItem $other -Filter "*道德与法治知识点*.md" -ErrorAction SilentlyContinue)) {
    Log "政治资料: $(Move-Safe $x.FullName (Join-Path $pol '牧哲学堂资料'))  <- $($x.Name)"
}
# 道法题库文件（99-其他 顶层 + 07-地理错位）
foreach ($x in @(Get-ChildItem $other -Filter "道法*.pdf" -ErrorAction SilentlyContinue)) {
    Log "政治题库: $(Move-Safe $x.FullName (Join-Path $pol '题库'))  <- $($x.Name)"
}
foreach ($x in @(Get-ChildItem (Join-Path $vault '07-地理\题库') -Filter "道法*.pdf" -ErrorAction SilentlyContinue)) {
    Log "政治万唯: $(Move-Safe $x.FullName (Join-Path $pol '题库\万唯'))  <- $($x.Name)"
}

# ---------- Part 2: Wanwei series -> 各科题库/万唯/ ----------
$wanweiPat = '万唯|基础知识与创新题|考前突破|晨读晚记|中考早复习|早备考|真题分类|高分作文|几何模型|几何辅助线|解答题不丢分|评分标准|默写通关|精准摸底小卷|秒懂'
$subjDir = @{ '物理' = '05-物理'; '化学' = '06-化学'; '数学' = '02-数学'; '英语' = '03-英语'; '语文' = '01-语文'; '历史' = '09-历史'; '地理' = '07-地理'; '道法' = '08-政治'; '道德' = '08-政治' }
$kwOrder = @('物理', '化学', '数学', '英语', '语文', '历史', '地理', '道法', '道德')
$wanweiFiles = @(Get-ChildItem $vault -Recurse -File | Where-Object {
    $_.Name -match $wanweiPat -and $_.FullName -notmatch '\.obsidian|99-其他\\0[1-8]' -and $_.FullName -notmatch '\\万唯\\'
})
foreach ($x in $wanweiFiles) {
    $rel = $x.FullName.Substring($vault.Length + 1)
    if ($rel -match '^0[1-9]-') { }
    else { continue }
    $subj = ''
    foreach ($kw in $kwOrder) { if ($x.Name -match $kw) { $subj = $subjDir[$kw]; break } }
    if (-not $subj -and $x.Name -match '作文') { $subj = '01-语文' }
    if (-not $subj -and $x.Name -match '数理化') { $subj = '99-其他' }
    if (-not $subj) { continue }
    if ($subj -eq '99-其他') {
        Log "教辅: $(Move-Safe $x.FullName (Join-Path $vault '99-其他\06-教辅资料'))  <- $rel"
    } else {
        Log "万唯->${subj}: $(Move-Safe $x.FullName (Join-Path $vault "${subj}\题库\万唯"))  <- $rel"
    }
}

# ---------- Part 3: 99-其他 loose files categorization ----------
$catRules = @(
    @{ Dir = '04-志愿填报'; Pat = '志愿|择校|分配生|升学规划' },
    @{ Dir = '03-课程教学'; Pat = '评语|成绩单|课堂反馈|结业|月考|学生|家长版|冲刺|辅导|晚间|帮助|考研|单招|周末|课业|实施方案|先锋营|作业班|上课表|排课|课程表|暑期培训' },
    @{ Dir = '01-宣传招生'; Pat = '传单|海报|宣传|新乐|邯郸|帆布包|纸杯|物品清单|朋友圈|分数线|一分一档|招生|logo|聊天' },
    @{ Dir = '02-企业管理'; Pat = '工作证|工作规范|合同|话术|座位|图书|汇报|名单|登记|教师|协议|退费|资金|业务计划|资料清单|工作簿|附件|防伪|新建|期收入' },
    @{ Dir = '05-重点汇总'; Pat = '模块复习|录取分数线|摸底|名师' }
)
foreach ($x in @(Get-ChildItem $other -File)) {
    if ($x.Name -match '\.(png|jpg|jpeg|mp4|mp3|gif)$') { Log "图片: $(Move-Safe $x.FullName (Join-Path $other '07-图片附件'))  <- $($x.Name)"; continue }
    if ($x.Extension -in @('.py', '.txt', '.et')) {
        $target = '08-其他杂项'
        if ($x.Extension -eq '.txt' -and $x.Name -match '志愿|招生录取') { $target = '04-志愿填报' }
        if ($x.Extension -eq '.et') { $target = '03-课程教学' }
        Log "${target}: $(Move-Safe $x.FullName (Join-Path $other $target))  <- $($x.Name)"
        continue
    }
    $target = ''
    foreach ($r in $catRules) {
        if ($x.Name -match $r.Pat) { $target = $r.Dir; break }
    }
    if (-not $target) { $target = '08-其他杂项' }
    Log "${target}: $(Move-Safe $x.FullName (Join-Path $other $target))  <- $($x.Name)"
}

# ---------- Part 4: cleanup empty dirs ----------
foreach ($base in @('99-其他', '07-地理', '02-数学', '03-英语', '06-化学', '09-历史')) {
    $d = Join-Path $vault $base
    if (Test-Path $d) {
        Get-ChildItem $d -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
            if (-not (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue)) { Remove-Item $_.FullName -Force }
        }
    }
}
Set-Content -Path $logPath -Value $lines -Encoding UTF8
"done. entries: $($lines.Count)"
