-- Facility tasks must belong to an area. Remove legacy facility-wide tasks
-- before making the relation required.
DELETE FROM facility_task_fixture_minutes
WHERE facility_task_id IN (
  SELECT id FROM facility_tasks WHERE area_id IS NULL
);

DELETE FROM job_tasks
WHERE facility_task_id IN (
  SELECT id FROM facility_tasks WHERE area_id IS NULL
);

DELETE FROM facility_tasks
WHERE area_id IS NULL;

ALTER TABLE facility_tasks
ALTER COLUMN area_id SET NOT NULL;
