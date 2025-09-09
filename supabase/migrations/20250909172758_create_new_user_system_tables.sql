-- Migration: Create new user system tables
-- This migration creates the new account-based user system with separate tables for accounts, profiles, members, and trainers

-- 1. Create accounts table (authentication & access control)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT UNIQUE, -- Reference to Supabase auth.users
    email TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create profiles table (shared personal information)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth TIMESTAMP,
    address TEXT,
    profession TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create members table (trainee information)
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL, -- NULL if no account (guest members)
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    member_notes TEXT,
    credit NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create new trainers table (trainer information) - rename existing one first
ALTER TABLE trainers RENAME TO trainers_old;

CREATE TABLE trainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE, -- NOT NULL (trainers must have accounts)
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    specialization TEXT,
    experience_years INTEGER,
    bio TEXT,
    certification TEXT,
    hourly_rate NUMERIC,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create indexes for performance
CREATE INDEX idx_accounts_auth_user_id ON accounts(auth_user_id);
CREATE INDEX idx_accounts_email ON accounts(email);
CREATE INDEX idx_accounts_status ON accounts(status);
CREATE INDEX idx_members_account_id ON members(account_id);
CREATE INDEX idx_members_profile_id ON members(profile_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_trainers_account_id ON trainers(account_id);
CREATE INDEX idx_trainers_profile_id ON trainers(profile_id);
CREATE INDEX idx_trainers_status ON trainers(status);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- 6. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainers_updated_at
    BEFORE UPDATE ON trainers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create admin roles table for admin access control
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, role)
);

CREATE INDEX idx_admin_roles_account_id ON admin_roles(account_id);

-- 8. Create helper function to get user's accessible portals
CREATE OR REPLACE FUNCTION get_user_portals(account_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    portals TEXT[] := '{}';
BEGIN
    -- Check admin access (based on admin_roles table)
    IF EXISTS (SELECT 1 FROM admin_roles ar 
               JOIN accounts a ON ar.account_id = a.id 
               WHERE a.id = account_id AND a.status = 'active') THEN
        portals := array_append(portals, 'admin');
    END IF;
    
    -- Check member access
    IF EXISTS (SELECT 1 FROM members WHERE account_id = account_id AND status = 'active') THEN
        portals := array_append(portals, 'member');
    END IF;
    
    -- Check trainer access
    IF EXISTS (SELECT 1 FROM trainers WHERE account_id = account_id AND status = 'active') THEN
        portals := array_append(portals, 'trainer');
    END IF;
    
    RETURN portals;
END;
$$ LANGUAGE plpgsql;

-- 9. Create view for complete user information
CREATE VIEW user_profiles AS
SELECT 
    a.id as account_id,
    a.email,
    a.status as account_status,
    a.last_login,
    p.first_name,
    p.last_name,
    p.phone,
    p.date_of_birth,
    p.address,
    p.profession,
    p.emergency_contact_name,
    p.emergency_contact_phone,
    p.profile_image_url,
    m.id as member_id,
    m.member_notes,
    m.credit,
    m.status as member_status,
    m.subscription_status,
    t.id as trainer_id,
    t.specialization,
    t.experience_years,
    t.bio,
    t.certification,
    t.hourly_rate,
    t.status as trainer_status,
    ar.role as admin_role,
    CASE 
        WHEN ar.role IS NOT NULL AND t.id IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member_trainer'
        WHEN ar.role IS NOT NULL AND t.id IS NOT NULL THEN 'admin_trainer'
        WHEN ar.role IS NOT NULL AND m.id IS NOT NULL THEN 'admin_member'
        WHEN ar.role IS NOT NULL THEN 'admin'
        WHEN t.id IS NOT NULL AND m.id IS NOT NULL THEN 'member_trainer'
        WHEN t.id IS NOT NULL THEN 'trainer'
        WHEN m.id IS NOT NULL THEN 'member'
        ELSE 'account_only'
    END as user_type,
    get_user_portals(a.id) as accessible_portals
FROM accounts a
LEFT JOIN profiles p ON a.id = p.id -- One profile per account
LEFT JOIN members m ON a.id = m.account_id
LEFT JOIN trainers t ON a.id = t.account_id
LEFT JOIN admin_roles ar ON a.id = ar.account_id;
