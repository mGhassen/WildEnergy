-- Migration: Create courses table for individual class instances

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  course_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 10,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_schedule_id ON courses(schedule_id);
CREATE INDEX IF NOT EXISTS idx_courses_class_id ON courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_trainer_id ON courses(trainer_id);
CREATE INDEX IF NOT EXISTS idx_courses_course_date ON courses(course_date);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_date_time ON courses(course_date, start_time);

-- Add comment to explain the table purpose
COMMENT ON TABLE courses IS 'Individual class instances generated from schedules. Each course represents a specific class occurrence on a specific date and time.'; 