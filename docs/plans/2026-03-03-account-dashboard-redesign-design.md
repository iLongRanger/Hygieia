# Account Dashboard Redesign

## Problem
The current AccountDetail.tsx is a 1,350-line monolith that shows all account information on a single page with poor information hierarchy. Key data (active contract, service status) is buried among less important details. Missing financial summary, service overview, contact hierarchy, and performance metrics.

## Design

### Layout: Dashboard with Hero + Card Grid

Single-page dashboard (not tabbed). Hero section at top for the most critical info, then a responsive card grid below for organized sections.

### Hero Section

**Header row**: Back button + account name (h1) + type badge (commercial/residential) + industry + action buttons (Edit Account, Archive/Restore)

**Active Contract Banner** (full-width, prominent):
- Active contract: green-tinted card with contract number, monthly value, assigned team, end date, "View Contract" link
- No active contract: muted card with "No active contract" and "Create Proposal" CTA

**KPI Strip** (grid-cols-2 sm:grid-cols-4):
- Monthly Value (from active contract)
- Facilities count (clickable, navigates to filtered list)
- Next Service (upcoming job/appointment date or "None scheduled")
- Account Health indicator (active/at-risk/new based on available data)

### Dashboard Cards

**Row 1** (lg:grid-cols-2):

| Contacts Card | Facilities Card |
|---|---|
| Primary contact highlighted | Mini facility cards |
| Billing contact if different | Name, address, building type, status |
| Other contacts list | Click navigates to facility detail |
| "Add Contact" button | "Add Facility" button |

**Row 2** (lg:grid-cols-2):

| Financial Summary Card | Service Overview Card |
|---|---|
| Active contract value | Last service date |
| Proposal count + total value | Upcoming jobs count |
| 3 most recent proposals | Service frequency |
| Payment terms | Placeholder for quality metrics |

**Row 3** (full-width):

| Account History Card |
|---|
| Add note form (ACCOUNTS_WRITE) |
| Chronological activity list with type badges |

### Component Decomposition

| File | Responsibility |
|------|---------------|
| `AccountDetail.tsx` | Shell: data fetching, state, layout |
| `AccountHero.tsx` | Header, active contract banner, KPI strip |
| `AccountContacts.tsx` | Contacts card with hierarchy |
| `AccountFacilities.tsx` | Facilities mini-card grid |
| `AccountFinancials.tsx` | Financial summary from contract/proposal data |
| `AccountServiceOverview.tsx` | Service info from job/appointment data |
| `AccountHistory.tsx` | Activity log with add note form |
| `modals/EditAccountModal.tsx` | Edit account form |
| `modals/AddFacilityModal.tsx` | Add facility form |

### Data Sources (frontend only - no new API endpoints)
- Active contract, monthly value, team: existing contract fetch
- Financial summary: derived from proposals + contracts already fetched
- Service overview: add fetch for recent jobs/appointments for this account
- Contact hierarchy: add fetch for contacts linked to this account
- Account health: derived from contract status + recent activity

### Visual Style
- Dark theme matching facility redesign
- Card pattern: `rounded-lg border border-white/10 bg-navy-dark/30`
- Consistent spacing: `space-y-6` between sections, `gap-4`/`gap-6` for grids
