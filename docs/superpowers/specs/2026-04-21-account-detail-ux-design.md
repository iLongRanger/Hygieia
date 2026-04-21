# Account Detail UX Redesign

**Date:** 2026-04-21
**Scope:** `/accounts/:id` for both `commercial` and `residential` account types
**File:** `apps/web/src/pages/accounts/AccountDetail.tsx` and its sub-components

## Goals

The account detail page serves two audiences equally:

- **Operations users** who need to see what's scheduled, who's assigned, what's pending.
- **Sales users** who need to see where the account is in the pipeline, what proposals/contracts exist, what the next step is.

Commercial and residential accounts share the same shell (tabs, zones, hero structure) but are allowed to diverge in the Overview tab's body content where the underlying shape of the account differs (portfolio of facilities vs. small set of homes).

This is a structural pass — the layout, hero, journey visualization, and sidebar all change — not just visual polish.

## Problems with the current UI

Concrete issues observed in the existing implementation:

1. **Monthly value is duplicated** — the Active Contract banner shows it, and the KPI strip's Monthly Value tile shows it again.
2. **Journey card repeats its own state three ways** — the header badge, the "Current Stage" tile, and the "Property In Journey" label all convey overlapping information.
3. **Button pile** — the Journey card's footer renders up to five "Open X" buttons regardless of what's actually relevant at the current stage.
4. **Confusing residential service-location labels** — each card shows the property name and a separate `Facility: <name>` uppercase subtitle, which is usually redundant and sometimes contradictory.
5. **Sidebar redundancy** — `AccountServiceOverview` in the sidebar restates hero KPIs (last service, upcoming jobs) without adding context, and contains a `"Quality metrics coming soon"` placeholder.
6. **Thin Service tab for commercial accounts** — it shows only bookings; upcoming and recent jobs are invisible on that tab.
7. **Hidden fields** — `account.notes`, `billingEmail`, `website`, `paymentTerms`, `creditLimit` are only visible inside the edit modal.

## Design

### 1. Hero

Replace the current three-part hero (title row + Active Contract banner + 4-tile KPI strip) with one composed hero block.

- **Row 1:** name + type badge + **health badge** (moved from KPI strip) on the left; Edit / Archive actions on the right.
- **Row 2:** industry alongside a short-form service address ("Atlanta, GA") so geography is immediate.
- **Row 3:** a four-tile KPI strip:
  1. **Monthly value** — shows active contract's monthly value with `Active Contract` as subtitle and a click-through to the contract. When no active contract: value is `—` and subtitle is `No active contract`. Replaces the redundant Active Contract banner.
  2. **Service Locations** count — clicking scrolls to the service locations section on this page. A secondary "View all" link inside that section opens the list view.
  3. **Next Service** date — unchanged from today.
  4. **Account Manager** — name (with avatar initial), role beneath. Replaces the Account Health tile (health moves to row 1).

The standalone Active Contract banner card is deleted.

### 2. Journey stepper

Replace the current Journey card (three equal info boxes + footer button row) with:

- A **horizontal stepper** showing the full stage path for the account type. Commercial uses the seven stages in `COMMERCIAL_ACCOUNT_PIPELINE_STAGES`; residential uses `RESIDENTIAL_ACCOUNT_PIPELINE_STAGES`.
  - Completed stages: filled.
  - Current stage: ringed.
  - Future stages: outlined.
  - Labels wrap onto a second line; no ellipsis.
  - Converts to a vertical list on mobile (`sm:` breakpoint and below).
- A **Next-action panel** below the stepper containing:
  - One line of next-step guidance (from existing `getCommercialJourneyState` / `getResidentialJourneyState` / `getResidentialPropertyJourneyState` helpers).
  - 1 primary CTA, up to 2 secondary CTAs, and optionally a tertiary "view all" link. CTAs are derived from the current stage (e.g., `proposal_sent` → `Open Proposal` primary, `Resend` secondary, `View all proposals` tertiary).
  - This is the **only** place on the Overview tab that renders primary action buttons for the journey; today's pile of always-on Open-X buttons is removed.
