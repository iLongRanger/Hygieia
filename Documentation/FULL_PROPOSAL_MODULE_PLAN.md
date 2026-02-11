# Full Proposal Module - Implementation Plan

Build out the proposal module into a complete lifecycle system with PDF generation, email delivery, client-facing public view, activity log, version history, and terms templates.

---

## Phase 1: Activity Log + Terms Templates (Foundation)

### 1A. Activity Log

**Schema** (`packages/database/prisma/schema.prisma`):
- New `ProposalActivity` model: proposalId, action (varchar 50), performedByUserId (nullable for public actions), metadata (JsonB), ipAddress, createdAt
- Add `activities ProposalActivity[]` relation on Proposal
- Add `proposalActivities ProposalActivity[]` relation on User

**Backend files to create:**
- `apps/api/src/services/proposalActivityService.ts` - `logActivity()`, `getProposalActivities(proposalId)`
- `apps/api/src/schemas/proposalActivity.ts` - Zod query params

**Backend files to modify:**
- `apps/api/src/services/proposalService.ts` - Add `logActivity()` calls in every workflow function (create, update, send, viewed, accept, reject, archive, restore, pricing lock/unlock/change/recalculate)
- `apps/api/src/routes/proposals.ts` - Add `GET /:id/activities` route, pass `req.ip` + `req.user.id` through to service

**Frontend files to create:**
- `apps/web/src/components/proposals/ProposalTimeline.tsx` - Chronological activity feed with icons per action type

**Frontend files to modify:**
- `apps/web/src/lib/proposals.ts` - Add `getProposalActivities()`
- `apps/web/src/pages/proposals/ProposalDetail.tsx` - Replace static timeline with ProposalTimeline component

### 1B. Terms Templates

**Schema** (`packages/database/prisma/schema.prisma`):
- New `ProposalTemplate` model: name (unique), termsAndConditions (text), isDefault, createdByUserId, timestamps, archivedAt

**Backend files to create:**
- `apps/api/src/services/proposalTemplateService.ts` - CRUD + `getDefaultTemplate()`
- `apps/api/src/schemas/proposalTemplate.ts` - Zod schemas
- `apps/api/src/routes/proposalTemplates.ts` - CRUD at `/api/v1/proposal-templates`

**Frontend files to create:**
- `apps/web/src/types/proposalTemplate.ts` - Interfaces
- `apps/web/src/lib/proposalTemplates.ts` - API client
- `apps/web/src/pages/settings/ProposalTemplatesPage.tsx` - CRUD management page

**Frontend files to modify:**
- `apps/web/src/pages/proposals/ProposalForm.tsx` - Add template selector dropdown that populates termsAndConditions textarea
- `apps/web/src/App.tsx` - Add `/settings/proposal-templates` route
- `apps/api/src/index.ts` - Mount proposalTemplates routes

---

## Phase 2: Version History

**Schema** (`packages/database/prisma/schema.prisma`):
- New `ProposalVersion` model: proposalId, versionNumber, snapshot (JsonB - full proposal state), changedByUserId, changeReason (varchar 500), createdAt
- Unique constraint on [proposalId, versionNumber]

**Backend files to create:**
- `apps/api/src/services/proposalVersionService.ts` - `createVersion()`, `getVersions()`, `getVersion()`, `buildSnapshotFromProposal()`

**Backend files to modify:**
- `apps/api/src/services/proposalService.ts` - Create versions on: `sendProposal()`, `recalculateProposalPricing()`, updates to non-draft proposals
- `apps/api/src/routes/proposals.ts` - Add `GET /:id/versions`, `GET /:id/versions/:versionNumber`

**Frontend files to create:**
- `apps/web/src/components/proposals/ProposalVersionHistory.tsx` - Version list with snapshot viewer

**Frontend files to modify:**
- `apps/web/src/lib/proposals.ts` - Add `getProposalVersions()`, `getProposalVersion()`
- `apps/web/src/types/proposal.ts` - Add `ProposalVersion` interface
- `apps/web/src/pages/proposals/ProposalDetail.tsx` - Add Version History card in right column

---

## Phase 3: PDF Generation

**Install:** `pdfmake` + `@types/pdfmake` in `apps/api`

**Backend files to create:**
- `apps/api/src/services/pdfService.ts` - `generateProposalPdf(proposal): Buffer`
  - Company header (logo, name, address)
  - Client info (account, facility)
  - Services table (name, type, frequency, monthly price)
  - Line items table (type, description, qty, unit price, total)
  - Pricing summary (subtotal, tax, total)
  - Terms & conditions
  - Footer (valid until, signature lines)
- `apps/api/src/config/company.ts` - Company branding config from env vars

**Backend files to modify:**
- `apps/api/src/routes/proposals.ts` - Add `GET /:id/pdf` (returns `application/pdf`)

**Frontend files to modify:**
- `apps/web/src/lib/proposals.ts` - Add `downloadProposalPdf()` (blob download)
- `apps/web/src/pages/proposals/ProposalDetail.tsx` - Add "Download PDF" button

**Env vars:** `COMPANY_NAME`, `COMPANY_ADDRESS`, `COMPANY_PHONE`, `COMPANY_EMAIL`, `COMPANY_WEBSITE`, `COMPANY_LOGO_PATH`

---

## Phase 4: Email Service

