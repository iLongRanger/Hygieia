# Appointments Daily + Weekly Views — Implementation Plan

Date: 2026-02-02

## Summary
Add daily and weekly calendar views to `/appointments`, with Sunday week start, full 7-day weeks, and both time-slot grid and list presentations. Update API date filtering to include overlapping appointments (scheduledStart <= dateTo AND scheduledEnd >= dateFrom).

## Decisions (Confirmed)
- Week starts on Sunday.
- Week view shows all 7 days.
- Day/week views include both time-slot grid and list.
- API date filtering should include overlapping appointments.

## Plan
1. View state and persistence
   1. Extend view state in `apps/web/src/pages/appointments/AppointmentsPage.tsx`:
      - `viewMode = 'table' | 'calendar'`
      - `calendarView = 'month' | 'week' | 'day'`
      - `calendarDate = new Date()` (anchor for week/day)
   2. Persist `calendarView` in `localStorage` (new key, e.g., `appointments_calendar_view`).

2. Calendar utilities
   1. Add helpers in `apps/web/src/lib/calendar-utils.ts`:
      - `getWeekRange(date)` ? `{ dateFrom, dateTo }` (Sunday–Saturday)
      - `getDayRange(date)` ? `{ dateFrom, dateTo }`
      - `getWeekDays(date)` ? array of 7 dates starting Sunday
      - `getTimeSlots(startHour, endHour, stepMins)` ? array of times for grid
      - `formatWeekRangeLabel(date)` ? display label

3. API filter update (overlapping appointments)
   1. Update `apps/api/src/services/appointmentService.ts` so that when `dateFrom`/`dateTo` are supplied, appointments that overlap the window are included:
      - `scheduledStart <= dateTo AND scheduledEnd >= dateFrom`
   2. Keep existing `includePast` behavior when no date range is provided.

4. New calendar components
   1. Add `WeekCalendar` and `DayCalendar` under `apps/web/src/components/calendar/`.
   2. Each view should support:
      - Time-slot grid
      - List panel (toggle between grid/list or show side-by-side)
   3. Reuse `AppointmentBlock` for list items; add a positioned variant for grid placement if needed.

5. Header/toolbar updates
   1. Extend `CalendarHeader` or create `CalendarToolbar`:
      - Prev/Next/Today controls update `calendarDate`
      - Label formatting:
        - Month: “February 2026”
        - Week: “Feb 1–Feb 7, 2026”
        - Day: “Mon, Feb 2, 2026”
      - Add grid/list toggle for week/day views

6. Data fetching for calendar views
   1. Update `fetchCalendarAppointments` in `AppointmentsPage.tsx`:
      - Month ? use existing `getDateRange(calendarYear, calendarMonth)`
      - Week ? use `getWeekRange(calendarDate)`
      - Day ? use `getDayRange(calendarDate)`
   2. Keep `includePast: true` for calendar views.

7. Wire UI rendering
   1. Add calendar view buttons: Month / Week / Day.
   2. Render the appropriate calendar component based on `calendarView`.
   3. Ensure `onCreateClick` passes selected date/time for week/day grids.

8. Tests
   1. Update `apps/web/src/pages/__tests__/AppointmentsPage.test.tsx`:
      - Verify correct `dateFrom/dateTo` for month/week/day.
      - Verify persisted `calendarView` state.
   2. Add tests for `WeekCalendar` and `DayCalendar` under `apps/web/src/components/calendar/__tests__/`.

## Notes
- Current calendar is month-only (`MonthCalendar`) with grid by day.
- Appointment listing uses `listAppointments` with date range filtering based on `scheduledStart` only; overlap filtering is required for cross-boundary appointments.
