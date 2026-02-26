# Job Auto-Tracking & Geolocation Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-create/close time entries when cleaners start/complete jobs, with mandatory GPS geofence validation for non-admin roles.

**Architecture:** Enhance `startJob()` and `completeJob()` in jobService to accept geolocation, validate against facility geofence using existing Haversine helpers, and atomically create/close TimeEntry records in the same transaction. Frontend sends GPS coordinates with job status changes for cleaner/subcontractor roles.

**Tech Stack:** Prisma transactions, existing Haversine geofence helpers, browser Geolocation API, Zod schemas

---

### Task 1: Backend — Add geolocation to startJob schema and route

**Files:**
- Modify: `apps/api/src/schemas/job.ts:91-94`
- Modify: `apps/api/src/routes/jobs.ts:160-179`

**Step 1: Add geoLocation to startJobSchema**

In `apps/api/src/schemas/job.ts`, update the `startJobSchema` (line 91):

```typescript
export const startJobSchema = z.object({
  managerOverride: z.boolean().optional().default(false),
  overrideReason: z.string().max(500).nullable().optional(),
  geoLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .nullable()
    .optional(),
});
```

**Step 2: Pass geoLocation through the route handler**

In `apps/api/src/routes/jobs.ts`, update the `POST /:id/start` handler (line 160) to pass geoLocation:

```typescript
router.post(
  '/:id/start',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = startJobSchema.safeParse(req.body || {});
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await startJob(req.params.id, req.user!.id, {
        managerOverride: parsed.data.managerOverride,
        overrideReason: parsed.data.overrideReason ?? null,
        userRole: req.user?.role,
        geoLocation: parsed.data.geoLocation ?? null,
      });
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);
```

**Step 3: Commit**

```bash
git add apps/api/src/schemas/job.ts apps/api/src/routes/jobs.ts
git commit -m "feat: add geoLocation to startJob schema and route"
```

---

### Task 2: Backend — Add geolocation to completeJob schema and route

**Files:**
- Modify: `apps/api/src/schemas/job.ts:69-72`
- Modify: `apps/api/src/routes/jobs.ts:182-200`

**Step 1: Add geoLocation to completeJobSchema**

In `apps/api/src/schemas/job.ts`, update `completeJobSchema` (line 69):

```typescript
export const completeJobSchema = z.object({
  completionNotes: z.string().nullable().optional(),
  actualHours: z.number().positive().nullable().optional(),
  geoLocation: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .nullable()
    .optional(),
});
```

**Step 2: Pass geoLocation through the route handler**

In `apps/api/src/routes/jobs.ts`, update the `POST /:id/complete` handler (line 182) to include geoLocation and userId:

```typescript
router.post(
  '/:id/complete',
  authenticate,
  requirePermission(PERMISSIONS.JOBS_WRITE),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = completeJobSchema.safeParse(req.body);
      if (!parsed.success) throw handleZodError(parsed.error);

      const job = await completeJob(req.params.id, {
        ...parsed.data,
        userId: req.user!.id,
        userRole: req.user?.role,
      });
      res.json({ data: job });
    } catch (error) {
      next(error);
    }
  }
);
```

**Step 3: Commit**

```bash
git add apps/api/src/schemas/job.ts apps/api/src/routes/jobs.ts
git commit -m "feat: add geoLocation to completeJob schema and route"
```

---

### Task 3: Backend — Extract geofence helpers to shared utility

**Files:**
- Create: `apps/api/src/lib/geofence.ts`
- Modify: `apps/api/src/services/timeTrackingService.ts:89-189`

The geofence helpers (`getCoordinatesFromAddress`, `getCoordinatesFromGeoLocation`, `calculateDistanceMeters`, `toObject`, `toNumber`, `toRadians`) currently live in `timeTrackingService.ts` (lines 89-189). Extract them to a shared file so `jobService.ts` can also use them.

**Step 1: Create `apps/api/src/lib/geofence.ts`**

Copy the following functions from `timeTrackingService.ts` into the new file:

