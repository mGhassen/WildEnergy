# WildEnergy Scripts

This directory contains utility scripts for managing the WildEnergy gym management system.

## Available Scripts

### create-users.js

Creates users in the WildEnergy system with proper authentication and database records.

**Usage:**
```bash
# Using npm script (recommended)
npm run create-users

# Or directly with node
node scripts/create-users.js
```

**What it does:**
1. Creates auth users in Supabase Auth using the Admin API
2. Creates corresponding user records in the `users` table
3. Creates trainer records for users marked as trainers
4. Sets up proper user roles and permissions

**Users created:**
- **Admin users**: Full system access
  - `admin@wildenergy.gym` / `admin123`
  - `manager@wildenergy.gym` / `manager123`

- **Trainer users**: Can teach classes
  - `trainer1@wildenergy.gym` / `trainer123` (Pole Dance specialist)
  - `trainer2@wildenergy.gym` / `trainer123` (Yoga & Stretching)
  - `trainer3@wildenergy.gym` / `trainer123` (Cardio & Strength)

- **Member users**: Can register for classes
  - `member1@wildenergy.gym` / `member123` (Active member)
  - `member2@wildenergy.gym` / `member123` (New member)
  - `member3@wildenergy.gym` / `member123` (VIP member)
  - `member4@wildenergy.gym` / `member123` (Pending approval)
  - `member5@wildenergy.gym` / `member123` (Archived)

**Prerequisites:**
- Supabase local development environment running (`supabase start`)
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Note:** This script uses the service role key to create users without requiring email confirmation, which is necessary for development and testing purposes.

## Environment Setup

Make sure you have the following environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

You can get these values by running `supabase status` in your project directory.
