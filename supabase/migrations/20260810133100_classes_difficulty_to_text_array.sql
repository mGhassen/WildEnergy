-- Convert classes.difficulty from TEXT to TEXT[] (multi-select levels)

ALTER TABLE classes
  ALTER COLUMN difficulty DROP DEFAULT;

ALTER TABLE classes
  ALTER COLUMN difficulty TYPE TEXT[]
  USING CASE
    WHEN difficulty IS NULL OR btrim(difficulty) = '' THEN ARRAY['beginner']::TEXT[]
    ELSE ARRAY[difficulty]::TEXT[]
  END;

ALTER TABLE classes
  ALTER COLUMN difficulty SET DEFAULT ARRAY['beginner']::TEXT[],
  ALTER COLUMN difficulty SET NOT NULL;

ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS classes_difficulty_valid;

ALTER TABLE classes
  ADD CONSTRAINT classes_difficulty_valid CHECK (
    cardinality(difficulty) >= 1
    AND difficulty <@ ARRAY['beginner', 'intermediate', 'advanced']::TEXT[]
  );
