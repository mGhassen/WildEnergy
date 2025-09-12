-- Add term_type column to terms_and_conditions table
-- This migration adds a proper term_type column to distinguish between different types of terms

-- Add term_type column
ALTER TABLE terms_and_conditions ADD COLUMN term_type VARCHAR(50) DEFAULT 'terms';

-- Add a comment to clarify the purpose of this field
COMMENT ON COLUMN terms_and_conditions.term_type IS 'Type of terms: terms (requires acceptance) or interior_regulation (display only)';

-- Update existing records based on title content
UPDATE terms_and_conditions 
SET term_type = 'interior_regulation' 
WHERE title ILIKE '%interior regulation%';

-- Set all other records to 'terms' type
UPDATE terms_and_conditions 
SET term_type = 'terms' 
WHERE term_type IS NULL OR term_type = '';

-- Add a check constraint to ensure valid term types
ALTER TABLE terms_and_conditions 
ADD CONSTRAINT check_valid_term_type 
CHECK (term_type IN ('terms', 'interior_regulation'));

-- Create an index for better performance on term_type lookups
CREATE INDEX IF NOT EXISTS idx_terms_term_type ON terms_and_conditions(term_type);

-- Create an index for active terms by type
CREATE INDEX IF NOT EXISTS idx_terms_active_by_type ON terms_and_conditions(term_type, is_active) WHERE is_active = TRUE;
