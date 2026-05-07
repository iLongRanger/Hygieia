param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDir = '',
  [string]$NamePrefix = 'hygieia',
  [switch]$PlainSql,
  [switch]$SkipManifestUpload
)

$ErrorActionPreference = 'Stop'

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. Install it and make sure $Name is available in PATH."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'backups/database'
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$startedAt = Get-Date
$backupArgs = @(
  '-File',
  (Join-Path $PSScriptRoot 'backup-db.ps1'),
  '-OutputDir',
  $OutputDir,
  '-NamePrefix',
  $NamePrefix
)

if ($DatabaseUrl) {
  $backupArgs += @('-DatabaseUrl', $DatabaseUrl)
}

if ($PlainSql) {
  $backupArgs += '-PlainSql'
}

Write-Host 'Creating local database backup before R2 upload...'
powershell -ExecutionPolicy Bypass @backupArgs
if ($LASTEXITCODE -ne 0) {
  throw 'Database backup failed; R2 upload was not attempted.'
}

$extension = if ($PlainSql) { '*.sql' } else { '*.dump' }
$backupFile = Get-ChildItem -Path $OutputDir -Filter $extension |
  Where-Object { $_.LastWriteTime -ge $startedAt.AddSeconds(-2) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $backupFile) {
  throw "Could not identify the newly created backup file in $OutputDir"
}

Assert-Command 'pnpm'

$uploadArgs = @(
  'tsx',
  'src/scripts/uploadBackupToR2.ts',
  '--file',
  $backupFile.FullName
)

if (-not $SkipManifestUpload) {
  $uploadArgs += '--include-manifest'
}

Write-Host "Uploading backup to R2: $($backupFile.FullName)"
Push-Location (Join-Path $repoRoot 'apps/api')
try {
  pnpm @uploadArgs
  if ($LASTEXITCODE -ne 0) {
    throw 'R2 upload failed.'
  }
} finally {
  Pop-Location
}

Write-Host 'Backup and R2 upload complete.'
