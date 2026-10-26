# Convert ALL doc/docx/pptx/xlsx under muzhexuetang (excl. coding/MinerU) to Markdown into vault 资料库
$ErrorActionPreference = 'Continue'
$root = 'D:\01muzhexuetang\muzhexuetang'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$destBase = Join-Path $vault '资料库'
$logPath = 'D:\01muzhexuetang\convert_all_log.csv'

# skip list: rel paths already converted into 知识库
$skip = @{}
Get-ChildItem (Join-Path $vault '知识库') -Recurse -Filter *.md -File -ErrorAction SilentlyContinue | ForEach-Object {
    $raw = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($raw -match 'source: "(.+)"') {
        $rel = $matches[1] -replace '\\\\', '\'
        $skip[$rel] = $true
    }
}
"skip entries: $($skip.Count)"

$files = Get-ChildItem $root -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    $top = $rel.Split('\')[0]
    $top -notin @('coding', 'MinerU') -and $_.Name -notmatch '^\.' -and $_.Extension -match '^\.(docx?|pptx?|xlsx?)$'
}
"docs to process: $($files.Count)"

$results = @(); $i = 0; $converted = 0; $skipped = 0
foreach ($f in $files) {
    $i++
    $rel = $f.FullName.Substring($root.Length + 1)
    if ($skip.ContainsKey($rel)) { $skipped++; continue }
    $mdName = [System.IO.Path]::ChangeExtension($f.Name, '.md')
    $parent = Split-Path $rel -Parent
    $mdRel = if ($parent) { $parent + '\' + $mdName } else { $mdName }
    $dest = Join-Path $destBase $mdRel
    $status = 'skip'
    if (-not (Test-Path $dest)) {
        New-Item -ItemType Directory -Force -Path (Split-Path $dest -Parent) | Out-Null
        try {
            & npx.cmd -y @firecrawl/anydoc $f.FullName -o $dest *> $null
            if ($LASTEXITCODE -eq 0 -and (Test-Path $dest) -and (Get-Item $dest).Length -gt 0) { $status = 'ok'; $converted++ }
            else { $status = 'fail' }
        } catch { $status = 'fail' }
        if ($status -ne 'skip') { "[$i/$($files.Count)] $status $rel" }
    } else { "[$i] exists $rel"; $skipped++ }
    $results += [PSCustomObject]@{ Rel = $rel; Dest = $dest; Status = $status }
}
$results | Export-Csv $logPath -NoTypeInformation -Encoding UTF8
"done. converted=$converted skipped=$skipped fail=$(@($results | Where-Object Status -eq 'fail').Count)"
