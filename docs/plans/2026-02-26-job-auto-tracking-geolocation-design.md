# Job Auto-Tracking & Geolocation Validation Design

## Summary

Auto-create time entries when cleaners/subcontractors start and complete jobs. Validate that the worker is physically at the facility (via GPS geofence) before allowing job status changes. Admins/managers are exempt from geolocation checks.

## Requirements

- Starting a job (scheduled → in_progress) auto-clocks-in the worker
- Completing a job (in_progress → completed) auto-clocks-out the worker
- Both transitions require GPS validation against the facility's geofence for cleaners and subcontractors
- If outside geofence → block the action entirely (hard enforcement)
- Admins, managers, and owners are exempt from geolocation checks
- Two-way sync with confirmation: manual clock-out prompts "Also complete the job?"
- Applies to both internal cleaners and subcontractors

## Approach

Enhance the existing `PATCH /jobs/:id/status` endpoint with geolocation validation and automatic TimeEntry creation/completion. Atomic transactions ensure job status and time entry succeed or fail together.

## Backend Changes

### Job status transition — enhanced endpoint

`PATCH /jobs/:id/status`

**Request body (enhanced):**
```typescript
{
  status: 'in_progress' | 'completed',
  geoLocation?: { latitude: number, longitude: number, accuracy: number }
  // Required when user role is 'cleaner' or 'subcontractor'
}
```

### Starting a job (scheduled → in_progress)

When role is `cleaner` or `subcontractor`:
1. Validate `geoLocation` is provided
2. Look up job's facility coordinates from `facility.address`
3. Calculate distance using existing Haversine formula
4. If distance > `geofenceRadiusMeters` → return 400 `OUTSIDE_FACILITY_GEOFENCE`
5. In a transaction:
   a. Update job status to `in_progress`, set `actualStartTime = now()`
   b. Create TimeEntry with `entryType: 'clock_in'`, `status: 'active'`, linked to job/contract/facility
   c. Store geolocation + geofence verification in `TimeEntry.geoLocation`

### Completing a job (in_progress → completed)

When role is `cleaner` or `subcontractor`:
1. Same geolocation validation as above
2. In a transaction:
   a. Update job status to `completed`, set `actualEndTime = now()`, calculate `actualHours`
   b. Find the active TimeEntry linked to this job
   c. Clock out: set `clockOut = now()`, calculate `totalHours`, set `status: 'completed'`
   d. Store clock-out geolocation in TimeEntry metadata

### Admin bypass

When role is `owner`, `admin`, or `manager`: skip geolocation validation entirely. Status changes work as they do today without requiring GPS coordinates.

### Clock-out geolocation validation

`POST /time-tracking/clock-out` — enhanced:
- Accept optional `geoLocation` field
- When the active entry is linked to a job and user is cleaner/subcontractor, validate geofence on clock-out
- If outside geofence → return 400 `OUTSIDE_FACILITY_GEOFENCE`

## Frontend Changes

### Job detail page — Start/Complete buttons

For cleaners and subcontractors viewing a job:

**"Start Job" button (when status = scheduled):**
1. Request browser geolocation (`navigator.geolocation.getCurrentPosition`)
2. Show loading: "Verifying location..."
3. Send `PATCH /jobs/:id/status` with `{ status: 'in_progress', geoLocation }`
4. Success → toast "Job started & clocked in"
5. Geofence failure → error toast "You must be at the facility to start this job"

**"Complete Job" button (when status = in_progress):**
1. Same geolocation flow
2. Send `PATCH /jobs/:id/status` with `{ status: 'completed', geoLocation }`
3. Success → toast "Job completed & clocked out"
4. Geofence failure → error toast "You must be at the facility to complete this job"

### Clock-out confirmation modal

When clocking out from the Time Tracking page and the active entry is linked to a job:
- Show modal: "You're clocked in on job #JOB-XXX. Also mark the job as completed?"
- "Yes" → sends job completion request (with geolocation)
- "No" → clocks out only, job stays in_progress

### Admin view

Admins see Start/Complete buttons without geolocation prompts. Status changes work immediately.

## Data Model

No new models. Reuses existing:
- `TimeEntry.geoLocation` (JsonB) — stores GPS + geofence verification for both clock-in and clock-out
- `Job.actualStartTime` / `Job.actualEndTime` — already exist
- `Job.actualHours` — already exists
- Facility coordinates from `facility.address.latitude/longitude`
- Geofence radius from `facility.address.geofenceRadiusMeters`

## Error Codes

- `OUTSIDE_FACILITY_GEOFENCE` — worker is outside the facility's geofence radius
- `CLOCK_IN_LOCATION_REQUIRED` — geolocation not provided by cleaner/subcontractor
- `ACTIVE_CLOCK_IN_EXISTS` — worker already has an active time entry (for a different job)

## Edge Cases

- Worker has an active clock-in on a different job → block starting a new job, show error
- Facility has no coordinates configured → skip geofence check, allow action with warning
- GPS accuracy is very poor (>500m) → allow but store accuracy in metadata for review
- Job has no facility → skip geofence check

## Future Expansion (TODO)

- Periodic location pings during active jobs (background tracking)
- Geofence alerts when worker leaves site mid-job
- Photo proof of presence on clock-in/out
