param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$DatabaseUrl = $env:DATABASE_URL,
  [switch]$PlainSql,
  [switch]$Clean,
  [switch]$Force
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

function Get-DatabaseTargetSummary {
  param([string]$Url)

  try {
    $uri = [System.Uri]$Url
    $databaseName = $uri.AbsolutePath.TrimStart('/')
    if (-not $databaseName) {
      $databaseName = '(unknown)'
    }

    return [ordered]@{
      Host = $uri.Host
      Port = if ($uri.Port -gt 0) { $uri.Port } else { '(default)' }
      Database = $databaseName
      User = $uri.UserInfo.Split(':')[0]
    }
  } catch {
    return [ordered]@{
      Host = '(unparseable)'
      Port = '(unparseable)'
      Database = '(unparseable)'
      User = '(unparseable)'
    }
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$envPathCandidates = @(
  (Join-Path $repoRoot '.env'),
  (Join-Path $repoRoot 'packages/database/.env')
)
$resolvedBackupFile = Resolve-Path $BackupFile

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
  throw 'DATABASE_URL must be a direct PostgreSQL URL for restore.'
}

if ($PlainSql) {
  Assert-Command 'psql'
} else {
  Assert-Command 'pg_restore'
}

$target = Get-DatabaseTargetSummary -Url $DatabaseUrl
Write-Host 'Restore target:'
Write-Host "Host: $($target.Host)"
Write-Host "Port: $($target.Port)"
Write-Host "Database: $($target.Database)"
Write-Host "User: $($target.User)"

if (-not $Force) {
  Write-Host 'Restore can overwrite database data.'
  Write-Host "Backup: $resolvedBackupFile"
  $confirmation = Read-Host "Type RESTORE to continue"
  if ($confirmation -ne 'RESTORE') {
    throw 'Restore cancelled.'
  }
}

Write-Host "Restoring database..."

if ($PlainSql) {
  if ($Clean) {
    Write-Warning 'The -Clean option is ignored for plain SQL backups. The SQL file controls restore behavior.'
  }
  & psql $DatabaseUrl -f $resolvedBackupFile
} else {
  $restoreArgs = @(
    '--no-owner',
    '--no-acl',
    '--dbname',
    $DatabaseUrl
  )

  if ($Clean) {
    $restoreArgs = @('--clean', '--if-exists') + $restoreArgs
  }

  & pg_restore @restoreArgs $resolvedBackupFile
}

if ($LASTEXITCODE -ne 0) {
  throw 'Database restore failed.'
}

Write-Host 'Restore complete.'
