-- Migration: Update schedules table to support recurring and one-time events

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
  ADD COLUMN IF NOT EXISTS schedule_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS repetition_type TEXT DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS parent_schedule_id INTEGER; 

-- Change start_time and end_time to TIME
ALTER TABLE schedules
  ALTER COLUMN start_time TYPE TIME USING start_time::time,
  ALTER COLUMN end_time TYPE TIME USING end_time::time;