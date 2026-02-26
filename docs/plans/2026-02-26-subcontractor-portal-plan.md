# Subcontractor Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable subcontractors to log into Hygieia and view assigned contracts, manage job status, and log time entries.

**Architecture:** Add a `subcontractor` role to the existing RBAC system. Link User to Team via a `teamId` FK. Auto-provision subcontractor accounts when a team is first assigned to a contract. Scope all data via the ownership middleware. Same app UI with filtered sidebar navigation.

**Tech Stack:** Prisma (schema + migrations), Express middleware, JWT auth, React + Tailwind (frontend), Resend (email)

---

### Task 1: Database Schema — Add `teamId` to User and `PasswordSetToken` model

**Files:**
- Modify: `packages/database/prisma/schema.prisma` (User model ~line 17, Team model ~line 995)

**Step 1: Add `teamId` to User model**

In the User model (after `avatarUrl` field, ~line 26), add:

```prisma
  teamId          String?   @map("team_id") @db.Uuid
  team            Team?     @relation(fields: [teamId], references: [id])
```

**Step 2: Add `users` relation to Team model**

In the Team model (~line 1010, after `createdByUser` relation), add:

```prisma
  users           User[]
```

**Step 3: Add `PasswordSetToken` model**

After the `RefreshToken` model (~line 106), add:

```prisma
model PasswordSetToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique @default(uuid())
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@map("password_set_tokens")
}
```

Also add the reverse relation on the User model:

```prisma
  passwordSetTokens PasswordSetToken[]
```

**Step 4: Generate and apply migration**

Run:
```bash
cd packages/database && npx prisma migrate dev --name add_subcontractor_portal_fields
```

**Step 5: Commit**

```bash
git add packages/database/prisma/
git commit -m "feat: add teamId to User and PasswordSetToken model for subcontractor portal"
```

---

### Task 2: Backend — Add `subcontractor` role to RBAC system

**Files:**
- Modify: `apps/api/src/types/roles.ts` (lines 1, 7-216, 219-224, 248-252)
- Modify: `apps/web/src/lib/permissions.ts` (lines 71, 79-199, 201-203)

**Step 1: Update the UserRole type and role permissions (backend)**

In `apps/api/src/types/roles.ts`:

Line 1 — add `subcontractor` to type:
```typescript
export type UserRole = 'owner' | 'admin' | 'manager' | 'cleaner' | 'subcontractor';
```

After the `cleaner` permissions block (~line 216), add:
```typescript
  subcontractor: {
    dashboard_read: true,
    contracts_read: true,
    facilities_read: true,
    jobs_read: true,
    jobs_write: true,
    time_tracking_read: true,
    time_tracking_write: true,
  },
```

In `ROLE_HIERARCHY` (~line 224), add:
```typescript
  subcontractor: 10,
```

In `VALID_ROLES` (~line 248), add `'subcontractor'`:
```typescript
const VALID_ROLES: UserRole[] = ['owner', 'admin', 'manager', 'cleaner', 'subcontractor'];
```

**Step 2: Update the frontend permissions mirror**

In `apps/web/src/lib/permissions.ts`:

Line 71 — add to UserRole type:
```typescript
export type UserRole = 'owner' | 'admin' | 'manager' | 'cleaner' | 'subcontractor';
```

After the `cleaner` block (~line 198), add:
```typescript
  subcontractor: {
    dashboard_read: true,
    contracts_read: true,
    facilities_read: true,
    jobs_read: true,
    jobs_write: true,
    time_tracking_read: true,
    time_tracking_write: true,
  },
```

In `isUserRole` (~line 202), add `'subcontractor'`:
```typescript
  return ['owner', 'admin', 'manager', 'cleaner', 'subcontractor'].includes(role);
```

**Step 3: Commit**

```bash
git add apps/api/src/types/roles.ts apps/web/src/lib/permissions.ts
git commit -m "feat: add subcontractor role with limited permissions"
```

---

### Task 3: Backend — Extend ownership middleware for subcontractor scoping

**Files:**
- Modify: `apps/api/src/middleware/ownership.ts` (~lines 135-190)
- Modify: `apps/api/src/middleware/auth.ts` (~line 85, user object)

**Step 1: Add `teamId` to the auth user object**

In `apps/api/src/middleware/auth.ts`, where `req.user` is set (~line 85), ensure `teamId` is included. Find the user query and add `teamId` to the select. Update the `req.user` assignment to include `teamId`:

```typescript
req.user = {
  id: user.id,
  supabaseUserId: user.supabaseUserId,
  email: user.email,
  fullName: user.fullName,
  role: primaryRole,
  teamId: user.teamId,
};
```

