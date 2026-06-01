# Fail if real env files are staged or tracked. Safe to run before commit/push.
# Usage: pwsh scripts/check-no-env-secrets.ps1

$ErrorActionPreference = "Stop"
Set-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))

$blocked = @(
  ".env",
  ".env.prod",
  ".env.local",
  ".env.production",
  ".env.production.local",
  "packages/core/.env"
)

$tracked = git ls-files @blocked 2>$null
if ($tracked) {
  Write-Error @"
Tracked secret env files (remove from git with: git rm --cached <file>):
$($tracked -join "`n")
"@
}

$stagedAll = @(git diff --cached --name-only 2>$null)
$staged = $stagedAll | Where-Object { $_ -in $blocked }
if ($staged) {
  Write-Error @"
Staged secret env files (unstage with: git restore --staged <file>):
$($staged -join "`n")
"@
}

Write-Host "OK: no .env / .env.prod (or other blocked env files) staged or tracked."
