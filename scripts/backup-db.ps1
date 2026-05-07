param(
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [string]$OutputDir = '',
  [string]$NamePrefix = 'hygieia',
  [switch]$PlainSql
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

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. Install PostgreSQL client tools and make sure $Name is available in PATH."
  }
}

function Get-AppVersion {
  param([string]$RepoRoot)

  $packageJsonPath = Join-Path $RepoRoot 'package.json'
  if (-not (Test-Path $packageJsonPath)) {
    return $null
  }

  try {
    $packageJson = Get-Content -Raw $packageJsonPath | ConvertFrom-Json
    return $packageJson.version
  } catch {
    return $null
  }
}

function Get-GitCommit {
  param([string]$RepoRoot)

  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    return $null
  }

  Push-Location $RepoRoot
  try {
    $commit = git rev-parse --short HEAD 2>$null
    if ($LASTEXITCODE -ne 0) {
      return $null
    }
    return $commit
  } finally {
    Pop-Location
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envPathCandidates = @(
  (Join-Path $repoRoot '.env'),
  (Join-Path $repoRoot 'packages/database/.env')
)

if (-not $DatabaseUrl) {
  foreach ($envPath in $envPathCandidates) {
    $DatabaseUrl = Read-EnvValue -Path $envPath -Key 'DATABASE_URL'
    if ($DatabaseUrl) {
      break
    }
  }
}

if (-not $DatabaseUrl) {
  throw 'DATABASE_URL is required. Set it in the shell, root .env, or pass -DatabaseUrl.'
}

if ($DatabaseUrl -notmatch '^postgres(ql)?://') {
  throw 'DATABASE_URL must be a direct PostgreSQL URL for pg_dump.'
}

Assert-Command 'pg_dump'

if (-not $OutputDir) {
  $OutputDir = Join-Path $repoRoot 'backups/database'
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$extension = if ($PlainSql) { 'sql' } else { 'dump' }
$backupFile = Join-Path $OutputDir "$NamePrefix-$timestamp.$extension"
$manifestFile = Join-Path $OutputDir "$NamePrefix-$timestamp.manifest.json"

Write-Host "Creating database backup..."
Write-Host "Output: $backupFile"

if ($PlainSql) {
  & pg_dump --no-owner --no-acl --file $backupFile $DatabaseUrl
} else {
  & pg_dump --format custom --compress 9 --no-owner --no-acl --file $backupFile $DatabaseUrl
}

if ($LASTEXITCODE -ne 0) {
  throw 'pg_dump failed.'
}

$backupInfo = Get-Item $backupFile
$checksum = Get-FileHash -Algorithm SHA256 -Path $backupFile
$manifest = [ordered]@{
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
  backupFile = $backupInfo.Name
  format = if ($PlainSql) { 'plain-sql' } else { 'pg-custom' }
  sizeBytes = $backupInfo.Length
  sha256 = $checksum.Hash.ToLowerInvariant()
  appVersion = Get-AppVersion -RepoRoot $repoRoot
  gitCommit = Get-GitCommit -RepoRoot $repoRoot
  databaseUrlProtocol = ($DatabaseUrl -split '://')[0]
  restoreCommand = if ($PlainSql) {
    "pnpm run db:restore -- -BackupFile `"$backupFile`" -PlainSql"
  } else {
    "pnpm run db:restore -- -BackupFile `"$backupFile`""
  }
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestFile -Encoding UTF8

Write-Host "Backup complete."
Write-Host "Manifest: $manifestFile"