- **Rejected / expired states** (e.g., `proposal_rejected`, `proposal_expired`) — the stepper shows the last reached stage with a warning tint on that step. The next-action panel proposes recovery actions ("Revise proposal" / "Close opportunity").
- **Residential property switcher** — when multiple residential properties exist and they are at different stages, a compact dropdown next to the section header (`Viewing: 123 Oak St ▾`) drives which property the stepper reflects. The dropdown defaults to the focused property already computed via `focusedResidentialPropertyJourney`. Per-property journey badges still render in the Service Locations section below so no information is hidden.

### 3. Overview body

Everything below the journey stepper on the Overview tab. Shared shell, divergent content.

#### Commercial Overview

Three stacked sections in the main column:

1. **Service Locations** — replaces today's `AccountFacilities` card.
   - 2-up card grid on desktop, 1-up on mobile.
   - Each card: name · status badge · address · building type · next-visit line (if a job is scheduled at that facility) · chevron to open.
   - "Add Service Location" button in the section header.
   - Empty state: illustrative row with primary CTA.

2. **Proposals & Contracts** — merges today's `AccountFinancials` content with the proposal list.
   - Two sub-columns on desktop: **Proposals** (latest 3, each row: number + title + status badge + amount) and **Contracts** (active + most recent 2; each row: number + period + monthly value + status).
   - Section footer has "View all proposals" / "View all contracts" links.
   - A de-emphasized strip at the bottom shows total proposal value and total contract value — the numbers today's Financials card surfaces, but as supporting context rather than hero. `credit limit` and `payment terms` are intentionally not duplicated here; they live in the sidebar's Account details card.

3. **Notes** *(new)* — when `account.notes` is set, render as a quoted block with an Edit link. When empty, render nothing (not an empty-state card).

#### Residential Overview

Two stacked sections:

1. **Properties**
   - **1 property:** single expanded card — address, home profile (`type · sqft · X bed / Y bath · levels`), access summary (entry notes + parking + pets), journey badge, Primary / Edit / Open Facility actions.
   - **2+ properties:** compact rows (name + primary badge + address + stage badge + chevron). The property currently driving the stepper auto-expands; others stay compact until clicked.
   - The `Facility: <name>` uppercase subtitle is removed. When property name and facility name differ, render a single subdued inline line: `linked to facility: Downtown HQ`. When they match or only one exists, render nothing.
   - "Add Service Location" button in the section header.

2. **Proposals** — same structure as commercial's Proposals sub-column, scoped to this account's residential quotes + proposals. Filter chips at the top (`All · Quotes · Proposals`) when both exist.

#### Removed from Overview

- The standalone button row under the Journey card (now inside the Next-action panel).
- `AccountFinancials` as a standalone card (merged into Proposals & Contracts).
- `AccountServiceOverview` (retired; see Sidebar).

### 4. Service tab

Currently thin (Bookings for commercial; Bookings + Service Details for residential). Rebuild into a real operations view. Same structure for both account types; content adapts.

1. **Upcoming work** *(top, primary)*
   - One chronological timeline that merges **upcoming jobs + upcoming appointments** (today these are in parallel columns and jobs are absent entirely).
   - Each row: date + time window · type badge (`Job` / `Walkthrough` / `Service Booking`) · facility or property · assigned team/person · status badge · chevron.
   - Section dividers: `Today`, `Tomorrow`, `This week`, `Later`.
   - Empty state with direct actions (`Schedule a visit` / `Book a walkthrough`).

2. **Recent work** *(default collapsed when >5 items)*
   - Completed jobs + completed/canceled/rescheduled appointments, same row format as Upcoming but with outcome badges (`Completed` · `Canceled` · `Rescheduled`).
   - Last 10 shown by default with a `View all jobs` link.

