# Production Deployment Checklist

## Pre-Production Requirements

### 1. Supabase Configuration (REQUIRED)

Before deploying to production, provide the following from your Supabase dashboard:

```bash
# From Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# From Supabase Dashboard → Settings → Database → Connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 2. Environment Variables

Update `.env` with production values:

| Variable              | Description                            | Source             |
| --------------------- | -------------------------------------- | ------------------ |
| `DATABASE_URL`        | PostgreSQL connection string           | Supabase Dashboard |
| `SUPABASE_URL`        | Supabase project URL                   | Supabase Dashboard |
| `SUPABASE_ANON_KEY`   | Public anon key                        | Supabase Dashboard |
| `SUPABASE_JWT_SECRET` | JWT secret for verification            | Supabase Dashboard |
| `REDIS_URL`           | Redis connection (Upstash recommended) | Redis provider     |
| `DB_ENCRYPTION_KEY`   | 32-char encryption key                 | Generate securely  |
| `FILE_ENCRYPTION_KEY` | 64-char encryption key                 | Generate securely  |

### 3. Security Checklist

- [ ] All placeholder keys replaced with production values
- [ ] `NODE_ENV=production`
- [ ] `RATE_LIMIT_ENABLED=true`
- [ ] CORS origin set to production domain
- [ ] SSL/HTTPS enabled
- [ ] Database connection uses SSL

### 4. Database Migration

```bash
# Run migrations on production database
pnpm run db:migrate:deploy

# Seed initial data (roles, area types, etc.)
pnpm run db:seed
```

### 5. Optional Integrations

- [ ] QuickBooks OAuth credentials (if using)
- [ ] Resend API key for emails (if using)
- [ ] S3/cloud storage credentials (if using)

## Current Development Setup (Local)

- Database: Local PostgreSQL via Docker
- Auth: Deferred until Supabase configured
- Redis: Local via Docker
