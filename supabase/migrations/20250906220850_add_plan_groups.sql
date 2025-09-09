-- Create groups table
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT groups_name_unique UNIQUE(name)
);

-- Add group_id to categories table (one-to-many: each category belongs to exactly one group, but a group can contain many categories)
ALTER TABLE categories ADD COLUMN group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL;

-- Create plan_groups table (one-to-many: a plan has many groups)
CREATE TABLE plan_groups (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    session_count INTEGER NOT NULL DEFAULT 1,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT plan_groups_plan_group_unique UNIQUE(plan_id, group_id)
);

-- Add indexes for better performance
CREATE INDEX idx_groups_active ON groups(is_active);
CREATE INDEX idx_categories_group_id ON categories(group_id);
CREATE INDEX idx_plan_groups_plan_id ON plan_groups(plan_id);
CREATE INDEX idx_plan_groups_group_id ON plan_groups(group_id);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_groups_updated_at();

CREATE OR REPLACE FUNCTION update_plan_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_plan_groups_updated_at
    BEFORE UPDATE ON plan_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_plan_groups_updated_at();

-- Add comments explaining the new structure
COMMENT ON TABLE groups IS 'Groups that contain multiple categories (e.g., "Pole Dance Group" contains Pole Dance and Stretching categories)';
COMMENT ON COLUMN categories.group_id IS 'Each category belongs to exactly one group (one-to-many relationship: one group can contain many categories)';
COMMENT ON TABLE plan_groups IS 'Defines how many sessions of each group are included in a plan (one-to-many: a plan has many groups)';
COMMENT ON COLUMN plan_groups.session_count IS 'Number of sessions allowed for this group in the plan';
COMMENT ON COLUMN plan_groups.is_free IS 'Whether this group session is free (no charge) in the plan';