```typescript
// apps/api/src/lib/geofence.ts
import { BadRequestError } from '../middleware/errorHandler';

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

export function getCoordinatesFromAddress(address: unknown): {
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
} | null {
  const raw = toObject(address);
  if (!raw) return null;

  const nestedLocation = toObject(raw.location);
  const nestedCoordinates = toObject(raw.coordinates);
  const lat =
    toNumber(raw.latitude) ??
    toNumber(raw.lat) ??
    toNumber(nestedLocation?.latitude) ??
    toNumber(nestedLocation?.lat) ??
    toNumber(nestedCoordinates?.latitude) ??
    toNumber(nestedCoordinates?.lat);
  const lng =
    toNumber(raw.longitude) ??
    toNumber(raw.lng) ??
    toNumber(nestedLocation?.longitude) ??
    toNumber(nestedLocation?.lng) ??
    toNumber(nestedCoordinates?.longitude) ??
    toNumber(nestedCoordinates?.lng);

  if (lat === null || lng === null) return null;
  const geofenceRadiusMeters =
    toNumber(raw.geofenceRadiusMeters) ??
    toNumber(raw.geofence_radius_meters) ??
    150;

  return { latitude: lat, longitude: lng, geofenceRadiusMeters };
}

export function getCoordinatesFromGeoLocation(geoLocation: unknown): {
  latitude: number;
  longitude: number;
  accuracy: number | null;
} | null {
  const raw = toObject(geoLocation);
  if (!raw) return null;

  const latitude = toNumber(raw.latitude) ?? toNumber(raw.lat);
  const longitude = toNumber(raw.longitude) ?? toNumber(raw.lng);
  if (latitude === null || longitude === null) return null;

  return { latitude, longitude, accuracy: toNumber(raw.accuracy) };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(earthRadius * c);
}

/**
 * Validates that the given geoLocation is within the facility's geofence.
 * Throws BadRequestError if outside.
 * Returns geofence metadata on success.
 */
export function validateGeofence(
  geoLocation: { latitude: number; longitude: number; accuracy: number | null },
  facilityCoords: { latitude: number; longitude: number; geofenceRadiusMeters: number }
): { verified: true; distanceMeters: number; allowedRadiusMeters: number } {
  const distance = calculateDistanceMeters(geoLocation, facilityCoords);
  if (distance > facilityCoords.geofenceRadiusMeters) {
    throw new BadRequestError('You must be at the facility to perform this action', {
      code: 'OUTSIDE_FACILITY_GEOFENCE',
      distanceMeters: distance,
      allowedRadiusMeters: facilityCoords.geofenceRadiusMeters,
    });
  }
  return {
    verified: true,
    distanceMeters: distance,
    allowedRadiusMeters: facilityCoords.geofenceRadiusMeters,
  };
}
```

**Step 2: Update `timeTrackingService.ts` to import from the new file**

In `timeTrackingService.ts`, replace the local helper functions (lines ~89-189) with imports:

```typescript
import {
  getCoordinatesFromAddress,
  getCoordinatesFromGeoLocation,
  calculateDistanceMeters,
} from '../lib/geofence';
```

Remove the duplicated functions (`toObject`, `toNumber`, `getCoordinatesFromAddress`, `getCoordinatesFromGeoLocation`, `toRadians`, `calculateDistanceMeters`) from `timeTrackingService.ts`. Keep `toObject` and `toNumber` only if they're used elsewhere in the file for non-geofence purposes (check before removing).

**Step 3: Run existing tests to verify refactor**

Run: `npx vitest run apps/api/src/services/__tests__/timeTracking* --reporter=verbose`
Expected: All existing tests still pass.

**Step 4: Commit**

```bash
git add apps/api/src/lib/geofence.ts apps/api/src/services/timeTrackingService.ts
git commit -m "refactor: extract geofence helpers to shared lib/geofence.ts"
```

---

### Task 4: Backend — Add geofence validation + auto clock-in to startJob

**Files:**
- Modify: `apps/api/src/services/jobService.ts:92-96` (StartJobOptions interface)
- Modify: `apps/api/src/services/jobService.ts:501-604` (startJob function)

