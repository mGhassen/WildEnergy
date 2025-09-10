-- Convert categories-groups relationship from one-to-many to many-to-many
-- This migration creates a junction table and migrates existing data

-- Step 1: Create the junction table for many-to-many relationship
CREATE TABLE category_groups (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT category_groups_unique UNIQUE(category_id, group_id)
);

-- Step 2: Migrate existing data from categories.group_id to category_groups table
INSERT INTO category_groups (category_id, group_id)
SELECT id, group_id 
FROM categories 
WHERE group_id IS NOT NULL;

-- Step 3: Add indexes for better performance
CREATE INDEX idx_category_groups_category_id ON category_groups(category_id);
CREATE INDEX idx_category_groups_group_id ON category_groups(group_id);

-- Step 4: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_category_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_groups_updated_at
    BEFORE UPDATE ON category_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_category_groups_updated_at();

-- Step 5: Remove the old group_id column from categories table
-- Drop the old index first
DROP INDEX IF EXISTS idx_categories_group_id;

-- Remove the group_id column from categories table
ALTER TABLE categories DROP COLUMN group_id;

-- Step 6: Add comments explaining the new structure
COMMENT ON TABLE category_groups IS 'Junction table for many-to-many relationship between categories and groups';
COMMENT ON COLUMN category_groups.category_id IS 'Reference to categories table';
COMMENT ON COLUMN category_groups.group_id IS 'Reference to groups table';
