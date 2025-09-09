-- Add member onboarding tables
-- This migration creates tables to track member onboarding progress and terms acceptance

-- Create member_onboarding table to track onboarding progress
CREATE TABLE IF NOT EXISTS member_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    personal_info_completed BOOLEAN DEFAULT FALSE,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one onboarding record per member
    UNIQUE(member_id)
);

-- Create terms_and_conditions table to store terms content
CREATE TABLE IF NOT EXISTS terms_and_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one active version at a time
    CONSTRAINT unique_active_terms EXCLUDE (is_active WITH =) WHERE (is_active = TRUE)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_member_onboarding_member_id ON member_onboarding(member_id);
CREATE INDEX IF NOT EXISTS idx_terms_active ON terms_and_conditions(is_active);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_member_onboarding_updated_at 
    BEFORE UPDATE ON member_onboarding 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terms_updated_at 
    BEFORE UPDATE ON terms_and_conditions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to automatically create onboarding records when a member is created
CREATE OR REPLACE FUNCTION create_member_onboarding()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO member_onboarding (member_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically create onboarding records
CREATE TRIGGER create_member_onboarding_trigger
    AFTER INSERT ON members
    FOR EACH ROW EXECUTE FUNCTION create_member_onboarding();

-- Create a view for easy access to onboarding status
CREATE OR REPLACE VIEW member_onboarding_status AS
SELECT 
    mo.id,
    mo.member_id,
    mo.personal_info_completed,
    mo.terms_accepted,
    mo.terms_accepted_at,
    mo.onboarding_completed,
    mo.onboarding_completed_at,
    mo.created_at,
    mo.updated_at,
    m.status as member_status,
    m.account_id,
    a.email,
    p.first_name,
    p.last_name
FROM member_onboarding mo
JOIN members m ON mo.member_id = m.id
JOIN accounts a ON m.account_id = a.id
LEFT JOIN profiles p ON m.profile_id = p.id;

-- Insert default terms and conditions
INSERT INTO terms_and_conditions (version, title, content, is_active) VALUES 
('1.0', 'Conditions Générales d''Utilisation', 
'# Conditions Générales d''Utilisation - Wild Energy

## 1. Objet
Les présentes conditions générales d''utilisation (CGU) régissent l''utilisation de la plateforme Wild Energy.

## 2. Acceptation des conditions
L''utilisation de la plateforme implique l''acceptation pleine et entière des présentes CGU.

## 3. Services proposés
Wild Energy propose des services de fitness et de bien-être.

## 4. Inscription
L''inscription est gratuite et ouverte à toute personne majeure.

## 5. Utilisation
L''utilisateur s''engage à respecter les règles de la salle de sport.

## 6. Protection des données
Wild Energy s''engage à protéger les données personnelles conformément au RGPD.

## 7. Contact
Pour toute question, contactez-nous à : contact@wildenergy.tn', 
TRUE);