**Step 1: Update StartJobOptions interface**

In `jobService.ts` (line 92), add geoLocation:

```typescript
export interface StartJobOptions {
  managerOverride?: boolean;
  overrideReason?: string | null;
  userRole?: string;
  geoLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
}
```

**Step 2: Add geofence validation and auto clock-in to startJob**

In `jobService.ts`, add imports at the top:

```typescript
import {
  getCoordinatesFromAddress,
  validateGeofence,
} from '../lib/geofence';
```

Then modify the `startJob` function (line 501). After the schedule validation block (line 576) and before the transaction (line 578), add geofence validation for non-admin roles:

```typescript
  // Geofence validation for cleaners/subcontractors
  const GEOFENCE_EXEMPT_ROLES = new Set(['owner', 'admin', 'manager']);
  const requiresGeofence = !GEOFENCE_EXEMPT_ROLES.has(options.userRole || '');

  let geofenceResult: { verified: true; distanceMeters: number; allowedRadiusMeters: number } | null = null;

  if (requiresGeofence) {
    if (!options.geoLocation) {
      throw new BadRequestError('Location is required to start this job', {
        code: 'CLOCK_IN_LOCATION_REQUIRED',
      });
    }

    const facilityAddress =
      existing.facility?.address ?? existing.contract?.facility?.address;
    const facilityCoords = getCoordinatesFromAddress(facilityAddress);

    if (facilityCoords) {
      geofenceResult = validateGeofence(options.geoLocation as any, facilityCoords);
    }
  }
```

Inside the transaction (line 578), after the job update and jobActivity creation, add auto clock-in:

```typescript
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id },
      data: {
        status: 'in_progress',
        actualStartTime: new Date(),
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'started',
        performedByUserId: userId,
        metadata: options.managerOverride
          ? { managerOverride: true, overrideReason: options.overrideReason || null }
          : {},
      },
    });

    // Auto clock-in for the user
    // First check for existing active entry
    const existingEntry = await tx.timeEntry.findFirst({
      where: { userId, status: 'active', clockOut: null },
    });
    if (existingEntry) {
      throw new BadRequestError(
        'You already have an active clock-in. Clock out first before starting a new job.',
        { code: 'ACTIVE_CLOCK_IN_EXISTS' }
      );
    }

    await tx.timeEntry.create({
      data: {
        userId,
        jobId: id,
        contractId: existing.contract?.id || null,
        facilityId: (job as any).facilityId || null,
        clockIn: new Date(),
        entryType: 'clock_in',
        status: 'active',
        geoLocation: options.geoLocation
          ? {
              ...options.geoLocation,
              source: 'job_start',
              geofence: geofenceResult || undefined,
            }
          : undefined,
      },
    });

    return withWorkforceMetadata(job);
  });
```

**Step 3: Commit**

```bash
git add apps/api/src/services/jobService.ts
git commit -m "feat: add geofence validation and auto clock-in to startJob"
```

---

### Task 5: Backend — Add geofence validation + auto clock-out to completeJob

**Files:**
- Modify: `apps/api/src/services/jobService.ts:56-60` (JobCompleteInput interface)
- Modify: `apps/api/src/services/jobService.ts:606-649` (completeJob function)

**Step 1: Update JobCompleteInput interface**

In `jobService.ts` (line 56), add geoLocation and userRole:

```typescript
export interface JobCompleteInput {
  completionNotes?: string | null;
  actualHours?: number | null;
  userId: string;
  userRole?: string;
  geoLocation?: { latitude: number; longitude: number; accuracy?: number } | null;
}
```

**Step 2: Add geofence validation and auto clock-out to completeJob**

Modify `completeJob` (line 606). Update the initial query to include facility info:

