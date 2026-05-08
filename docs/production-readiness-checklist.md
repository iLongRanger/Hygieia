# Production Readiness Checklist

Use this before deploying or promoting a build to production.

## Required

- Confirm `SYSTEM_TIME_OVERRIDE` and `SYSTEM_NOW_OVERRIDE` are not set in server, worker, scheduler, Docker, hosting, or CI/CD production environments.
- Run database migrations against a staging database before production.
- Confirm `DATABASE_URL` points to managed PostgreSQL in production, not a local development database.
- Confirm public URLs are production URLs: `FRONTEND_URL`, API origin, proposal links, contract links, and invoice links.
- Confirm email and SMS credentials are production-ready and sender identities are verified.
- Confirm Cloudflare R2 backup credentials and lifecycle policies are set.
- Run a backup readiness check and complete a restore drill before launch.
- Confirm RBAC roles for finance, operations, CRM, settings, and backup access.
- Confirm background services are enabled only where intended: reminders, job alerts, recurring jobs, payroll checks, and backup scheduler.
- Run targeted tests for recently changed modules and a production smoke test after deployment.

## Dev-Only Settings To Remove

- `SYSTEM_TIME_OVERRIDE`: used only for manually testing date-based reminders and job checks.
- `SYSTEM_NOW_OVERRIDE`: alias for manual date testing.

These clock overrides are ignored by the API when `NODE_ENV=production`, but they should still be removed from production configuration to avoid confusion during support and troubleshooting.