3. **Service shape** *(compact strip at the top right of the tab, not a full card)*
   - **Residential:** service type · frequency · next visit window · assigned team (condensed from today's `Service Details` card).
   - **Commercial:** service frequency · contract period · monthly value · assigned team (not present today).
   - When no active contract: strip is replaced with a one-line note — `No active contract — proposals drive future service shape`.

### 5. History tab

Keep `AccountHistory` largely as-is. Two small changes:

- The note composer sticks to the top of the tab content when scrolling.
- The activity list is grouped by day (`Today` / `Yesterday` / `This Week` / `<Month>` headers) rather than a flat timestamped list.

### 6. Sidebar

Keep the sidebar on desktop (right column, `lg:col-span-1`). Stacks below main content on mobile, as today.

1. **Contacts** — current `AccountContacts` component with small fixes:
   - Empty state gets a primary `Add contact` button (today only a non-useful "View All" link exists on empty state).
   - Email and phone rows become `mailto:` / `tel:` links.
   - Primary contact highlight and billing badge are kept.

2. **Assignment** — replaces `AccountServiceOverview`. Compact card with:
   - **Account Manager** — name + avatar initial · role · email link (from `account.accountManager`).
   - **Assigned Team** — team name (or `Unassigned`) from the active contract. If no contract but an upcoming job has an assignment, show that with a `via upcoming job` subdued label.
   - **Primary technician / service lead** — from active contract's `assignedToUser` or the next upcoming job's assignee, when available.

3. **Account details** *(new)* — billing/payment context as a compact definition list:
   - Payment terms · Credit limit · Billing email · Website.
   - Only render rows with values. When no row has a value, the section does not render.

#### Removed from sidebar

- `AccountServiceOverview` in its entirety (Last Service, Upcoming Jobs count, Service Frequency, `Quality metrics coming soon` placeholder). Those numbers move to the Service tab where they have context.

## Architecture

No backend changes required. All data is already fetched by `AccountDetail.tsx`.

### Files to change

- `apps/web/src/pages/accounts/AccountDetail.tsx` — rebuild hero composition, journey section, and overview bodies; remove imports for retired components.
- `apps/web/src/pages/accounts/AccountHero.tsx` — rewrite layout (single composed block; Active Contract banner removed; health badge moves next to name; Account Manager becomes the fourth KPI tile).
- `apps/web/src/pages/accounts/AccountFacilities.tsx` — tighten card layout; add next-visit line; add empty-state CTA.
- `apps/web/src/pages/accounts/AccountContacts.tsx` — empty-state CTA, mailto/tel links.
- `apps/web/src/pages/accounts/AccountHistory.tsx` — sticky composer, grouped-by-day list.

### Files to create

- `apps/web/src/pages/accounts/AccountJourneyStepper.tsx` — horizontal/vertical stepper + Next-action panel. Driven by `accountPipeline.ts` stage lists and the existing `getCommercialJourneyState` / `getResidentialJourneyState` / `getResidentialPropertyJourneyState` helpers.
- `apps/web/src/pages/accounts/AccountProposalsContracts.tsx` — merged proposals + contracts + financial strip section.
- `apps/web/src/pages/accounts/AccountResidentialProperties.tsx` — residential properties section extracted from the inline block in `AccountDetail.tsx`.
- `apps/web/src/pages/accounts/AccountServiceTab.tsx` — unified upcoming/recent timeline + service-shape strip.
- `apps/web/src/pages/accounts/AccountAssignment.tsx` — replaces `AccountServiceOverview`.
- `apps/web/src/pages/accounts/AccountDetailsSidebar.tsx` — billing/payment definition-list card.

### Files to delete

- `apps/web/src/pages/accounts/AccountServiceOverview.tsx`
- `apps/web/src/pages/accounts/AccountFinancials.tsx` — content absorbed into `AccountProposalsContracts.tsx`.

### Patterns

- Use existing `Card`, `Badge`, `Button`, `Input`, `Select`, `Modal`, `Textarea` primitives from `apps/web/src/components/ui/`.
- Use existing surface and primary color tokens; no new design tokens.
- Preserve existing permission gating (`ACCOUNTS_WRITE`, `ACCOUNTS_ADMIN`, `FACILITIES_WRITE`) at the action-button level.
- Preserve existing navigation state pattern (`accountBackState` for back-label propagation).

## Scope caveats

- `apps/web/src/pages/__tests__/AccountDetail.test.tsx` will need updates for the new structure. Test revisions are in scope for implementation but are not designed here.
- No API / Prisma schema changes.
- The `residentialQuotes` list already drives residential stage computation; that wiring stays unchanged.
