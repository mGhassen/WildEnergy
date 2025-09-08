-- Remove sessions_remaining column from subscriptions table
-- This is now handled by subscription_group_sessions table

-- Remove the column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS sessions_remaining;

-- Add a comment explaining the change
COMMENT ON TABLE subscriptions IS 'Subscriptions table - session tracking is now handled by subscription_group_sessions table';


-- Migration: Enhance schedule edit and delete functionality
-- This migration adds constraints, indexes, and documentation for the enhanced schedule management

-- Add constraints to ensure data integrity for schedule operations
ALTER TABLE schedules
  ADD CONSTRAINT schedules_repetition_type_check 
  CHECK (repetition_type IN ('once', 'daily', 'weekly', 'monthly'));

ALTER TABLE schedules
  ADD CONSTRAINT schedules_day_of_week_check 
  CHECK (day_of_week >= 0 AND day_of_week <= 6);

-- Add constraint to ensure start_date and end_date are valid for recurring schedules
ALTER TABLE schedules
  ADD CONSTRAINT schedules_recurring_dates_check 
  CHECK (
    (repetition_type = 'once' AND schedule_date IS NOT NULL) OR
    (repetition_type != 'once' AND start_date IS NOT NULL AND end_date IS NOT NULL AND start_date <= end_date)
  );

-- Add constraint to ensure day_of_week is set for weekly schedules
ALTER TABLE schedules
  ADD CONSTRAINT schedules_weekly_day_check 
  CHECK (
    (repetition_type != 'weekly') OR 
    (repetition_type = 'weekly' AND day_of_week IS NOT NULL)
  );

-- Add indexes for better performance on schedule queries
CREATE INDEX IF NOT EXISTS idx_schedules_class_id ON schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_trainer_id ON schedules(trainer_id);
CREATE INDEX IF NOT EXISTS idx_schedules_repetition_type ON schedules(repetition_type);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_is_active ON schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_schedules_schedule_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_end_date ON schedules(end_date);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_schedules_class_trainer ON schedules(class_id, trainer_id);
CREATE INDEX IF NOT EXISTS idx_schedules_repetition_day ON schedules(repetition_type, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_active_date ON schedules(is_active, schedule_date);

-- Add indexes for course-related queries (for edit/delete validation)
CREATE INDEX IF NOT EXISTS idx_courses_schedule_status ON courses(schedule_id, status);
CREATE INDEX IF NOT EXISTS idx_class_registrations_course_status ON class_registrations(course_id, status);
CREATE INDEX IF NOT EXISTS idx_checkins_registration ON checkins(registration_id);

-- Add function to check if schedule can be edited/deleted
CREATE OR REPLACE FUNCTION can_modify_schedule(schedule_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  registration_count INTEGER;
  checkin_count INTEGER;
BEGIN
  -- Count registrations for courses linked to this schedule
  SELECT COUNT(*)
  INTO registration_count
  FROM class_registrations cr
  JOIN courses c ON cr.course_id = c.id
  WHERE c.schedule_id = schedule_id_param;

  -- Count checkins for courses linked to this schedule
  SELECT COUNT(*)
  INTO checkin_count
  FROM checkins ch
  JOIN class_registrations cr ON ch.registration_id = cr.id
  JOIN courses c ON cr.course_id = c.id
  WHERE c.schedule_id = schedule_id_param;

  -- Return true if no registrations or checkins exist
  RETURN (registration_count = 0 AND checkin_count = 0);
END;
$$ LANGUAGE plpgsql;

-- Add function to get schedule modification status with details
CREATE OR REPLACE FUNCTION get_schedule_modification_status(schedule_id_param INTEGER)
RETURNS TABLE(
  can_modify BOOLEAN,
  registration_count INTEGER,
  checkin_count INTEGER,
  course_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (reg_count = 0 AND checkin_count = 0) as can_modify,
    reg_count as registration_count,
    checkin_count as checkin_count,
    course_count as course_count
  FROM (
    SELECT 
      COALESCE(reg_count, 0) as reg_count,
      COALESCE(checkin_count, 0) as checkin_count,
      COALESCE(course_count, 0) as course_count
    FROM (
      -- Count registrations
      SELECT COUNT(*) as reg_count
      FROM class_registrations cr
      JOIN courses c ON cr.course_id = c.id
      WHERE c.schedule_id = schedule_id_param
    ) regs
    CROSS JOIN (
      -- Count checkins
      SELECT COUNT(*) as checkin_count
      FROM checkins ch
      JOIN class_registrations cr ON ch.registration_id = cr.id
      JOIN courses c ON cr.course_id = c.id
      WHERE c.schedule_id = schedule_id_param
    ) checkins
    CROSS JOIN (
      -- Count courses
      SELECT COUNT(*) as course_count
      FROM courses c
      WHERE c.schedule_id = schedule_id_param
    ) courses
  ) counts;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedules_updated_at
  BEFORE UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedules_updated_at();

-- Add comments for documentation
COMMENT ON FUNCTION can_modify_schedule(INTEGER) IS 'Checks if a schedule can be edited or deleted based on existing registrations and checkins';
COMMENT ON FUNCTION get_schedule_modification_status(INTEGER) IS 'Returns detailed status about schedule modification eligibility with counts';
COMMENT ON TRIGGER trigger_update_schedules_updated_at ON schedules IS 'Automatically updates the updated_at timestamp when a schedule is modified';

-- Add table comments for better documentation
COMMENT ON TABLE schedules IS 'Schedule templates that define recurring or one-time class patterns. Individual course instances are generated from these schedules.';
COMMENT ON COLUMN schedules.repetition_type IS 'Type of repetition: once, daily, weekly, or monthly';
COMMENT ON COLUMN schedules.day_of_week IS 'Day of week (0=Sunday, 1=Monday, etc.) for weekly schedules';
COMMENT ON COLUMN schedules.schedule_date IS 'Specific date for one-time schedules';
COMMENT ON COLUMN schedules.start_date IS 'Start date for recurring schedules';
COMMENT ON COLUMN schedules.end_date IS 'End date for recurring schedules';
COMMENT ON COLUMN schedules.is_active IS 'Whether the schedule is currently active and generating courses';