Also update the Express `Request` type extension to include `teamId?: string | null`.

**Step 2: Add subcontractor case to ownership middleware**

In `apps/api/src/middleware/ownership.ts`, in the `verifyOwnership()` function, add a case for `subcontractor` role. After the owner/admin bypass (~line 151) and before the manager check:

```typescript
// Subcontractor: can only access resources assigned to their team
if (req.user.role === 'subcontractor') {
  const teamId = req.user.teamId;
  if (!teamId) {
    return res.status(403).json({ error: 'Subcontractor has no team assigned' });
  }

  let hasAccess = false;

  if (resourceType === 'contract') {
    const contract = await prisma.contract.findUnique({
      where: { id: resourceId },
      select: { assignedTeamId: true },
    });
    hasAccess = contract?.assignedTeamId === teamId;
  } else if (resourceType === 'facility') {
    // Facility access: has at least one contract assigned to their team at this facility
    const count = await prisma.contract.count({
      where: { facilityId: resourceId, assignedTeamId: teamId },
    });
    hasAccess = count > 0;
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }
  return next();
}
```

**Step 3: Commit**

```bash
git add apps/api/src/middleware/
git commit -m "feat: extend ownership middleware for subcontractor team scoping"
```

---

### Task 4: Backend — Scope contract and job list endpoints for subcontractors

**Files:**
- Modify: `apps/api/src/services/contractService.ts` (list function)
- Modify: `apps/api/src/services/jobService.ts` (list function)

**Step 1: Filter contract list by teamId for subcontractor role**

In the contract list service function, add a filter when the requesting user has role `subcontractor`. Pass the user's role and teamId from the route handler. Add to the Prisma `where` clause:

```typescript
// If subcontractor, scope to their team's contracts only
if (userRole === 'subcontractor' && userTeamId) {
  where.assignedTeamId = userTeamId;
}
```

**Step 2: Filter job list by teamId for subcontractor role**

Same pattern in the job list service:

```typescript
if (userRole === 'subcontractor' && userTeamId) {
  where.assignedTeamId = userTeamId;
}
```

**Step 3: Hide sensitive contract fields for subcontractors**

In the contract detail route handler, if the user is a subcontractor, strip `monthlyValue` and `totalValue` from the response and replace with a `subcontractorPayout` field:

```typescript
if (req.user.role === 'subcontractor') {
  const tierPct = tierToPercentage(contract.subcontractorTier);
  const payout = Number(contract.monthlyValue) * tierPct;
  // Remove full value, add payout
  const { monthlyValue, totalValue, ...safeContract } = contract;
  return res.json({ data: { ...safeContract, subcontractorPayout: payout } });
}
```

**Step 4: Update route handlers to pass user context**

In `apps/api/src/routes/contracts.ts` (GET `/` handler ~line 132), pass `req.user.role` and `req.user.teamId` to the service function.

Same for `apps/api/src/routes/jobs.ts` GET `/` handler.

**Step 5: Commit**

```bash
git add apps/api/src/services/contractService.ts apps/api/src/services/jobService.ts apps/api/src/routes/contracts.ts apps/api/src/routes/jobs.ts
git commit -m "feat: scope contract and job lists for subcontractor role"
```

---

### Task 5: Backend — Auto-provision subcontractor user on team assignment

**Files:**
- Modify: `apps/api/src/routes/contracts.ts` (~line 443, team assignment endpoint)
- Modify: `apps/api/src/services/authService.ts` (add `createSubcontractorUser` function)
- Create: `apps/api/src/templates/subcontractorWelcome.ts`

**Step 1: Add `createSubcontractorUser` to authService**

In `apps/api/src/services/authService.ts`, add a new function:

```typescript
export async function createSubcontractorUser(teamId: string): Promise<{ user: any; token: string } | null> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { users: true },
  });

  if (!team || !team.contactEmail) return null;

  // If team already has a linked user, skip creation
  if (team.users.length > 0) return null;

  // Find or create the 'subcontractor' role
  let subRole = await prisma.role.findUnique({ where: { key: 'subcontractor' } });
  if (!subRole) {
    subRole = await prisma.role.create({
      data: {
        key: 'subcontractor',
        label: 'Subcontractor',
        permissions: {
          dashboard_read: true,
          contracts_read: true,
          facilities_read: true,
          jobs_read: true,
          jobs_write: true,
          time_tracking_read: true,
          time_tracking_write: true,
        },
        isSystemRole: true,
      },
    });
  }

  // Create the user (no password yet)
  const user = await prisma.user.create({
    data: {
      email: team.contactEmail.toLowerCase(),
      fullName: team.contactName || team.name,
      teamId: team.id,
      status: 'pending', // Pending until they set password
      roles: {
        create: { roleId: subRole.id },
      },
    },
  });

  // Create password set token (72 hour expiry)
  const passwordToken = await prisma.passwordSetToken.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    },
  });

  return { user, token: passwordToken.token };
}
```

