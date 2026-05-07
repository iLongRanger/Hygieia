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

## Steps

1. Create a fresh test database.
2. Verify the backup file:

   ```powershell
   pnpm run db:backup:verify -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.dump"
   ```

3. Restore the backup:

   ```powershell
   pnpm run db:restore -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.dump" -Clean
   ```

4. Run migrations if the app version is newer than the backup:

   ```powershell
   pnpm run db:migrate:deploy:local
   ```

5. Start API and web.
6. Log in as an admin.
7. Verify these screens load:

   ```text
   /accounts
   /service-locations
   /proposals
   /contracts
   /jobs
   /invoices
   /settings/global
   ```

8. Export the system configuration and photo manifest from Global Settings.
9. Open a service location photo or appointment photo and confirm the signed R2 view URL works.
10. Record the result below.

## Result

Date:

```text
YYYY-MM-DD
```

Backup file:

```text
filename
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
