# Subcontractor Portal Access Design

## Summary

Enable subcontractors to log into Hygieia and see their assigned contracts, jobs, time tracking, and payout information. Uses the existing auth system with a new `subcontractor` role linked to the Team model.

## Requirements

- One login per subcontractor company (expandable to multi-user later)
- Subcontractors can: view contracts/jobs, update job status, log time
- Subcontractors see their payout amount (never the full contract value)
- Account auto-created on first contract assignment, with password-set email
- Same app UI with limited sidebar navigation

## Approach

Add a 5th role (`subcontractor`) to the existing RBAC system. Link User to Team via a `teamId` foreign key. Scope all data access through the existing ownership middleware.

## Data Model Changes

### User model — add `teamId`

```prisma
model User {
  // ...existing fields...
  teamId    String?  @map("team_id") @db.Uuid
  team      Team?    @relation(fields: [teamId], references: [id])
}
```

### Team model — add `users` relation

```prisma
model Team {
  // ...existing fields...
  users     User[]
}
```

### Role system — add `subcontractor`

```typescript
// roles.ts
subcontractor: { hierarchy: 10 }  // Below cleaner (25)
```

### Subcontractor permissions

```typescript
{
  contracts_read: true,      // Scoped to their team's contracts
  jobs_read: true,           // Scoped to their team's jobs
  jobs_write: true,          // Can update job status
  time_tracking_read: true,  // Only their entries
  time_tracking_write: true, // Can log time
  facilities_read: true,     // Only facilities from their contracts
}
```

### Password reset token

```prisma
model PasswordSetToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("password_set_tokens")
}
```

## Auto-Provisioning Flow

When a Team is assigned to a contract (`PATCH /contracts/:id/team`):

1. Check if Team already has a linked User (via `team.users`)
2. If no linked User exists:
   a. Create User with `email=team.contactEmail`, `fullName=team.contactName`, `teamId=team.id`, `passwordHash=null`
   b. Assign `subcontractor` role via UserRole
   c. Generate a PasswordSetToken (random UUID, 72h expiry)
   d. Send welcome email with password-set link
3. If User already exists:
   a. Send "New contract assigned" notification only

### Password Set Page

- Route: `/auth/set-password?token=xxx`
- Validates token exists, not expired, not used
- User enters new password (with confirmation)
- Hashes password, updates User.passwordHash, marks token as used
- Redirects to login

## Data Scoping

### Ownership middleware — subcontractor case

```
When role === 'subcontractor':
  teamId = user.teamId

  Contract: contract.assignedTeamId === teamId
  Job: job.assignedTeamId === teamId
  Facility: facility has a contract where assignedTeamId === teamId
  TimeEntry: timeEntry.userId === user.id
```

### List endpoint filtering

All list endpoints (contracts, jobs, time entries) add a `WHERE assignedTeamId = user.teamId` filter when the requesting user has role `subcontractor`.

### Hidden data

Subcontractors never see:
- `Contract.monthlyValue` or `Contract.totalValue` (replaced with calculated payout)
- Leads, Accounts, Contacts
- Proposals, Quotations, Invoices
- Pricing settings, Teams list, User management
- Other teams' data

### Visible payout calculation

```
subcontractorPayout = contract.monthlyValue * tierToPercentage(contract.subcontractorTier)
```

Only the payout is returned in the API response for subcontractor users.

## Frontend Changes

### Sidebar navigation (subcontractor role)

```
Dashboard        — Subcontractor-specific overview
My Contracts     — /contracts (filtered to team's contracts)
My Jobs          — /jobs (filtered to team's jobs)
Time Tracking    — /time-tracking (filtered to own entries)
Profile          — /profile (change password, contact info)
```

All other sidebar items hidden.

### Contract detail — subcontractor view

- Hides full contract value
- Shows "Your Payout: $X,XXX/mo" card
- Hides Edit/Send/Activate/Archive actions
- Hides assignment management card
- Shows: service schedule, facility info, job list

### Job list/detail — subcontractor view

- Full job visibility for their team's jobs
- Can update status: scheduled -> in_progress -> completed
- Cannot cancel or delete jobs

### Subcontractor dashboard

Simple overview:
- Active contracts count + list
- Upcoming jobs this week
- Hours logged this period
- Total monthly payout across contracts

## Future Expansion (TODO)

- Multiple users per subcontractor team (additional users get `subcontractor` role + same teamId)
- Subcontractor-visible inspections
- In-app messaging between admin and subcontractor
- Subcontractor document uploads (insurance, certifications)
