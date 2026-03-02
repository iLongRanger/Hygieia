# Jobs Calendar View

Date: 2026-03-01

## Problem

The jobs page has Table and Schedule views but no proper calendar. The Schedule view is a basic date-grouped card layout. A real calendar with month/week/day views would let users visualize job scheduling at a glance.

## Design

### View Toggle

Add Calendar as a third view mode alongside Table and Schedule. Within calendar mode, users can switch between Month, Week, and Day sub-views. Persist the selected calendar sub-view in localStorage (`jobs_calendar_view`).

### Data Adapter

Reuse existing calendar components (MonthCalendar, WeekCalendar, DayCalendar) from `apps/web/src/components/calendar/`. Map Job objects to the Appointment-like shape the components expect:

- `scheduledStart` = `scheduledDate` + `scheduledStartTime` (or start of day if no time)
- `scheduledEnd` = `scheduledDate` + `scheduledEndTime` (or start + estimatedHours if no end time)

Fetch jobs using `listJobs({ dateFrom, dateTo })` scoped to the visible date range.

### Job Block Display

Show: Facility name + Assignee name (e.g. "Main Office · John D.")

Status-based color coding:
- `scheduled` → blue
- `in_progress` → amber
- `completed` → green
- `canceled` → gray
- `missed` → red

### Interactions

- Click job block → navigate to `/jobs/{jobId}`
- Click empty day cell → no action (jobs are created from contracts)
- Month/Week/Day navigation via CalendarHeader (prev/next/today)

## Files to Modify

- `apps/web/src/pages/jobs/JobsList.tsx` — add calendar view mode and rendering

## Out of Scope

- Drag-and-drop rescheduling
- Creating jobs from the calendar
- Filtering within the calendar (existing filters already control listJobs)