**Step 2: Create welcome email template**

Create `apps/api/src/templates/subcontractorWelcome.ts`:

```typescript
import type { GlobalBranding } from './types';

interface SubcontractorWelcomeData {
  teamName: string;
  contractNumber: string;
  facilityName: string;
  setPasswordUrl: string;
}

export function buildSubcontractorWelcomeSubject(): string {
  return 'Welcome to Hygieia — Set Up Your Account';
}

export function buildSubcontractorWelcomeHtml(
  data: SubcontractorWelcomeData,
  branding?: GlobalBranding | null
): string {
  const primaryColor = branding?.primaryColor || '#0d9488';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: ${primaryColor};">Welcome to Hygieia</h2>
      <p>Hello <strong>${data.teamName}</strong>,</p>
      <p>You've been assigned to contract <strong>${data.contractNumber}</strong> at <strong>${data.facilityName}</strong>.</p>
      <p>A portal account has been created for you. Click the link below to set your password and access your contracts, jobs, and time tracking:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.setPasswordUrl}" style="background-color: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Set Your Password
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">This link expires in 72 hours. If you have any questions, contact your account manager.</p>
    </div>
  `;
}
```

**Step 3: Call auto-provisioning in the team assignment endpoint**

In `apps/api/src/routes/contracts.ts`, in the `PATCH /:id/team` handler (~line 495, after successful assignment), add:

```typescript
// Auto-provision subcontractor portal access
if (parsed.data.teamId) {
  const provisioned = await createSubcontractorUser(parsed.data.teamId);
  if (provisioned) {
    const setPasswordUrl = `${process.env.WEB_APP_URL || 'http://localhost:5173'}/auth/set-password?token=${provisioned.token}`;
    // Send welcome email
    const branding = await getGlobalBranding();
    const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
    if (team && isEmailConfigured()) {
      await sendNotificationEmail(
        team.contactEmail!,
        buildSubcontractorWelcomeSubject(),
        buildSubcontractorWelcomeHtml({
          teamName: team.name,
          contractNumber: contract.contractNumber,
          facilityName: contract.facility?.name || 'N/A',
          setPasswordUrl,
        }, branding)
      );
    }
  }
}
```

**Step 4: Commit**

```bash
git add apps/api/src/services/authService.ts apps/api/src/templates/subcontractorWelcome.ts apps/api/src/routes/contracts.ts
git commit -m "feat: auto-provision subcontractor user on first team assignment"
```

---

### Task 6: Backend — Password set endpoint

**Files:**
- Modify: `apps/api/src/routes/auth.ts`

**Step 1: Add POST /auth/set-password endpoint**

In `apps/api/src/routes/auth.ts`, add a new endpoint (no auth required — uses token):

```typescript
router.post('/set-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find valid token
    const passwordToken = await prisma.passwordSetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!passwordToken || passwordToken.usedAt || passwordToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Hash password and activate user
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: passwordToken.userId },
      data: { passwordHash, status: 'active' },
    });

    // Mark token as used
    await prisma.passwordSetToken.update({
      where: { id: passwordToken.id },
      data: { usedAt: new Date() },
    });

    return res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
});
```

**Step 2: Commit**

```bash
git add apps/api/src/routes/auth.ts
git commit -m "feat: add set-password endpoint for subcontractor onboarding"
```

---

### Task 7: Frontend — Set Password page

**Files:**
- Create: `apps/web/src/pages/auth/SetPassword.tsx`
- Modify: `apps/web/src/App.tsx` (add route)

**Step 1: Create SetPassword page**

Create `apps/web/src/pages/auth/SetPassword.tsx`:

```tsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';

const SetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/set-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to set password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-gray-400">This password setup link is invalid.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="w-full max-w-md rounded-xl bg-surface-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Password Set!</h1>
          <p className="text-gray-400 mb-6">Your account is ready. You can now log in.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950">
      <div className="w-full max-w-md rounded-xl bg-surface-900 p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Set Your Password</h1>
        <p className="text-gray-400 mb-6">Choose a password to activate your Hygieia portal account.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" isLoading={loading} className="w-full">
            Set Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
