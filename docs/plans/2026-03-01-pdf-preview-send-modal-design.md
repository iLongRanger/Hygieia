# PDF Preview in Send Modals

Date: 2026-03-01

## Problem

Users send proposals and contracts without seeing the final PDF. They need a preview alongside the send form to review before hitting send.

## Design

### Layout

Widen the existing SendProposalModal and SendContractModal into a side-by-side layout. Left side shows a live PDF preview (fetched from the existing `/pdf` endpoint via iframe with blob URL), right side contains the current send form. On small screens, stacks vertically.

### PDF Loading

1. When modal opens, fetch PDF from `GET /:id/pdf` as a blob
2. Create object URL via `URL.createObjectURL(blob)`
3. Display in an `<iframe>` filling the left column
4. Show loading spinner while fetching
5. Clean up object URL on modal close

### API

No backend changes. Existing `GET /proposals/:id/pdf` and `GET /contracts/:id/pdf` endpoints already return binary PDFs.

## Files to Modify

- `apps/web/src/components/proposals/SendProposalModal.tsx` — add PDF preview pane, widen modal
- `apps/web/src/components/contracts/SendContractModal.tsx` — add PDF preview pane, widen modal
- `apps/web/src/lib/proposals.ts` — add `getProposalPdfBlobUrl()` helper
- `apps/web/src/lib/contracts.ts` — add `getContractPdfBlobUrl()` helper

## Out of Scope

- Editing the PDF from the preview
- Zoom/page navigation controls (browser built-in handles this)
- Regenerating PDF if modal fields change