```typescript
export async function completeJob(id: string, input: JobCompleteInput) {
  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      actualStartTime: true,
      facilityId: true,
      facility: { select: { address: true } },
      contract: {
        select: {
          id: true,
          facility: { select: { address: true } },
        },
      },
    },
  });
  if (!existing) throw new NotFoundError('Job not found');
  if (existing.status === 'completed') {
    throw new BadRequestError('Job already completed');
  }
  if (existing.status === 'canceled') {
    throw new BadRequestError('Cannot complete a canceled job');
  }

  // Geofence validation for cleaners/subcontractors
  const GEOFENCE_EXEMPT_ROLES = new Set(['owner', 'admin', 'manager']);
  const requiresGeofence = !GEOFENCE_EXEMPT_ROLES.has(input.userRole || '');

  let geofenceResult: { verified: true; distanceMeters: number; allowedRadiusMeters: number } | null = null;

  if (requiresGeofence) {
    if (!input.geoLocation) {
      throw new BadRequestError('Location is required to complete this job', {
        code: 'CLOCK_IN_LOCATION_REQUIRED',
      });
    }

    const facilityAddress =
      existing.facility?.address ?? existing.contract?.facility?.address;
    const facilityCoords = getCoordinatesFromAddress(facilityAddress);

    if (facilityCoords) {
      geofenceResult = validateGeofence(input.geoLocation as any, facilityCoords);
    }
  }

  const now = new Date();
  let actualHours = input.actualHours ?? null;
  if (!actualHours && existing.actualStartTime) {
    const diffMs = now.getTime() - existing.actualStartTime.getTime();
    actualHours = Math.round((diffMs / 3600000) * 100) / 100;
  }

  return prisma.$transaction(async (tx) => {
    const job = await tx.job.update({
      where: { id },
      data: {
        status: 'completed',
        actualEndTime: now,
        actualHours,
        completionNotes: input.completionNotes ?? undefined,
      },
      select: jobSelect,
    });

    await tx.jobActivity.create({
      data: {
        jobId: id,
        action: 'completed',
        performedByUserId: input.userId,
        metadata: { actualHours },
      },
    });

    // Auto clock-out: find active time entry linked to this job
    const activeEntry = await tx.timeEntry.findFirst({
      where: { userId: input.userId, jobId: id, status: 'active', clockOut: null },
    });

    if (activeEntry) {
      const elapsed = now.getTime() - activeEntry.clockIn.getTime();
      const breakMs = (activeEntry.breakMinutes || 0) * 60000;
      const totalHours = Math.round(((elapsed - breakMs) / 3600000) * 100) / 100;

      const existingGeo = (activeEntry.geoLocation as Record<string, unknown>) || {};
      await tx.timeEntry.update({
        where: { id: activeEntry.id },
        data: {
          clockOut: now,
          totalHours: new Prisma.Decimal(Math.max(0, totalHours)),
          status: 'completed',
          geoLocation: input.geoLocation
            ? {
                ...existingGeo,
                clockOutLocation: {
                  ...input.geoLocation,
                  geofence: geofenceResult || undefined,
                },
              }
            : existingGeo,
        },
      });
    }

    return withWorkforceMetadata(job);
  });
}
```

Add Prisma import at top of file if not already present:
```typescript
import { Prisma } from '@prisma/client';
```

**Step 3: Commit**

```bash
git add apps/api/src/services/jobService.ts
git commit -m "feat: add geofence validation and auto clock-out to completeJob"
```

---

### Task 6: Backend — Add geolocation to clock-out endpoint

**Files:**
- Modify: `apps/api/src/schemas/timeTracking.ts:29-33` (clockOutSchema)
- Modify: `apps/api/src/routes/timeTracking.ts:96-102` (clock-out route)
- Modify: `apps/api/src/services/timeTrackingService.ts:426-447` (clockOut function)

**Step 1: Add geoLocation to clockOutSchema**

In `apps/api/src/schemas/timeTracking.ts` (line 29):

```typescript
export const clockOutSchema = z.object({
  body: z.object({
    notes: z.string().max(1000).optional().nullable(),
    geoLocation: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
      })
      .nullable()
      .optional(),
  }),
});
```

**Step 2: Update clock-out route to pass geoLocation and role**

In `apps/api/src/routes/timeTracking.ts` (line 96):

