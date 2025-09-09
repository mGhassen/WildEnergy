# WildEnergy Scripts

This directory contains utility scripts for managing the WildEnergy gym management system.

## Available Scripts

### create-users.js (Legacy - Old System)

Creates users in the old WildEnergy system with unified user management.

**Usage:**
```bash
# Using npm script (recommended)
npm run create-users

# Or directly with node
node scripts/create-users.js
```

**Note:** This script is for the old user system. Use `create-test-users.js` for the new system.

### create-test-users.js (New System)

Creates test users in the new account-based user system with separate tables for accounts, profiles, members, and trainers.

**Usage:**
```bash
# Run the test user creation script
node scripts/create-test-users.js
```

**What it does:**
1. Creates auth users in Supabase Auth using the Admin API
2. Creates account records in the `accounts` table
3. Creates profile records in the `profiles` table
4. Creates member records for member users
5. Creates trainer records for trainer users
6. Sets up proper user roles and permissions

**Test users created:**
- **Admin users**: Full system access
  - `admin@wildenergy.tn` / `admin123` (Admin User)
  - `manager@wildenergy.tn` / `manager123` (Manager User)

- **Trainer users**: Can teach classes
  - `sarah.trainer@wildenergy.tn` / `trainer123` (Yoga & Pilates specialist)
  - `mike.trainer@wildenergy.tn` / `trainer123` (Cardio & HIIT specialist)

- **Member users**: Can register for classes
  - `john.member@email.com` / `member123` (Regular member)
  - `maria.member@email.com` / `member123` (New member)

- **Hybrid users**: Both member and trainer
  - `alex.hybrid@email.com` / `hybrid123` (Member + Trainer)

- **Admin + Trainer**: Admin who also trains
  - `sophie.admin@wildenergy.tn` / `admin123` (Admin + Trainer)

### validate-new-system.js

Validates that the new user system works correctly by testing all functionality.

**Usage:**
```bash
# Run the validation script
node scripts/validate-new-system.js
```

**What it tests:**
1. Account creation and authentication
2. Profile management
3. Member system functionality
4. Trainer system functionality
5. Portal access logic
6. User profile view
7. Foreign key relationships
8. Hybrid users (member + trainer)
9. Admin users
10. Guest members (no account)

**Prerequisites:**
- Supabase local development environment running (`supabase start`)
- New user system migrations applied
- Environment variables set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Environment Setup

Make sure you have the following environment variables in your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55421
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

You can get these values by running `supabase status` in your project directory.
