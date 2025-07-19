ALTER TABLE class_registrations
ADD COLUMN course_id integer REFERENCES courses(id);

-- Optionally, make course_id NOT NULL and drop schedule_id if you want to fully migrate
ALTER TABLE class_registrations DROP COLUMN schedule_id;