-- Add start_date and end_date columns to schedules table
ALTER TABLE schedules 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- Add comment to explain the purpose
COMMENT ON COLUMN schedules.start_date IS 'Start date for recurring schedule (inclusive)';
COMMENT ON COLUMN schedules.end_date IS 'End date for recurring schedule (inclusive)'; 