# Inspection Notes, Photos & Inspector Guidance — Design

**Date:** 2026-02-22
**Status:** Approved

## Goal

Enhance the area-first inspection workflow so inspectors on mobile can:
1. Take notes per area
2. Attach multiple photos per area (camera capture)
3. See area-specific guidance prompts for what to check

## Data Model Changes

### AreaType — add guidance field
```prisma
guidanceItems  Json?  @db.JsonB  // string[] of checklist prompts
```

Seeded defaults by area type:
- **Restroom**: Soap dispensers filled, Paper towels/toilet paper stocked, Mirrors and fixtures clean, Floors mopped no standing water, Trash emptied, No odor issues
- **Lobby**: Floors vacuumed/mopped, Entry glass clean, Furniture dusted and arranged, Trash receptacles emptied, Light fixtures working
- **Kitchen/Breakroom**: Counters wiped and sanitized, Sink clean and drain clear, Appliance exteriors wiped, Trash and recycling emptied, Floors swept and mopped
- **Office**: Desks and surfaces dusted, Floors vacuumed, Trash emptied, Light fixtures working, Windows and glass clean
- **Generic fallback**: Area is visually clean, Surfaces dusted and wiped, Floors clean, Trash emptied, No safety hazards

### InspectionItem — multiple photos
```prisma
- photoUrl    String?          // REMOVE single URL
+ photoUrls   Json?  @db.JsonB  // string[] of photo URLs
```

Notes field already exists on InspectionItem — no change needed.

## Photo Upload: Cloudflare R2

### Why R2
- S3-compatible API (standard @aws-sdk/client-s3)
- Free tier: 10GB storage + 10M reads/month
- No egress fees
- Presigned URLs: mobile uploads go direct to R2, no API server load
- No hosting lock-in

### Upload Flow
```
Mobile Browser              API Server              Cloudflare R2
     |                          |                        |
     |-- POST /upload/presign → |                        |
     |   { fileName, type }     |                        |
     |                          |-- generate signed URL → |
     |← { uploadUrl, publicUrl} |                        |
     |                          |                        |
     |-- PUT binary ------------|---------------------→  |
     |                          |                        |
     |-- PATCH item ----------→ |                        |
     |   { photoUrls: [...] }   |                        |
```

### Constraints
- Max 5 photos per area
- Client-side compression: canvas resize to 1200px max width, 80% JPEG quality (~200KB each)
- Presigned URLs expire after 5 minutes
- Accepted types: image/jpeg, image/png, image/webp

## Inspector Guidance UX

### Source
- `guidanceItems` JSON array on the `AreaType` model
- Pulled into inspection detail via area → areaType relationship
- Template auto-generation includes guidance from area type

### Display
- Expandable accordion under each area category header, collapsed by default
- Label: "What to check"
- Shows checkboxes that are visual-only (local state, not persisted)
- Helps inspector track what they've looked at before scoring

### Area Scoring Card Layout (mobile)
```
┌─────────────────────────────────────────┐
│ Restroom                                 │
│ ───────────────────────────────────────  │
│ ▶ What to check                  [tap]   │
│   ☐ Soap dispensers filled               │
│   ☐ Mirrors and fixtures clean           │
│   ☐ Floors mopped, no standing water     │
│   ...                                    │
│                                          │
│  [PASS]  [FAIL]  [N/A]   ① ② ③ ④ ⑤     │
│                                          │
│  Notes: [________________________]       │
│  Photos: [📷 Add] [thumb] [thumb]        │
└─────────────────────────────────────────┘
```

## Mobile Considerations

- `<input type="file" accept="image/*" capture="environment">` opens rear camera
- Client-side canvas compression before upload
- Retry on upload failure (keep blob in memory)
- Min 44px touch targets
- Voice-to-text via native textarea keyboard support (no custom API)

## API Changes

| Endpoint | Change |
|---|---|
| `POST /api/upload/presign` | **New** — returns signed R2 upload URL |
| `PATCH /inspections/:id/items/:itemId` | Accept `photoUrls` (string[]) instead of `photoUrl` |
| `GET /inspections/:id` | Include `photoUrls` + `guidanceItems` from area type |
| `GET /area-types` | Ensure `guidanceItems` included in response |

## Out of Scope

- Photo deletion from R2
- Admin UI for editing area type guidance
- PDF/report generation with photos
- Full offline-first with local storage
