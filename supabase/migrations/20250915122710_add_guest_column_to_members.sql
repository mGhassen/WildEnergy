-- Add guest column to members table
-- This column tracks when a member is registered by an admin as a guest
-- Each time an admin registers a member as a guest, this counter is incremented

ALTER TABLE members 
ADD COLUMN guest_count INTEGER DEFAULT 0;

-- Add comment to explain the column purpose
COMMENT ON COLUMN members.guest_count IS 'Number of times this member has been registered as a guest by an admin. Increments each time admin registers them as a guest.';

-- Add index for better performance when querying guest members
CREATE INDEX idx_members_guest_count ON members(guest_count);

-- Add a check constraint to ensure guest_count is never negative
ALTER TABLE members 
ADD CONSTRAINT check_guest_count_non_negative 
CHECK (guest_count >= 0);
