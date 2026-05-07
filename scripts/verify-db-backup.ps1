param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [switch]$PlainSql
)

$ErrorActionPreference = 'Stop'

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. Install PostgreSQL client tools and make sure $Name is available in PATH."
  }
}

$resolvedBackupFile = Resolve-Path $BackupFile
$backupInfo = Get-Item $resolvedBackupFile

if (-not $backupInfo.Length -or $backupInfo.Length -le 0) {
  throw "Backup file is empty: $resolvedBackupFile"
}

$manifestPath = Join-Path $backupInfo.DirectoryName "$($backupInfo.BaseName).manifest.json"
if (Test-Path $manifestPath) {
  $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
  if ($manifest.sha256) {
    $checksum = Get-FileHash -Algorithm SHA256 -Path $resolvedBackupFile
    if ($checksum.Hash.ToLowerInvariant() -ne $manifest.sha256.ToLowerInvariant()) {
      throw "Backup checksum mismatch. Manifest: $($manifest.sha256), actual: $($checksum.Hash.ToLowerInvariant())"
    }
    Write-Host "Checksum verified: $($checksum.Hash.ToLowerInvariant())"
  } else {
    Write-Warning "Manifest found without sha256 checksum: $manifestPath"
  }
}

Write-Host "Verifying backup file..."
Write-Host "File: $resolvedBackupFile"
Write-Host "Size: $($backupInfo.Length) bytes"

if ($PlainSql) {
  $firstLine = Get-Content -Path $resolvedBackupFile -TotalCount 1
  if (-not $firstLine) {
    throw "Plain SQL backup is empty or unreadable: $resolvedBackupFile"
  }

  Write-Host "Plain SQL backup is readable. Full restore validation requires restoring to a test database."
  exit 0
}

Assert-Command 'pg_restore'

$listOutput = & pg_restore --list $resolvedBackupFile
if ($LASTEXITCODE -ne 0) {
  throw 'pg_restore --list failed. Backup is not readable as a PostgreSQL custom-format dump.'
}

$objectCount = ($listOutput | Where-Object { $_ -and $_ -notmatch '^\s*;' }).Count
if ($objectCount -le 0) {
  throw 'Backup contains no restorable objects.'
}

Write-Host "Backup verified. Restorable objects: $objectCount"