**Backend files to create:**
- `apps/api/src/config/email.ts` - SMTP config from env vars
- `apps/api/src/services/emailService.ts` - Core email via nodemailer (already installed):
  - `sendProposalEmail(to, cc, subject, html, pdfBuffer, publicViewUrl)`
  - `sendProposalAcceptedNotification(proposal)`
  - `sendProposalRejectedNotification(proposal, reason)`
  - `sendProposalReminder(proposal)`
- `apps/api/src/templates/proposalEmail.ts` - HTML template with proposal summary + "View Online" button
- `apps/api/src/templates/proposalAccepted.ts` - Internal notification
- `apps/api/src/templates/proposalRejected.ts` - Internal notification

**Backend files to modify:**
- `apps/api/src/routes/proposals.ts` - Update `POST /:id/send`: generate PDF, send email, log activity
- `apps/api/src/routes/proposals.ts` - Update `POST /:id/accept` and `/:id/reject`: send notifications

**Frontend files to create:**
- `apps/web/src/components/proposals/SendProposalModal.tsx` - Modal with: email to (pre-filled from account), CC, subject, body, preview PDF, send button

**Frontend files to modify:**
- `apps/web/src/pages/proposals/ProposalDetail.tsx` - Replace confirm() send with SendProposalModal

**Env vars:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## Phase 5: Client-Facing Public View

**Schema** (`packages/database/prisma/schema.prisma`) - Add to Proposal model:
- `publicToken` (varchar 64, unique, nullable) - crypto-random hex token
- `publicTokenExpiresAt` (timestamptz, nullable)
- `signatureName` (varchar 255, nullable)
- `signatureDate` (timestamptz, nullable)
- `signatureIp` (varchar 45, nullable)

**Backend files to create:**
- `apps/api/src/services/proposalPublicService.ts`:
  - `generatePublicToken(proposalId)` - `crypto.randomBytes(32).toString('hex')`
  - `getProposalByPublicToken(token)` - Find + check expiry + auto-mark viewed
  - `acceptProposalPublic(token, signatureName, ip)`
  - `rejectProposalPublic(token, reason, ip)`
- `apps/api/src/routes/publicProposals.ts` - **No auth middleware**, rate-limited:
  - `GET /api/v1/public/proposals/:token` - Sanitized proposal view (no internal notes/pricing details)
  - `POST /api/v1/public/proposals/:token/accept` - `{ signatureName }`
  - `POST /api/v1/public/proposals/:token/reject` - `{ rejectionReason }`
  - `GET /api/v1/public/proposals/:token/pdf` - Download PDF
- `apps/api/src/schemas/publicProposal.ts` - Zod schemas

**Frontend files to create:**
- `apps/web/src/pages/public/PublicProposalView.tsx` - Standalone page (no admin nav):
  - Company header, proposal details, services table, items table, pricing, terms
  - Accept button (modal with signature name input)
  - Reject button (modal with reason textarea)
  - Success/error states, mobile responsive
- `apps/web/src/lib/publicProposals.ts` - Separate axios instance (no auth headers)
- `apps/web/src/types/publicProposal.ts` - Sanitized proposal type

**Files to modify:**
- `apps/web/src/App.tsx` - Add `/p/:token` route OUTSIDE AdminLayout
- `apps/api/src/index.ts` - Mount public routes
- `apps/api/src/services/proposalService.ts` - `sendProposal()` generates token
- `apps/api/src/templates/proposalEmail.ts` - Include `{FRONTEND_URL}/p/{token}` link

**Env vars:** `FRONTEND_URL`, `PUBLIC_TOKEN_EXPIRY_DAYS` (default 30)

---

## Phase 6: Integration Polish

**Files to modify:**
- `apps/api/src/services/proposalService.ts` - Full orchestration:
  - `sendProposal()`: lock pricing -> create version -> generate token -> generate PDF -> send email -> log activity
  - `acceptProposal()`: log -> version -> notify creator -> send email -> auto-create contract
  - `rejectProposal()`: log -> notify creator -> send email
- `apps/api/src/routes/proposals.ts` - Wire contract auto-creation on accept
- `apps/web/src/pages/proposals/ProposalDetail.tsx`:
  - "Copy Public Link" button
  - "Resend Email" button for sent/viewed
  - Signature details display for accepted proposals
  - Linked contract navigation
- `apps/web/src/pages/proposals/ProposalsList.tsx` - Add PDF download + Resend to quick actions
- `apps/api/src/routes/proposals.ts` - Add `POST /:id/remind` for manual reminders

---

## Migration Sequence
1. Phase 1A: `npx prisma migrate dev --name add-proposal-activities`
2. Phase 1B: `npx prisma migrate dev --name add-proposal-templates`
3. Phase 2: `npx prisma migrate dev --name add-proposal-versions`
4. Phase 5: `npx prisma migrate dev --name add-proposal-public-access`

All migrations are additive (no destructive changes).

## NPM Dependencies
- `apps/api`: `pdfmake` + `@types/pdfmake` (Phase 3 only). nodemailer already installed.
- `apps/web`: No new dependencies.

## Verification
- **Phase 1:** Activity log records all actions, timeline renders in ProposalDetail. Templates CRUD works, template populates form.
- **Phase 2:** Versions created on send/recalculate, viewable in detail page.
- **Phase 3:** PDF downloads correctly with all proposal content formatted.
- **Phase 4:** Email sends with PDF attachment, send modal works.
- **Phase 5:** Public link loads proposal, client can accept/reject, auto-marks viewed.
- **Phase 6:** Full flow: create -> send (email+PDF+link) -> client views -> accepts -> contract auto-created -> notifications sent.
