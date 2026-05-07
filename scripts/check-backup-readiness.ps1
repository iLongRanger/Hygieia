param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$BackupDir = ''
)

$ErrorActionPreference = 'Stop'

function Read-EnvValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path $Path)) {
    return $null
  }

  $line = Get-Content $Path |
    Where-Object { $_ -match "^\s*$([regex]::Escape($Key))\s*=" } |
    Select-Object -First 1

  if (-not $line) {
    return $null
  }

  return ($line -replace "^\s*$([regex]::Escape($Key))\s*=\s*", '').Trim('"').Trim("'")
}

function Get-EnvValue {
  param(
    [string[]]$Keys,
    [string[]]$EnvFiles
  )

  foreach ($key in $Keys) {
    $value = [Environment]::GetEnvironmentVariable($key)
    if ($value) {
      return $value
    }
  }

  foreach ($envFile in $EnvFiles) {
    foreach ($key in $Keys) {
      $value = Read-EnvValue -Path $envFile -Key $key
      if ($value) {
        return $value
      }
    }
  }

  return $null
}

function Test-CommandAvailable {
  param([string]$Name)

  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Write-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )

  $status = if ($Passed) { 'PASS' } else { 'FAIL' }
  $color = if ($Passed) { 'Green' } else { 'Red' }
  Write-Host "[$status] $Name - $Detail" -ForegroundColor $color
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envFiles = @(
  (Join-Path $repoRoot '.env'),
  (Join-Path $repoRoot 'packages/database/.env')
)

if (-not $BackupDir) {
  $BackupDir = Join-Path $repoRoot 'backups/database'
}

if (-not $DatabaseUrl) {
  $DatabaseUrl = Get-EnvValue -Keys @('DATABASE_URL') -EnvFiles $envFiles
}

$checks = @()

$pgDumpAvailable = Test-CommandAvailable 'pg_dump'
$checks += $pgDumpAvailable
Write-Check 'pg_dump' $pgDumpAvailable 'Required to create PostgreSQL backups.'

$pgRestoreAvailable = Test-CommandAvailable 'pg_restore'
$checks += $pgRestoreAvailable
Write-Check 'pg_restore' $pgRestoreAvailable 'Required to verify and restore custom-format backups.'

$psqlAvailable = Test-CommandAvailable 'psql'
$checks += $psqlAvailable
Write-Check 'psql' $psqlAvailable 'Required to restore plain SQL backups.'

$pnpmAvailable = Test-CommandAvailable 'pnpm'
$checks += $pnpmAvailable
Write-Check 'pnpm' $pnpmAvailable 'Required to run backup upload helpers.'

$databaseUrlPresent = [bool]$DatabaseUrl
$databaseUrlDirect = $databaseUrlPresent -and $DatabaseUrl -match '^postgres(ql)?://'
$checks += $databaseUrlPresent
$checks += $databaseUrlDirect
Write-Check 'DATABASE_URL present' $databaseUrlPresent 'Read from shell, root .env, or packages/database/.env.'
Write-Check 'DATABASE_URL direct PostgreSQL' $databaseUrlDirect 'Must start with postgresql:// for pg_dump and pg_restore.'

$r2Bucket = Get-EnvValue -Keys @('R2_BACKUP_BUCKET_NAME', 'R2_BUCKET_NAME', 'CLOUDFLARE_R2_BUCKET') -EnvFiles $envFiles
$r2AccessKey = Get-EnvValue -Keys @('R2_ACCESS_KEY_ID', 'CLOUDFLARE_R2_ACCESS_KEY_ID') -EnvFiles $envFiles
$r2Secret = Get-EnvValue -Keys @('R2_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY') -EnvFiles $envFiles
$r2Endpoint = Get-EnvValue -Keys @('R2_ENDPOINT') -EnvFiles $envFiles
$r2AccountId = Get-EnvValue -Keys @('R2_ACCOUNT_ID') -EnvFiles $envFiles

$r2Configured = [bool]($r2Bucket -and $r2AccessKey -and $r2Secret -and ($r2Endpoint -or $r2AccountId))
$checks += $r2Configured
Write-Check 'R2 backup configuration' $r2Configured 'Requires bucket, access key, secret key, and endpoint or account id.'

$backupDirExists = Test-Path $BackupDir
if (-not $backupDirExists) {
  New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
  $backupDirExists = Test-Path $BackupDir
}
$checks += $backupDirExists
Write-Check 'Backup directory' $backupDirExists "Directory: $BackupDir"

if ($checks -contains $false) {
  throw 'Backup readiness check failed. Fix failed checks before enabling scheduled backups.'
}

Write-Host 'Backup readiness check passed.' -ForegroundColor Green
