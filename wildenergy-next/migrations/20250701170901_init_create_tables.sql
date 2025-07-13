-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT categories_name_unique UNIQUE(name)
);

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    date_of_birth TIMESTAMP,
    is_admin BOOLEAN DEFAULT false,
    is_member BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'onhold',
    subscription_status TEXT DEFAULT 'inactive',
    profile_image_url TEXT,
    member_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trainers table
CREATE TABLE trainers (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    specialization TEXT,
    experience_years INTEGER,
    bio TEXT,
    certification TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create plans table
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_days INTEGER NOT NULL, -- in days
    max_sessions INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create classes table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    trainer_id INTEGER REFERENCES trainers(id),
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create schedules table
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id),
    trainer_id INTEGER REFERENCES trainers(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    max_participants INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create class registrations table
CREATE TABLE class_registrations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    schedule_id INTEGER REFERENCES schedules(id),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    qr_code TEXT NOT NULL,
    status TEXT DEFAULT 'registered',
    notes TEXT,
    CONSTRAINT class_registrations_qr_code_unique UNIQUE(qr_code)
);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    plan_id INTEGER REFERENCES plans(id),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create checkins table
CREATE TABLE checkins (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    registration_id INTEGER REFERENCES class_registrations(id),
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_consumed BOOLEAN DEFAULT true,
    notes TEXT
);
