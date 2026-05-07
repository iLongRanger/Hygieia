param(
  [string]$BackupDir = '',
  [int]$RetentionDays = 7,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if ($RetentionDays -lt 1) {
  throw 'RetentionDays must be at least 1.'
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

if (-not $BackupDir) {
  $BackupDir = Join-Path $repoRoot 'backups/database'
}

if (-not (Test-Path $BackupDir)) {
  Write-Host "Backup directory does not exist: $BackupDir"
  exit 0
}

$resolvedBackupDir = Resolve-Path $BackupDir
$cutoff = (Get-Date).AddDays(-$RetentionDays)

$candidates = Get-ChildItem -Path $resolvedBackupDir -File |
  Where-Object {
    $_.LastWriteTime -lt $cutoff -and
    ($_.Name -match '\.(dump|sql|manifest\.json)$')
  }

if (-not $candidates -or $candidates.Count -eq 0) {
  Write-Host "No local backup files older than $RetentionDays day(s) found in $resolvedBackupDir"
  exit 0
}

Write-Host "Found $($candidates.Count) local backup file(s) older than $RetentionDays day(s)."

foreach ($file in $candidates) {
  if ($DryRun) {
    Write-Host "[dry-run] Would delete: $($file.FullName)"
    continue
  }

  Remove-Item -LiteralPath $file.FullName -Force
  Write-Host "Deleted: $($file.FullName)"
}

if ($DryRun) {
  Write-Host 'Dry run complete. No files were deleted.'
} else {
  Write-Host 'Local backup cleanup complete.'
}
