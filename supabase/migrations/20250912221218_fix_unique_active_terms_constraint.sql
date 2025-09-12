-- Fix unique_active_terms constraint to allow one active record per term_type
-- The original constraint was too restrictive and prevented having active terms of different types

-- Drop the old constraint that prevented any active terms
ALTER TABLE terms_and_conditions DROP CONSTRAINT IF EXISTS unique_active_terms;

-- Create a new constraint that allows one active record per term_type
-- This uses a partial unique index approach
CREATE UNIQUE INDEX unique_active_terms_by_type 
ON terms_and_conditions (term_type) 
WHERE is_active = TRUE;

-- Add a comment to clarify the new constraint behavior
COMMENT ON INDEX unique_active_terms_by_type IS 'Ensures only one active terms record per term_type';