```

**Step 2: Add route in App.tsx**

In `apps/web/src/App.tsx`, add to the public routes section (~line 101):

```tsx
<Route path="/auth/set-password" element={<SetPassword />} />
```

Add the import at the top:
```tsx
import SetPassword from './pages/auth/SetPassword';
```

**Step 3: Commit**

```bash
git add apps/web/src/pages/auth/SetPassword.tsx apps/web/src/App.tsx
git commit -m "feat: add set-password page for subcontractor onboarding"
```

---

### Task 8: Frontend — Filter sidebar navigation for subcontractor role

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx` (lines 52-106)
- Modify: `apps/web/src/stores/authStore.ts` (add teamId to User interface)

**Step 1: Add `teamId` to frontend User interface**

In `apps/web/src/stores/authStore.ts`, add `teamId` to the User interface:

```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions?: Record<string, boolean>;
  teamId?: string | null;
}
```

**Step 2: Update login response handling**

In the `login` action of `authStore.ts`, ensure `teamId` is included when setting the user from the API response. The backend already returns user data — just make sure `teamId` is in the response by updating the auth service's `login` function to include it in the returned user object.

**Step 3: Sidebar already filters by permissions**

The sidebar at `Sidebar.tsx:115-119` already filters using `canAccessRoute()`. Since we defined the subcontractor permissions to include `contracts_read`, `jobs_read`, `time_tracking_read`, `facilities_read`, and `dashboard_read`, the sidebar will naturally show:

- Dashboard (no permission required, always visible)
- Sales > Contracts (has `contracts_read`)
- Operations > Jobs (has `jobs_read`)
- Operations > Time Tracking (has `time_tracking_read`)

And hide everything else (CRM, Proposals, Invoices, Manage section, etc.).

However, we don't want subcontractors to see "Sales" as their section label for contracts. Add a role-based override for the section structure. Before the `visibleSections` computation (~line 115), add:

```typescript
const isSubcontractor = user?.role === 'subcontractor';

const effectiveSections = isSubcontractor
  ? [
      {
        key: 'dashboard',
        title: 'Dashboard',
        icon: Home,
        directLink: '/',
        items: [{ to: '/', icon: Home, label: 'Dashboard' }],
      },
      {
        key: 'work',
        title: 'My Work',
        icon: Briefcase,
        items: [
          { to: '/contracts', icon: FileSignature, label: 'My Contracts' },
          { to: '/jobs', icon: Briefcase, label: 'My Jobs' },
          { to: '/time-tracking', icon: Timer, label: 'Time Tracking' },
        ],
      },
    ]
  : navSections;

const visibleSections = effectiveSections
  .map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessRoute(item.to, user)),
  }))
  .filter((section) => section.items.length > 0);
```

**Step 4: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx apps/web/src/stores/authStore.ts
git commit -m "feat: filter sidebar navigation for subcontractor role"
```

---

### Task 9: Frontend — Subcontractor contract detail view (hide sensitive data)

**Files:**
- Modify: `apps/web/src/pages/contracts/ContractDetail.tsx`

**Step 1: Add subcontractor-specific rendering**

In `ContractDetail.tsx`, get the user role from the auth store:

```typescript
const userRole = useAuthStore((state) => state.user?.role);
const isSubcontractor = userRole === 'subcontractor';
```

Then conditionally render:

1. **Header actions** — hide Edit/Send/Activate/Renew/Archive buttons when `isSubcontractor`:
   ```tsx
   {!isSubcontractor && (
     <div className="flex items-center gap-2">
       {/* existing action buttons */}
     </div>
   )}
   ```

2. **Financial card** — replace monthly value with payout:
   ```tsx
   {isSubcontractor ? (
     <Card>
       <div className="text-sm text-gray-400 mb-1">Your Monthly Payout</div>
       <div className="text-2xl font-bold text-teal-400">
         {formatCurrency(contract.subcontractorPayout)}
       </div>
     </Card>
   ) : (
     // existing financial cards showing full value
   )}
   ```

3. **Assignment card** — hide entirely for subcontractors:
   ```tsx
   {!isSubcontractor && (
     // existing assignment management card
   )}
   ```

**Step 2: Commit**

```bash
git add apps/web/src/pages/contracts/ContractDetail.tsx
git commit -m "feat: hide sensitive contract data for subcontractor view"
```

---

### Task 10: Frontend — Subcontractor dashboard

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`

**Step 1: Add subcontractor dashboard variant**

In `Dashboard.tsx`, detect subcontractor role and render a simpler dashboard:

