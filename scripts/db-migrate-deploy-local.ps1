$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
Write-Host "Repo root: $repoRoot"

# Stop Hygieia node processes to release Prisma engine lock.
$hygieiaNodeProcesses = @()
try {
  $hygieiaNodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
    Where-Object { $_.CommandLine -like '*A:\Projects\Hygieia*' }
} catch {
  Write-Warning "Could not inspect running node processes in this shell. If prisma generate fails, stop API dev first and rerun."
}

if ($hygieiaNodeProcesses -and $hygieiaNodeProcesses.Count -gt 0) {
  Write-Host "Stopping Hygieia node processes to release Prisma engine lock..."
  foreach ($proc in $hygieiaNodeProcesses) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped PID $($proc.ProcessId)"
    } catch {
      Write-Warning "Failed to stop PID $($proc.ProcessId): $($_.Exception.Message)"
    }
  }
} else {
  Write-Host "No running API node process found (or process lookup unavailable)."
}

Set-Location (Join-Path $repoRoot 'packages/database')

Write-Host "Running prisma migrate deploy..."
pnpm prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  throw "prisma migrate deploy failed. Stop running API dev server and rerun this script."
}

Write-Host "Running prisma generate..."
pnpm prisma generate
if ($LASTEXITCODE -ne 0) {
  throw "prisma generate failed (likely Prisma engine file lock). Stop API dev server and rerun."
}

Write-Host "Done. Restart your API dev server."
