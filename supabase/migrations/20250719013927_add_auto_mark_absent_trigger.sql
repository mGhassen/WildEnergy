-- Function to automatically mark registrations as absent when courses finish
CREATE OR REPLACE FUNCTION auto_mark_absent_registrations()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark registrations as absent for courses that have finished
  UPDATE class_registrations 
  SET status = 'absent'
  WHERE status = 'registered'
    AND course_id IN (
      SELECT id FROM courses 
      WHERE (course_date < CURRENT_DATE) 
         OR (course_date = CURRENT_DATE AND end_time < CURRENT_TIME)
    )
    AND id NOT IN (
      SELECT registration_id FROM checkins WHERE registration_id IS NOT NULL
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that runs every minute to check for finished courses
CREATE OR REPLACE FUNCTION check_finished_courses()
RETURNS void AS $$
BEGIN
  -- Mark registrations as absent for courses that have finished
  UPDATE class_registrations 
  SET status = 'absent'
  WHERE status = 'registered'
    AND course_id IN (
      SELECT id FROM courses 
      WHERE (course_date < CURRENT_DATE) 
         OR (course_date = CURRENT_DATE AND end_time < CURRENT_TIME)
    )
    AND id NOT IN (
      SELECT registration_id FROM checkins WHERE registration_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs the function when courses are updated
CREATE OR REPLACE TRIGGER trigger_auto_mark_absent
  AFTER UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_absent_registrations();

-- Create a trigger that runs when registrations are inserted
CREATE OR REPLACE TRIGGER trigger_check_finished_on_registration
  AFTER INSERT ON class_registrations
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_absent_registrations();

-- Create a trigger that runs when checkins are deleted (in case admin unvalidates)
CREATE OR REPLACE TRIGGER trigger_check_finished_on_checkin_delete
  AFTER DELETE ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION auto_mark_absent_registrations();

-- Create a scheduled job using pg_cron (if available)
-- This will run every 5 minutes to check for finished courses
-- Note: pg_cron extension needs to be enabled in Supabase
-- SELECT cron.schedule('mark-absent-registrations', '*/5 * * * *', 'SELECT check_finished_courses();'); 