# Restore Drill Checklist

Use this checklist before production launch and after major backup/recovery changes.

## Drill Scope

Target environment:

```text
staging or local test database
```

Backup under test:

```text
backups/database/hygieia-YYYYMMDD-HHMMSS.dump
```

R2 object key under test, if applicable:

```text
backups/database/hygieia-YYYYMMDD-HHMMSS.dump
```

Backup manifest version metadata:

```text
appVersion:
gitCommit:
```

## Steps

1. Create a fresh test database.
2. If testing cloud recovery, list and download the backup from R2:

   ```powershell
   pnpm run db:backup:list-r2 -- --limit 25
   pnpm run db:backup:download-r2 -- --key "backups/database/hygieia-YYYYMMDD-HHMMSS.dump"
   ```

3. Verify the backup file:

   ```powershell
   pnpm run db:backup:verify -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.dump"
   ```

4. Restore the backup:

   ```powershell
   pnpm run db:restore -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.dump" -Clean
   ```

5. For full R2 recovery, test the wrapper instead of separate download and restore steps:

   ```powershell
   pnpm run db:restore:r2 -- -ObjectKey "backups/database/hygieia-YYYYMMDD-HHMMSS.dump" -Clean
   ```

6. Run migrations if the app version is newer than the backup manifest version:

   ```powershell
   pnpm run db:migrate:deploy:local
   ```

7. Start API and web.
8. Log in as an admin.
9. Verify these screens load:

   ```text
   /accounts
   /service-locations
   /proposals
   /contracts
   /jobs
   /invoices
   /settings/global
   ```

10. Export the system configuration and photo manifest from Global Settings.
11. Open a service location photo or appointment photo and confirm the signed R2 view URL works.
12. Record the result below.

## Result

Date:

```text
YYYY-MM-DD
```

Backup file:

```text
filename
```

R2 object key:

```text
key or n/a
```

Backup app version / git commit:

```text
version / commit
```

Restore duration:

```text
minutes
```

Result:

```text
pass / fail
```

Issues found:

```text
none
```

Follow-up owner:

```text
name
```
