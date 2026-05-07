# Backup and Recovery Runbook

This runbook defines the first production-ready backup and restore process for Hygieia.

## What Must Be Protected

| Data                                                             | Location                  | Recovery priority |
| ---------------------------------------------------------------- | ------------------------- | ----------------- |
| CRM, sales, operations, finance, contracts, proposals, invoices  | PostgreSQL                | Critical          |
| Users, roles, teams, permissions, settings                       | PostgreSQL                | Critical          |
| Pricing, area templates, task templates, specialized job catalog | PostgreSQL                | Critical          |
| Photo metadata                                                   | PostgreSQL `photo_assets` | Critical          |
| Uploaded photos                                                  | Cloudflare R2             | High              |
| Environment secrets                                              | Hosting secret manager    | Critical          |

## Backup Targets

Use two backup layers:

1. PostgreSQL backups created with `pg_dump`.
2. R2 object retention for uploaded photos.

Database backups should be stored outside the application server. R2 is acceptable for low-cost backup storage if the backup bucket is private and lifecycle rules are configured.

## Database Backup

Create a compressed PostgreSQL custom-format backup:

```powershell
pnpm run db:backup
```

The script reads `DATABASE_URL` from the current shell, root `.env`, or `packages/database/.env` and writes to:

```text
backups/database/
```

To choose a different output directory:

```powershell
pnpm run db:backup -- -OutputDir "D:\HygieiaBackups"
```

To create plain SQL instead of a custom-format dump:

```powershell
pnpm run db:backup -- -PlainSql
```

## Database Restore

Restore a custom-format backup:

```powershell
pnpm run db:restore -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.dump"
```

Restore and clean existing matching objects first:

```powershell
pnpm run db:restore -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.dump" -Clean
```

Restore a plain SQL backup:

```powershell
pnpm run db:restore -- -BackupFile "backups/database/hygieia-YYYYMMDD-HHMMSS.sql" -PlainSql
```

The restore script asks for confirmation unless `-Force` is passed.

## Recovery Order

1. Stop the API and background schedulers.
2. Confirm the target database is the correct environment.
3. Restore the database backup.
4. Run Prisma migrations if the backup is older than the current app version.
5. Start the API.
6. Verify login, accounts, service locations, contracts, proposals, jobs, invoices, and public links.
7. Verify R2 photo links by opening service location and appointment photos.

## Verification Checklist

- Admin can log in.
- Account list loads.
- Service location detail loads.
- Proposal and contract public links open.
- Active contract shows correct service location, price, tax, and assignment.
- Job list loads for the restored period.
- Invoice totals and tax are correct.
- Uploaded photos can generate signed view URLs.

## Recommended Schedule

| Environment | Frequency                         | Retention  |
| ----------- | --------------------------------- | ---------- |
| Production  | Daily full DB backup              | 30 days    |
| Production  | Weekly full DB backup             | 3-6 months |
| Staging     | Daily or before test cycles       | 7-14 days  |
| Development | Manual before destructive testing | As needed  |

## R2 Photo Recovery Notes

The database stores photo metadata and object keys. R2 stores the actual photo bytes.

Current behavior:

- Deleting a photo archives the metadata.
- The R2 object is retained.
- Failed uploads can leave pending metadata.

Production follow-up:

- Add a scheduled cleanup for stale pending photo records.
- Decide whether archived photos should be retained forever or deleted from R2 after a retention window.
- Export a periodic `photo_assets` manifest so R2 objects can be audited against database records.

## Import and Export Scope

User-facing exports should be separate from disaster recovery backups.

Recommended admin exports:

- Pricing settings export/import.
- Area type and task template export/import.
- Specialized job catalog export/import.
- People and subcontractor access export.
- Finance reports export.
- Photo asset manifest export.

These exports should use JSON or CSV and should not replace full database backups.

Initial API export:

```text
GET /api/v1/system-config/export
```

This endpoint exports portable baseline setup data for settings, pricing, specialized catalog, fixture types, area types, task templates, and area templates. It intentionally excludes CRM, sales, operations, finance transactions, service-location-specific task templates, users, and credentials.