```typescript
router.post(
  '/clock-out',
  validate(clockOutSchema),
  async (req: Request, res: Response) => {
    const entry = await clockOut(
      req.user!.id,
      req.body.notes,
      req.body.geoLocation,
      req.user?.role
    );
    res.json({ data: entry });
  }
);
```

**Step 3: Update clockOut service function**

In `apps/api/src/services/timeTrackingService.ts` (line 426):

```typescript
export async function clockOut(
  userId: string,
  notes?: string,
  geoLocation?: { latitude: number; longitude: number; accuracy?: number } | null,
  userRole?: string
) {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, status: 'active', clockOut: null },
    include: {
      job: { select: { id: true, facilityId: true, facility: { select: { address: true } } } },
    },
  });
  if (!active) throw new BadRequestError('No active clock-in found');

  // Geofence validation on clock-out for cleaners/subcontractors when linked to a job
  const GEOFENCE_EXEMPT_ROLES = new Set(['owner', 'admin', 'manager']);
  const requiresGeofence = !GEOFENCE_EXEMPT_ROLES.has(userRole || '') && active.job;

  let clockOutGeofence = null;
  if (requiresGeofence) {
    if (!geoLocation) {
      throw new BadRequestError('Location is required to clock out', {
        code: 'CLOCK_IN_LOCATION_REQUIRED',
      });
    }
    const facilityCoords = getCoordinatesFromAddress(active.job?.facility?.address);
    if (facilityCoords) {
      clockOutGeofence = validateGeofence(geoLocation as any, facilityCoords);
    }
  }

  const clockOutTime = new Date();
  const totalHours = computeHours(active.clockIn, clockOutTime, active.breakMinutes);

  const existingGeo = (active.geoLocation as Record<string, unknown>) || {};
  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: {
      clockOut: clockOutTime,
      totalHours: new Prisma.Decimal(totalHours),
      status: 'completed',
      notes: notes || active.notes,
      geoLocation: geoLocation
        ? { ...existingGeo, clockOutLocation: { ...geoLocation, geofence: clockOutGeofence } }
        : existingGeo,
    },
    select: timeEntryDetailSelect,
  });

  return entry;
}
```

Add import for `validateGeofence` from `'../lib/geofence'` at the top of the file.

**Step 4: Commit**

```bash
git add apps/api/src/schemas/timeTracking.ts apps/api/src/routes/timeTracking.ts apps/api/src/services/timeTrackingService.ts
git commit -m "feat: add geolocation validation to clock-out endpoint"
```

---

### Task 7: Frontend — Add geolocation to startJob and completeJob API calls

**Files:**
- Modify: `apps/web/src/lib/jobs.ts:53-67`

**Step 1: Update API function signatures**

In `apps/web/src/lib/jobs.ts`, update `startJob` (line 53) and `completeJob` (line 61):

```typescript
export async function startJob(
  id: string,
  options: {
    managerOverride?: boolean;
    overrideReason?: string | null;
    geoLocation?: { latitude: number; longitude: number; accuracy: number } | null;
  } = {}
): Promise<Job> {
  const response = await api.post(`/jobs/${id}/start`, options);
  return response.data.data;
}

export async function completeJob(
  id: string,
  input: {
    completionNotes?: string | null;
    actualHours?: number | null;
    geoLocation?: { latitude: number; longitude: number; accuracy: number } | null;
  } = {}
): Promise<Job> {
  const response = await api.post(`/jobs/${id}/complete`, input);
  return response.data.data;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/jobs.ts
git commit -m "feat: add geoLocation to startJob and completeJob API functions"
```

---

### Task 8: Frontend — Add geolocation helper utility

**Files:**
- Create: `apps/web/src/lib/geolocation.ts`

**Step 1: Create shared geolocation helper**

```typescript
// apps/web/src/lib/geolocation.ts

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function requestGeolocation(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable location access to continue.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location unavailable. Please try again.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please try again.'));
            break;
          default:
            reject(new Error('Failed to get location'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/geolocation.ts
git commit -m "feat: add shared geolocation helper utility"
```

---

### Task 9: Frontend — Update JobDetail to request geolocation on Start/Complete

