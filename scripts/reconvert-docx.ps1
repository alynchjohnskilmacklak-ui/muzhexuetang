# Re-convert all docx-sourced markdown notes with pandoc to restore images/formulas
$ErrorActionPreference = 'Continue'
$vault = 'D:\01muzhexuetang\muzhexuetang\coding\牧哲学堂教育系统'
$srcRoot = 'D:\01muzhexuetang\muzhexuetang'
$pandoc = 'D:\01muzhexuetang\pandoc\pandoc-3.10.2\pandoc.exe'
$logPath = 'D:\01muzhexuetang\reconvert_log.csv'
$summaryPath = 'D:\01muzhexuetang\reconvert_summary.txt'

# build source docx index by basename
$srcIdx = @{}
foreach ($d in @(Get-ChildItem $srcRoot -Recurse -Filter *.docx -File | Where-Object { $rel = $_.FullName.Substring($srcRoot.Length + 1); $rel.Split('\')[0] -notin @('coding', 'MinerU') })) {
    $srcIdx[$d.BaseName] = $d.FullName
}
"source docx indexed: $($srcIdx.Count)"

$mdFiles = @()
foreach ($base in @('01-语文', '02-数学', '03-英语', '04-生物', '05-物理', '06-化学', '07-地理', '08-政治', '09-历史', '99-其他')) {
    $mdFiles += @(Get-ChildItem (Join-Path $vault $base) -Recurse -Filter *.md -File -ErrorAction SilentlyContinue)
}
"md files: $($mdFiles.Count)"

$results = @(); $converted = 0; $skipped = 0; $failed = 0
foreach ($f in $mdFiles) {
    $raw = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($null -eq $raw) { continue }
    $fmText = ''
    if ($raw -match '(?s)^---\r?\n(.*?)\r?\n---\r?\n') { $fmText = "---`n" + $Matches[1] + "`n---" }
    # resolve source
    $srcPath = ''
    if ($fmText -match '(?m)^source:\s*"?(.+?)"?\s*$') {
        $s = $Matches[1].Trim().Trim('"') -replace '\\\\', '\'
        if ($s -and -not $s.StartsWith('知识库\') -and -not $s.StartsWith('资料库\')) {
            $cand = Join-Path $srcRoot $s
            if (Test-Path $cand) { $srcPath = $cand }
        }
    }
    if (-not $srcPath) {
        $bn = $f.BaseName -replace '_dup$', ''
        if ($srcIdx.ContainsKey($bn)) { $srcPath = $srcIdx[$bn] }
    }
    if (-not $srcPath) { $skipped++; $results += [PSCustomObject]@{ File = $f.Name; Status = 'no-source'; Note = '' }; continue }
    if ([System.IO.Path]::GetExtension($srcPath) -ne '.docx') { $skipped++; $results += [PSCustomObject]@{ File = $f.Name; Status = 'not-docx'; Note = $srcPath }; continue }

    $mdDir = $f.DirectoryName
    $assetsName = $f.BaseName + '.assets'
    $oldAssets = Join-Path $mdDir $assetsName
    if (Test-Path $oldAssets) { Remove-Item $oldAssets -Recurse -Force }
    $tmpMd = Join-Path $mdDir ('~tmp_' + $f.Name)
    if (Test-Path $tmpMd) { Remove-Item $tmpMd -Force }
    $note = ''
    try {
        Push-Location $mdDir
        & $pandoc $srcPath -f docx -t gfm "--extract-media=$assetsName" -o $tmpMd *> $null
        Pop-Location
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tmpMd) -or (Get-Item $tmpMd).Length -eq 0) { $failed++; $results += [PSCustomObject]@{ File = $f.Name; Status = 'fail'; Note = "pandoc exit=$LASTEXITCODE" }; continue }
        $body = Get-Content $tmpMd -Raw -Encoding UTF8
        if ($null -eq $body) { $body = '' }
        # move media files up one level
        $mediaDir = Join-Path $mdDir ($assetsName + '\media')
        if (Test-Path $mediaDir) {
            Get-ChildItem $mediaDir -File | ForEach-Object { Move-Item $_.FullName (Join-Path $mdDir $assetsName) -Force }
            Remove-Item $mediaDir -Force
        }
        # post-process: html img -> markdown, fix asset paths
        $body = $body -replace '<img src="([^"]+)"\s*style="[^"]*"\s*/>', '![]($1)'
        $body = $body -replace '<img src="([^"]+)"[^>]*>', '![]($1)'
        $body = $body.Replace($assetsName + '/media/', $assetsName + '/')
        # strip stale 相关笔记 section (will be regenerated)
        $body = $body -replace '(?s)\r?\n?## 相关笔记.*$', ''
        $imgCount = ([regex]::Matches($body, '!\[\]\(')).Count
        $out = $fmText + "`n`n" + $body.TrimStart("`r", "`n")
        for ($t = 1; $t -le 5; $t++) {
            try { Set-Content -Path $f.FullName -Value $out -Encoding UTF8; break }
            catch { Start-Sleep -Milliseconds 400 }
        }
        Remove-Item $tmpMd -Force
        $converted++
        $results += [PSCustomObject]@{ File = $f.Name; Status = 'ok'; Note = "imgs=$imgCount" }
        if ($converted % 100 -eq 0) { "converted $converted (failed=$failed)" }
    } catch {
        $failed++
        $results += [PSCustomObject]@{ File = $f.Name; Status = 'error'; Note = $_.Exception.Message }
    }
}
$results | Export-Csv $logPath -NoTypeInformation -Encoding UTF8
"done. converted=$converted skipped=$skipped failed=$failed" | Set-Content $summaryPath -Encoding UTF8
