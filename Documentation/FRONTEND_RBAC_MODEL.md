# Frontend RBAC Model

This document describes the current permission model used by `apps/web`.

## Source Of Truth

- Permission keys must match API keys exactly.
- Frontend permission constants live in:
  - `apps/web/src/lib/permissions.ts`
- Route access config lives in:
  - `apps/web/src/lib/routeAccess.ts`

## Auth Payload

Frontend auth state is in:

- `apps/web/src/stores/authStore.ts`

`user` includes:

- `role` (required)
- `permissions` (optional explicit permission map)

Permission resolution:

1. If `user.permissions` exists and is non-empty, use it.
2. Otherwise, fall back to frontend role->permission map.

Helpers:

- `hasPermission(permission: string)`
- `canAny(permissions: string[])`

## Route Guarding

Route gating is centralized via `routeAccess.ts`.

- `ProtectedRoute` receives `requiredPermissions`.
- Auth check and token validation run first.
- Permission check runs after auth validation.
- Failing permission check redirects to `/unauthorized`.

## Navigation Gating

Sidebar visibility is permission-driven using shared route access checks.

- `apps/web/src/components/layout/Sidebar.tsx`
- Uses `canAccessRoute(path, user)` from `routeAccess.ts`

## Action-Level Gating

Use permission wrappers for page controls:

- `apps/web/src/components/auth/Can.tsx`
  - `<Can permission="...">`
  - `<CanAny permissions={[...]}>`

Action mapping convention:

- Create/edit/update/send/activate/complete actions: `*_write`
- Archive/restore/admin-only actions: `*_admin`
- Hard delete actions: explicit delete permission (example: `proposals_delete`)

## Testing Guidance

When testing gated actions:

- Set auth state with a user that has required permissions (commonly `owner`).
- For tests that mock `useAuthStore`, include:
  - `hasPermission`
  - `canAny` (if used by component)

Focused RBAC tests:

- Permission utilities: `apps/web/src/lib/__tests__/permissions.test.ts`
- Route access: `apps/web/src/lib/__tests__/routeAccess.test.ts`
- Auth store helpers: `apps/web/src/stores/__tests__/authStore.test.ts`
- Sidebar access: `apps/web/src/components/layout/__tests__/Sidebar.test.tsx`
