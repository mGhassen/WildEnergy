-- One schedule can run on multiple weekdays (weekly).
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS days_of_week integer[];

UPDATE schedules
SET days_of_week = ARRAY[day_of_week]
WHERE day_of_week IS NOT NULL
  AND (days_of_week IS NULL OR cardinality(days_of_week) = 0);

ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_weekly_day_check;

ALTER TABLE schedules
  ADD CONSTRAINT schedules_weekly_day_check
  CHECK (
    repetition_type != 'weekly'
    OR day_of_week IS NOT NULL
    OR (days_of_week IS NOT NULL AND cardinality(days_of_week) > 0)
  );

ALTER TABLE schedules
  DROP CONSTRAINT IF EXISTS schedules_days_of_week_check;

ALTER TABLE schedules
  ADD CONSTRAINT schedules_days_of_week_check
  CHECK (
    days_of_week IS NULL
    OR (
      cardinality(days_of_week) > 0
      AND days_of_week <@ ARRAY[0, 1, 2, 3, 4, 5, 6]
    )
  );

COMMENT ON COLUMN schedules.days_of_week IS
  'Weekdays for weekly schedules (0=Sunday..6=Saturday). Preferred over day_of_week when set.';
