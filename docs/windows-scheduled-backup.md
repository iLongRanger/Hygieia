# Windows Scheduled Backup

Use this when Hygieia is deployed on a Windows server or when a Windows admin workstation is responsible for scheduled backups.

## Prerequisites

- PostgreSQL client tools are installed and `pg_dump` is available in `PATH`.
- `pnpm` is available in `PATH`.
- Root `.env` or `packages/database/.env` contains the production `DATABASE_URL`.
- R2 backup variables are configured:

```text
R2_BACKUP_BUCKET_NAME
R2_BACKUP_PREFIX
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT or R2_ACCOUNT_ID
```

## Manual Smoke Test

Run this before creating a scheduled task:

```powershell
cd A:\Projects\Hygieia
pnpm run db:backup:check
pnpm run db:backup:scheduled
```

Confirm:

- A `.dump` file was created under `backups/database`.
- A `.manifest.json` file was created beside it.
- Both files were uploaded to R2.
- A transcript log was created under `backups/logs`.

## Create Scheduled Task

Run PowerShell as Administrator:

```powershell
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"cd 'A:\Projects\Hygieia'; pnpm run db:backup:scheduled`""

$trigger = New-ScheduledTaskTrigger -Daily -At 2:00am

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName "Hygieia Database Backup To R2" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Creates a Hygieia PostgreSQL backup and uploads it to R2."
```

## Verify Scheduled Task

```powershell
Start-ScheduledTask -TaskName "Hygieia Database Backup To R2"
Get-ScheduledTaskInfo -TaskName "Hygieia Database Backup To R2"
```

Then check:

- Local backup folder has a new dump and manifest.
- R2 has matching objects under `R2_BACKUP_PREFIX`.
- Windows Task Scheduler shows `LastTaskResult` as `0`.

## Logs And Retention

The scheduled backup command writes transcript logs to:

```text
backups/logs/
```

The scheduled backup command creates the backup, uploads it to R2, deletes old local backup files after successful upload, and deletes old scheduled backup logs.

Recommended production retention:

- Keep local backups for 7 days.
- Keep local scheduled backup logs for 30 days.
- Keep R2 daily backups for 30 days.
- Keep R2 weekly backups for 3-6 months.

Use R2 lifecycle rules for cloud retention.
See `docs/r2-lifecycle-policy.md` for the recommended R2 rules.

Local cleanup command:

```powershell
cd A:\Projects\Hygieia
pnpm run db:backup:cleanup-local -- -RetentionDays 7
```

Use the local cleanup command manually when you need to preview or override retention behavior outside the scheduled backup runner.
