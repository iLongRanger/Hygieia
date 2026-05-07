# R2 Lifecycle Policy

Use Cloudflare R2 lifecycle rules to control long-term storage cost. The app creates object keys, but bucket retention should be enforced at the bucket level.

## Recommended Buckets

Use either:

- One private bucket with prefixes.
- Separate private buckets for photos and backups.

Recommended prefix layout if using one bucket:

```text
photo-assets/
backups/database/
backups/manifests/
```

## Database Backup Retention

Recommended lifecycle rules for `backups/database/`:

| Rule                     | Prefix                     | Action                             |
| ------------------------ | -------------------------- | ---------------------------------- |
| Daily backup retention   | `backups/database/`        | Delete objects older than 30 days  |
| Weekly archive retention | `backups/database/weekly/` | Delete objects older than 180 days |

If weekly archives are needed, copy or upload selected backup files to:

```text
backups/database/weekly/
```

## Manifest Retention

Recommended lifecycle rule for backup manifests:

| Rule                      | Prefix              | Action                      |
| ------------------------- | ------------------- | --------------------------- |
| Backup manifest retention | `backups/database/` | Keep manifests with backups |

Because manifests are small, keep them for the same duration as their matching backup file.

## Photo Retention

Photos are operational records. Do not aggressively delete active photo objects.

Recommended lifecycle approach:

| Photo state                              | Storage behavior                                          |
| ---------------------------------------- | --------------------------------------------------------- |
| Active uploaded photo                    | Retain indefinitely                                       |
| Archived photo metadata                  | Retain object until a business retention rule is approved |
| Pending upload older than cleanup window | Delete metadata and optionally delete object if it exists |

Current app behavior:

- Deleting a photo archives metadata.
- R2 object is retained.
- Pending failed uploads need cleanup work before production.

## Cloudflare Dashboard Steps

1. Open Cloudflare Dashboard.
2. Go to `R2 Object Storage`.
3. Select the bucket.
4. Open `Settings`.
5. Open `Lifecycle rules`.
6. Add a rule for `backups/database/`.
7. Set object expiration to the chosen retention window.
8. Save and test with a non-production bucket first.

## Cost Control Notes

- Keep database backups compressed.
- Do not upload raw uncompressed SQL backups unless needed for portability.
- Use `pnpm run db:backup:cleanup-local` for local disk cleanup.
- Export photo manifests periodically so orphaned R2 objects can be audited.
