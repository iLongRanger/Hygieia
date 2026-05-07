param(
  [string]$ObjectKey = '',
  [string]$OutputDir = '',
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [switch]$Latest,
  [switch]$PlainSql,
  [switch]$Clean,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'backups/database/restored'
}

if (-not $Latest -and -not $ObjectKey) {
  throw 'Pass -Latest or -ObjectKey "backups/database/hygieia-YYYYMMDD-HHMMSS.dump".'
}

if ($Latest -and $ObjectKey) {
  throw 'Use either -Latest or -ObjectKey, not both.'
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw 'pnpm is required to download R2 backups.'
}

$beforeFiles = @()
if (Test-Path $OutputDir) {
  $beforeFiles = Get-ChildItem -Path $OutputDir -File |
    Select-Object -ExpandProperty FullName
}

$downloadArgs = @(
  'run',
  'db:backup:download-r2',
  '--',
  '--dir',
  $OutputDir
)

if ($Latest) {
  $downloadArgs += '--latest'
} else {
  $downloadArgs += @('--key', $ObjectKey)
}

Write-Host 'Downloading database backup from R2...'
& pnpm @downloadArgs
if ($LASTEXITCODE -ne 0) {
  throw 'R2 backup download failed.'
}

$downloadedFile = Get-ChildItem -Path $OutputDir -File |
  Where-Object {
    $_.Extension -match '^\.(dump|sql)$' -and
    ($beforeFiles -notcontains $_.FullName)
  } |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1

if (-not $downloadedFile) {
  $downloadedFile = Get-ChildItem -Path $OutputDir -File |
    Where-Object { $_.Extension -match '^\.(dump|sql)$' } |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
}

if (-not $downloadedFile) {
  throw "Could not find downloaded .dump or .sql backup in $OutputDir"
}

$isPlainSql = $PlainSql -or $downloadedFile.Extension -ieq '.sql'

$verifyArgs = @(
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  (Join-Path $PSScriptRoot 'verify-db-backup.ps1'),
  '-BackupFile',
  $downloadedFile.FullName
)

if ($isPlainSql) {
  $verifyArgs += '-PlainSql'
}

Write-Host "Verifying downloaded backup: $($downloadedFile.FullName)"
powershell @verifyArgs
if ($LASTEXITCODE -ne 0) {
  throw 'Downloaded backup verification failed.'
}

$restoreArgs = @(
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  (Join-Path $PSScriptRoot 'restore-db.ps1'),
  '-BackupFile',
  $downloadedFile.FullName
)

if ($DatabaseUrl) {
  $restoreArgs += @('-DatabaseUrl', $DatabaseUrl)
}

if ($isPlainSql) {
  $restoreArgs += '-PlainSql'
}

if ($Clean) {
  $restoreArgs += '-Clean'
}

if ($Force) {
  $restoreArgs += '-Force'
}

Write-Host 'Restoring downloaded backup...'
powershell @restoreArgs
if ($LASTEXITCODE -ne 0) {
  throw 'Database restore from R2 failed.'
}

Write-Host "Database restore from R2 complete: $($downloadedFile.FullName)"
