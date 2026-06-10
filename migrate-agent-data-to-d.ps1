param(
  [string]$TargetRoot = "D:\",
  [switch]$DryRun,
  [switch]$IncludeCursor,
  [switch]$SkipCodex
)

$ErrorActionPreference = "Stop"

function Test-RunningProcess {
  param([string[]]$Names)
  $running = Get-Process -ErrorAction SilentlyContinue |
    Where-Object { $Names -contains $_.ProcessName } |
    Select-Object -ExpandProperty ProcessName -Unique
  return @($running)
}

function Ensure-Directory {
  param([string]$Path)
  if ($DryRun) {
    Write-Host "[dry-run] ensure dir $Path"
    return
  }
  New-Item -ItemType Directory -Force -LiteralPath $Path | Out-Null
}

function Move-WithJunction {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    Write-Host "[skip] missing $Source"
    return
  }

  $sourceItem = Get-Item -LiteralPath $Source -Force
  if ($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Host "[skip] already linked $Source"
    return
  }

  if (Test-Path -LiteralPath $Destination) {
    throw "Destination already exists: $Destination"
  }

  $parent = Split-Path -Parent $Destination
  Ensure-Directory -Path $parent

  if ($DryRun) {
    Write-Host "[dry-run] move $Source -> $Destination"
    Write-Host "[dry-run] junction $Source -> $Destination"
    return
  }

  Move-Item -LiteralPath $Source -Destination $Destination
  New-Item -ItemType Junction -Path $Source -Target $Destination | Out-Null
  Write-Host "[ok] $Source -> $Destination"
}

$targetRootFull = [IO.Path]::GetFullPath($TargetRoot)
if (-not $targetRootFull.StartsWith("D:\", [StringComparison]::OrdinalIgnoreCase)) {
  throw "TargetRoot must be on D: for this cleanup plan. Current: $targetRootFull"
}

$active = Test-RunningProcess -Names @(
  "claude",
  "ccr",
  "npm",
  "npx",
  "node",
  "codex",
  "Codex",
  "codex-command-runner-0.137.0-alpha.4",
  "node_repl"
)

if ($active.Count -gt 0) {
  Write-Host "Close these processes first, then run this script again:"
  $active | Sort-Object | ForEach-Object { Write-Host " - $_" }
  exit 2
}

$items = @(
  @{
    Source = "C:\Users\Administrator\.claude"
    Destination = Join-Path $targetRootFull "ClaudeCode\.claude"
  },
  @{
    Source = "C:\Users\Administrator\.claude-code-router"
    Destination = Join-Path $targetRootFull "ClaudeCodeRouter\.claude-code-router"
  },
  @{
    Source = "C:\Users\Administrator\AppData\Roaming\npm"
    Destination = Join-Path $targetRootFull "npm\npm"
  },
  @{
    Source = "C:\Users\Administrator\AppData\Local\npm-cache"
    Destination = Join-Path $targetRootFull "npm\npm-cache"
  },
  @{
    Source = "C:\Users\Administrator\AppData\Roaming\Codex"
    Destination = Join-Path $targetRootFull "Codex\RoamingCodex"
  },
  @{
    Source = "C:\Users\Administrator\AppData\Local\Codex"
    Destination = Join-Path $targetRootFull "Codex\LocalCodex"
  }
)

if (-not $SkipCodex) {
  $items += @{
    Source = "C:\Users\Administrator\.codex"
    Destination = Join-Path $targetRootFull "Codex\.codex"
  }
}

if ($IncludeCursor) {
  $items += @{
    Source = "C:\Users\Administrator\AppData\Roaming\Cursor"
    Destination = Join-Path $targetRootFull "Cursor\RoamingCursor"
  }
}

foreach ($item in $items) {
  Move-WithJunction -Source $item.Source -Destination $item.Destination
}

Write-Host "Done. Verify with:"
Write-Host "  claude --version"
Write-Host "  codex --version"
Write-Host "  npm config get cache"
