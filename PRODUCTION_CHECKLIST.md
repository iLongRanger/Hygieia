# Production Deployment Checklist

Use this checklist for every production release.

## 1. Release Readiness (Must Pass Before Deploy)

- [ ] Product owner sign-off on scope for this release
- [ ] All critical tests pass (`api`, `web`, and targeted regression tests)
- [ ] Manual UAT completed for core flows:
  - [ ] Proposal -> Contract -> Activation -> Recurring job generation
  - [ ] Quotation approval -> One-time job creation
  - [ ] Job assignment (team/internal/subcontractor)
  - [ ] Invoice manual creation + bulk generation
- [ ] No blocking open bugs for billing, jobs, contracts, auth
- [ ] Migration plan reviewed and confirmed for this release

## 2. Production Environment and Secrets

### Supabase

```bash
# Supabase Dashboard -> Settings -> API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase Dashboard -> Settings -> Database -> Connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### Required Variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_JWT_SECRET` | JWT secret for verification |
| `REDIS_URL` | Redis connection string |
| `DB_ENCRYPTION_KEY` | 32-char key |
| `FILE_ENCRYPTION_KEY` | 64-char key |

### Security Checks

- [ ] All placeholder/test keys removed
- [ ] `NODE_ENV=production`
- [ ] `RATE_LIMIT_ENABLED=true`
- [ ] CORS restricted to production web domain(s)
- [ ] HTTPS/SSL enabled end to end
- [ ] Database SSL required
- [ ] Public URLs do not point to localhost

## 3. Database and Migration Safety

- [ ] Take a full production DB backup/snapshot before deployment
- [ ] Confirm current migration status
- [ ] Apply migrations in production
- [ ] Run seed only if required for missing baseline data
- [ ] Validate new columns/indexes exist (spot check critical tables)

```bash
pnpm run db:migrate:status
pnpm run db:migrate:deploy
# Optional, only when needed:
pnpm run db:seed
```

## 4. Jobs, Queues, and Scheduler Readiness

- [ ] Worker process is running in production
- [ ] Scheduled jobs/cron triggers are enabled
- [ ] Contract recurring generation runs correctly (30-day window logic)
- [ ] End-time alert job is running (2-hour pre-end notification)
- [ ] Failed job retry policy configured and tested

## 5. Deploy Execution

- [ ] Deploy API
- [ ] Deploy Web
- [ ] Run DB migration step (if not run as part of pipeline)
- [ ] Confirm app health endpoints return OK
- [ ] Confirm login works for admin account

## 6. Post-Deploy Verification (First 30-60 Minutes)

- [ ] Create test proposal and verify details rendering
- [ ] Activate a contract and verify recurring jobs are generated
- [ ] Approve a quotation and verify one-time job is generated
- [ ] Assign a team/internal employee to generated job successfully
- [ ] Create manual invoice and verify line items/tax calculations
- [ ] Confirm dashboard loads and job-day counters are correct
- [ ] Check logs for new errors and warnings

## 7. Monitoring and Alerts

- [ ] Error tracking configured (for example Sentry)
- [ ] Centralized logs enabled and searchable
- [ ] Uptime monitor enabled for API and Web
- [ ] Alert routing configured (email/Slack/etc.)

## 8. Rollback Plan (Prepared Before Deploy)

- [ ] Previous stable app image/version identified
- [ ] DB rollback strategy documented (restore backup if needed)
- [ ] Owner assigned for go/no-go and rollback decision
- [ ] Rollback dry-run performed at least once in staging

## 9. Multi-Customer (Separate DB per Customer) Readiness

Use this section when onboarding each new customer with dedicated DB.

- [ ] Create customer database
- [ ] Apply migrations to customer DB
- [ ] Seed baseline data
- [ ] Register tenant/customer to DB mapping in control config
- [ ] Run provisioning smoke test with customer admin user
- [ ] Confirm backup policy is active for customer DB

## 10. Pre-Go-Live Migration Hygiene

- [ ] Keep migration history intact in production
- [ ] If needed, squash noisy development migrations only before broad go-live
- [ ] After go-live, use incremental forward-only migrations