**Files:**
- Modify: `apps/web/src/pages/jobs/JobDetail.tsx:104-144` (handleStart, handleComplete)

**Step 1: Import geolocation helper and update handlers**

At the top of `JobDetail.tsx`, add:

```typescript
import { requestGeolocation } from '../../lib/geolocation';
```

Get the user role:

```typescript
const userRole = useAuthStore((state) => state.user?.role);
const requiresGeofence = userRole === 'cleaner' || userRole === 'subcontractor';
```

**Step 2: Update handleStart** (line 104)

Replace the existing `handleStart` function:

```typescript
const [gettingLocation, setGettingLocation] = useState(false);

const handleStart = async () => {
  if (!id) return;
  try {
    let geoLocation = null;
    if (requiresGeofence) {
      setGettingLocation(true);
      try {
        geoLocation = await requestGeolocation();
      } catch (geoError: any) {
        toast.error(geoError.message || 'Failed to get location');
        return;
      } finally {
        setGettingLocation(false);
      }
    }

    await startJob(id, { geoLocation });
    toast.success('Job started & clocked in');
    fetchJob();
  } catch (error: any) {
    const details = error?.response?.data?.error?.details;
    if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
      toast.error('You must be at the facility to start this job');
      return;
    }
    if (details?.code === 'ACTIVE_CLOCK_IN_EXISTS') {
      toast.error('You already have an active clock-in. Clock out first.');
      return;
    }
    const canManagerOverride = ['owner', 'admin', 'manager'].includes(userRole || '');
    if (details?.code === 'OUTSIDE_SERVICE_WINDOW' && canManagerOverride) {
      const confirmed = confirm(
        `Outside allowed service window (${details.allowedWindowStart}-${details.allowedWindowEnd}, ` +
        `${details.timezone}). Apply manager override?`
      );
      if (confirmed) {
        await startJob(id, {
          managerOverride: true,
          overrideReason: 'Manager override from Job detail',
          geoLocation: null,
        });
        toast.success('Job started with manager override');
        fetchJob();
        return;
      }
    }
    toast.error(
      details?.code === 'OUTSIDE_SERVICE_WINDOW'
        ? 'Outside allowed service window'
        : 'Failed to start job'
    );
  }
};
```

**Step 3: Update handleComplete** (line 134)

Replace the existing `handleComplete` function:

```typescript
const handleComplete = async () => {
  if (!id) return;
  try {
    let geoLocation = null;
    if (requiresGeofence) {
      setGettingLocation(true);
      try {
        geoLocation = await requestGeolocation();
      } catch (geoError: any) {
        toast.error(geoError.message || 'Failed to get location');
        return;
      } finally {
        setGettingLocation(false);
      }
    }

    await completeJob(id, {
      completionNotes: completionNotes || null,
      geoLocation,
    });
    toast.success('Job completed & clocked out');
    setShowCompleteForm(false);
    fetchJob();
  } catch (error: any) {
    const details = error?.response?.data?.error?.details;
    if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
      toast.error('You must be at the facility to complete this job');
      return;
    }
    toast.error('Failed to complete job');
  }
};
```

**Step 4: Update the Start button to show loading state**

Find the Start button JSX and add the loading indicator:

```tsx
{job.status === 'scheduled' && (
  <Button size="sm" onClick={handleStart} disabled={gettingLocation}>
    {gettingLocation ? (
      <>
        <MapPin className="mr-1.5 h-4 w-4 animate-pulse" />
        Verifying location...
      </>
    ) : (
      <>
        <PlayCircle className="mr-1.5 h-4 w-4" />
        Start Job
      </>
    )}
  </Button>
)}
```

Add `MapPin` to the lucide-react imports.

**Step 5: Commit**

```bash
git add apps/web/src/pages/jobs/JobDetail.tsx
git commit -m "feat: add geolocation validation to job start/complete in UI"
```

---

### Task 10: Frontend — Update clock-out to send geolocation and handle job completion