```typescript
const userRole = useAuthStore((state) => state.user?.role);
const isSubcontractor = userRole === 'subcontractor';
```

If `isSubcontractor`, render a simplified view with:
- Active contracts count + list (fetched from `/contracts` which is already scoped)
- Upcoming jobs this week (fetched from `/jobs` which is already scoped)
- Hours logged this period
- Total monthly payout across contracts

Use the same Card/Grid components already used in the dashboard. This replaces the full KPI dashboard which shows revenue, lead conversion, etc. that subcontractors shouldn't see.

```tsx
if (isSubcontractor) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 sm:text-3xl">
          Welcome back, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          Here's your work overview.
        </p>
      </div>

      {/* KPI cards: Active Contracts, Jobs This Week, Hours Logged, Monthly Payout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Fetch and display subcontractor-specific KPIs */}
      </div>

      {/* Upcoming jobs list */}
      {/* Recent contracts */}
    </div>
  );
}
```

The exact KPI data can come from the existing `/contracts` and `/jobs` endpoints since they're already scoped by the backend for subcontractor role.

**Step 2: Commit**

```bash
git add apps/web/src/pages/Dashboard.tsx
git commit -m "feat: add subcontractor dashboard variant"
```

---

### Task 11: Backend — Seed the subcontractor role in database

**Files:**
- Create: `packages/database/prisma/seed-subcontractor-role.ts` (or add to existing seed)

**Step 1: Create a seed script or migration to ensure role exists**

Add to the existing seed script (or create a new one) to ensure the `subcontractor` role exists in the `Role` table:

```typescript
await prisma.role.upsert({
  where: { key: 'subcontractor' },
  update: {},
  create: {
    key: 'subcontractor',
    label: 'Subcontractor',
    permissions: {
      dashboard_read: true,
      contracts_read: true,
      facilities_read: true,
      jobs_read: true,
      jobs_write: true,
      time_tracking_read: true,
      time_tracking_write: true,
    },
    isSystemRole: true,
  },
});
```

This can also be handled in the `createSubcontractorUser` function (Task 5) which already upserts the role, but having it in the seed ensures it exists from the start.

**Step 2: Commit**

```bash
git add packages/database/
git commit -m "feat: seed subcontractor role"
```

---

### Task 12: Backend — Update auth login to handle pending status

**Files:**
- Modify: `apps/api/src/services/authService.ts` (login function ~line 102)
- Modify: `apps/api/src/middleware/auth.ts` (~line 73)

**Step 1: Allow `pending` status users to see a helpful error**

In `authService.ts` login function, after finding the user, check if status is `pending` and return a specific error message:

```typescript
if (user.status === 'pending') {
  // User hasn't set their password yet
  return null; // Or throw a specific error the route can catch
}
```

The auth middleware already blocks non-active users (~line 73). The `pending` status means the subcontractor hasn't set their password yet — the login should return a clear message like "Please set your password using the link sent to your email."

**Step 2: Commit**

```bash
git add apps/api/src/services/authService.ts apps/api/src/middleware/auth.ts
git commit -m "feat: handle pending user status in auth flow"
```

---

### Task 13: Integration testing — End-to-end subcontractor flow

**Files:**
- Create: `apps/api/src/services/__tests__/subcontractorFlow.test.ts`

**Step 1: Write integration test**

Test the full flow:
1. Create a team with contact email
2. Create and activate a contract
3. Assign team to contract
4. Verify a User was auto-created with `subcontractor` role and `teamId`
5. Verify a PasswordSetToken was created
6. Call `POST /auth/set-password` with the token
7. Verify user status changed to `active`
8. Login as the subcontractor user
9. Verify contract list returns only the assigned contract
10. Verify full contract value is hidden, payout is shown

**Step 2: Commit**

```bash
git add apps/api/src/services/__tests__/subcontractorFlow.test.ts
git commit -m "test: add integration tests for subcontractor portal flow"
```

---

## Execution Order

Tasks 1-6 are backend and must be done sequentially.
Tasks 7-10 are frontend and can be done in parallel after Task 2.
Task 11 can be done anytime.
Task 12 should be done after Task 6.
Task 13 should be done last as validation.

## Dependencies

```
Task 1 (schema) → Task 3 (ownership) → Task 4 (scoping) → Task 5 (provisioning) → Task 6 (set-password)
Task 2 (roles) → Task 8 (sidebar) → Task 9 (contract view) → Task 10 (dashboard)
Task 1 + Task 2 → Task 11 (seed)
Task 6 → Task 7 (set-password page)
Task 6 → Task 12 (pending status)
All → Task 13 (integration test)
```
