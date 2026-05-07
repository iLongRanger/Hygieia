param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDir = '',
  [string]$LogDir = '',
  [int]$LocalRetentionDays = 7,
  [int]$LogRetentionDays = 30,
  [switch]$PlainSql,
  [switch]$SkipReadinessCheck,
  [switch]$SkipLocalCleanup,
  [switch]$SkipLogCleanup
)

$ErrorActionPreference = 'Stop'

if ($LocalRetentionDays -lt 1) {
  throw 'LocalRetentionDays must be at least 1.'
}

if ($LogRetentionDays -lt 1) {
  throw 'LogRetentionDays must be at least 1.'
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'backups/database'
}

if (-not $LogDir) {
  $LogDir = Join-Path $repoRoot 'backups/logs'
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $LogDir "scheduled-backup-$timestamp.log"

Start-Transcript -Path $logFile -Force | Out-Null

try {
  Write-Host "Scheduled backup started at $((Get-Date).ToUniversalTime().ToString('o'))"

  if (-not $SkipReadinessCheck) {
    $readinessArgs = @(
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      (Join-Path $PSScriptRoot 'check-backup-readiness.ps1'),
      '-BackupDir',
      $OutputDir
    )

    if ($DatabaseUrl) {
      $readinessArgs += @('-DatabaseUrl', $DatabaseUrl)
    }

    Write-Host 'Running backup readiness check...'
    powershell @readinessArgs
    if ($LASTEXITCODE -ne 0) {
      throw 'Backup readiness check failed.'
    }
  }

  $backupArgs = @(
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    (Join-Path $PSScriptRoot 'backup-db-to-r2.ps1'),
    '-OutputDir',
    $OutputDir
  )

  if ($DatabaseUrl) {
    $backupArgs += @('-DatabaseUrl', $DatabaseUrl)
  }

  if ($PlainSql) {
    $backupArgs += '-PlainSql'
  }

  Write-Host 'Creating and uploading backup...'
  powershell @backupArgs
  if ($LASTEXITCODE -ne 0) {
    throw 'Scheduled backup upload failed.'
  }

  if (-not $SkipLocalCleanup) {
    Write-Host "Cleaning local backups older than $LocalRetentionDays day(s)..."
    powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'cleanup-local-backups.ps1') -BackupDir $OutputDir -RetentionDays $LocalRetentionDays
    if ($LASTEXITCODE -ne 0) {
      throw 'Local backup cleanup failed.'
    }
  }

  if (-not $SkipLogCleanup) {
    $logCutoff = (Get-Date).AddDays(-$LogRetentionDays)
    $oldLogs = Get-ChildItem -Path $LogDir -Filter 'scheduled-backup-*.log' -File |
      Where-Object { $_.LastWriteTime -lt $logCutoff -and $_.FullName -ne $logFile }

    foreach ($oldLog in $oldLogs) {
      Remove-Item -LiteralPath $oldLog.FullName -Force
      Write-Host "Deleted old scheduled backup log: $($oldLog.FullName)"
    }
  }

  Write-Host "Scheduled backup completed at $((Get-Date).ToUniversalTime().ToString('o'))"
} finally {
  Stop-Transcript | Out-Null
  Write-Host "Scheduled backup log: $logFile"
}