**Files:**
- Modify: `apps/web/src/lib/timeTracking.ts` (clockOut API function)
- Modify: `apps/web/src/pages/timeTracking/TimeTrackingPage.tsx:241-286`

**Step 1: Update clockOut API function**

In `apps/web/src/lib/timeTracking.ts`, find the `clockOut` function and add geoLocation parameter:

```typescript
export async function clockOut(
  notes?: string,
  geoLocation?: { latitude: number; longitude: number; accuracy: number } | null
) {
  const response = await api.post('/time-tracking/clock-out', { notes, geoLocation });
  return response.data.data;
}
```

**Step 2: Update TimeTrackingPage handleClockOut**

In `TimeTrackingPage.tsx`, import the geolocation helper:

```typescript
import { requestGeolocation } from '../../lib/geolocation';
```

Get user role:
```typescript
const userRole = useAuthStore((state) => state.user?.role);
const requiresGeofence = userRole === 'cleaner' || userRole === 'subcontractor';
```

Update `handleClockOut` (line 241):

```typescript
const handleClockOut = async () => {
  if (activeEntry?.job?.id) {
    try {
      const job = await getJob(activeEntry.job.id);
      if (job.status === 'in_progress') {
        setShowClockOutCompleteModal(true);
        return;
      }
    } catch {
      // fallback to clock out even if job lookup fails
    }
  }
  try {
    setClockingOut(true);
    let geoLocation = null;
    if (requiresGeofence && activeEntry?.job) {
      try {
        geoLocation = await requestGeolocation();
      } catch (geoError: any) {
        toast.error(geoError.message || 'Failed to get location');
        setClockingOut(false);
        return;
      }
    }
    await clockOut(undefined, geoLocation);
    setActiveEntry(null);
    toast.success('Clocked out!');
    fetchEntries();
  } catch (error: any) {
    const details = error?.response?.data?.error?.details;
    if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
      toast.error('You must be at the facility to clock out');
    } else {
      toast.error('Failed to clock out');
    }
  } finally {
    setClockingOut(false);
  }
};
```

Update `handleCompleteAndClockOut` (line 266) to include geolocation:

```typescript
const handleCompleteAndClockOut = async () => {
  if (!activeEntry?.job?.id) return;

  try {
    setClockingOut(true);
    let geoLocation = null;
    if (requiresGeofence) {
      try {
        geoLocation = await requestGeolocation();
      } catch (geoError: any) {
        toast.error(geoError.message || 'Failed to get location');
        setClockingOut(false);
        return;
      }
    }
    await completeJob(activeEntry.job.id, {
      completionNotes: jobCompletionNotes || null,
      geoLocation,
    });
    await clockOut(clockOutNotes || undefined, geoLocation);
    setActiveEntry(null);
    setShowClockOutCompleteModal(false);
    setJobCompletionNotes('');
    setClockOutNotes('');
    toast.success('Job completed and clocked out');
    fetchEntries();
  } catch (error: any) {
    const details = error?.response?.data?.error?.details;
    if (details?.code === 'OUTSIDE_FACILITY_GEOFENCE') {
      toast.error('You must be at the facility to complete this job');
    } else {
      toast.error('Failed to complete job and clock out');
    }
  } finally {
    setClockingOut(false);
  }
};
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/timeTracking.ts apps/web/src/pages/timeTracking/TimeTrackingPage.tsx
git commit -m "feat: add geolocation to clock-out and job completion flow"
```

---

### Summary

| Task | What it does |
|------|-------------|
| 1 | Add geoLocation to startJob Zod schema + route |
| 2 | Add geoLocation to completeJob Zod schema + route |
| 3 | Extract geofence helpers to shared `lib/geofence.ts` |
| 4 | Geofence validation + auto clock-in in `startJob()` |
| 5 | Geofence validation + auto clock-out in `completeJob()` |
| 6 | Geofence validation on manual clock-out endpoint |
| 7 | Update frontend API functions with geoLocation params |
| 8 | Create shared frontend geolocation helper |
| 9 | Update JobDetail UI: geolocation on Start/Complete |
| 10 | Update TimeTrackingPage: geolocation on clock-out |
