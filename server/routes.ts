import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { supabase } from "./supabase";
import session from 'express-session';

// Extend the session type to include user property
interface CustomSession extends session.Session {
  user?: {
    email: string;
    id: string;
    isAdmin: boolean;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    console.log('=== Health Check Started ===');
    console.log('Request from IP:', req.ip);
    console.log('Supabase URL:', process.env.SUPABASE_URL || 'Not Set');

    try {
      console.log('Testing Supabase connection...');

      // Test Supabase connection by making a simple request
      const { data: authData, error: authError } = await supabase.auth.getSession();

      if (authError) {
        console.error('Supabase auth test failed:', authError);
        // If auth fails, try a direct REST API call to Supabase
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          }
        });

        if (!response.ok) {
          throw new Error(`Supabase API returned ${response.status}: ${response.statusText}`);
        }
      }

      console.log('Successfully connected to Supabase');

      res.json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
        supabaseConnected: true
      });
    } catch (error: any) {
      console.error('=== Health Check Failed ===');
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        name: error.name,
        stack: error.stack
      });

      res.status(500).json({
        status: 'error',
        error: 'Database connection failed',
        details: error.message,
        code: error.code
      });
    } finally {
      console.log('=== Health Check Completed ===\n');
    }
  });

  // User registration endpoint
  console.log('Registering route: POST /api/auth/register');
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName) {
        return res.status(400).json({ 
          success: false,
          error: 'Email, password, and first name are required' 
        });
      }

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('Auth creation error:', authError);
        return res.status(400).json({ 
          success: false,
          error: authError?.message || 'Failed to create user'
        });
      }

      // 2. Create user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .insert([
          {
            auth_user_id: authData.user.id,
            email,
            first_name: firstName,
            last_name: lastName || '',
            is_admin: false,
            is_member: true,
            status: 'onhold',
            subscription_status: 'inactive',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        
        return res.status(500).json({ 
          success: false,
          error: 'Failed to create user profile',
          details: profileError.message
        });
      }

      res.json({
        success: true,
        message: 'User registered successfully',
        userId: authData.user.id
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred during registration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Supabase login endpoint
  console.log('Registering route: POST /api/auth/login');
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          error: 'Email and password are required' 
        });
      }

      // Sign in with Supabase
      const { data: { session, user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !session || !user) {
        console.error('Login error:', error);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid email or password',
          details: error?.message
        });
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User not found:', profileError);
        return res.status(401).json({ 
          success: false,
          error: 'User account not found. Please sign up first.'
        });
      }

      // Check user status
      if (userProfile.status === 'onhold') {
        return res.status(403).json({ 
          success: false,
          error: 'Account is pending approval. Please wait for admin approval.'
        });
      }

      if (userProfile.status === 'suspended') {
        return res.status(403).json({ 
          success: false,
          error: 'Account has been suspended. Please contact support.'
        });
      }

      if (userProfile.status === 'inactive') {
        return res.status(403).json({ 
          success: false,
          error: 'Account is inactive. Please contact support.'
        });
      }

      const userData = userProfile;

      // Set secure HTTP-only cookies
      res.cookie('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      });

      res.cookie('sb-refresh-token', session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth/refresh',
      });

      // Return user data and tokens
      res.json({
        success: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: {
          id: user.id,
          email: user.email || '',
          isAdmin: userData?.is_admin || false,
          firstName: userData?.first_name || user.email?.split('@')[0] || 'User',
          lastName: userData?.last_name || '',
        },
      });
      
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred during login',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get current user session
  app.get('/api/auth/session', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ 
          success: false,
          error: 'No authentication token provided' 
        });
      }

      console.log('Verifying token with Supabase...');
      
      // Verify the token with Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error('Token verification failed:', userError);
        return res.status(401).json({ 
          success: false,
          error: 'Invalid or expired authentication token',
          details: userError?.message
        });
      }

      console.log('Token verified, fetching user data for ID:', user.id);
      
      try {
        // Get additional user data from your database
        const { data: userData, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (dbError || !userData) {
          console.error('Database error:', dbError);
          return res.status(404).json({ 
            success: false,
            error: 'User profile not found',
            userId: user.id
          });
        }

        // Check user status - don't allow access for onhold, suspended, or inactive users
        if (userData.status === 'onhold') {
          return res.status(403).json({ 
            success: false,
            error: 'Account is pending approval. Please wait for admin approval.',
            status: 'onhold'
          });
        }

        if (userData.status === 'suspended') {
          return res.status(403).json({ 
            success: false,
            error: 'Account has been suspended. Please contact support.',
            status: 'suspended'
          });
        }

        if (userData.status === 'inactive') {
          return res.status(403).json({ 
            success: false,
            error: 'Account is inactive. Please contact support.',
            status: 'inactive'
          });
        }

        // Return consistent user object structure
        const userResponse = {
          id: userData.id,
          email: user.email || '',
          isAdmin: Boolean(userData.is_admin),
          firstName: userData.first_name || user.email?.split('@')[0] || 'User',
          lastName: userData.last_name || '',
          status: userData.status || 'active',
          credit: userData.credit ?? 0
        };

        console.log('Returning user data for:', userResponse.email);
        
        return res.json({ 
          success: true,
          user: userResponse
        });
        
      } catch (dbError) {
        console.error('Error fetching user data:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user data',
          details: dbError instanceof Error ? dbError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Session error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      // Clear the auth token from the client
      res.clearCookie('sb-access-token');
      res.clearCookie('sb-refresh-token');
      
      // Sign out from Supabase
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        // Sign out the current session
        const { error } = await supabase.auth.admin.signOut(token);
        if (error) {
          console.error('Supabase sign out error:', error);
        }
      }
      
      // Clear any session data
      if (req.session) {
        req.session.destroy((err: Error) => {
          if (err) {
            console.error('Session destroy error:', err);
          }
        });
      }
      
      res.status(200).json({ success: true });
    } catch (error: unknown) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: 'Logout failed', 
        details: errorMessage 
      });
    }
  });

  // Refresh token endpoint
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refresh_token } = req.body;
      
      if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      // Use the refresh token to get a new access token
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });

      if (error || !data.session) {
        console.error('Token refresh failed:', error);
        return res.status(401).json({ 
          error: error?.message || 'Failed to refresh session' 
        });
      }

      // Check if user exists in the session data
      if (!data.user) {
        console.error('No user in session data after token refresh');
        return res.status(401).json({ error: 'Invalid session data' });
      }

      // Get the user's profile from the database
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .single();

      if (userError || !userProfile) {
        console.error('User not found after token refresh:', userError);
        return res.status(404).json({ error: 'User not found' });
      }

      // Return the new tokens and user data
      res.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          isAdmin: userProfile.is_admin,
          status: userProfile.status,
          credit: userProfile.credit ?? 0
        }
      });
    } catch (error) {
      console.error('Error in refresh token endpoint:', error);
      res.status(500).json({ error: 'Internal server error during token refresh' });
    }
  });

  // User Management Endpoints

  // Get all users
  app.get('/api/users', async (_, res) => {
    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }

      // Expose credit field
      const usersWithCredit = users.map((u: any) => ({ ...u, credit: u.credit ?? 0 }));
      res.json(usersWithCredit);
    } catch (error) {
      console.error('Error in users endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create a new user (admin only)
  app.post('/api/users', async (req, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      // Verify admin access (same as above)
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !adminUser) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .from('users')
        .select('is_admin')
        .eq('auth_user_id', adminUser.id)
        .single();

      if (!adminCheck?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      let authUserId;
      if (!password) {
        // Use Supabase invite flow
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
        if (inviteError || !inviteData?.user) {
          return res.status(400).json({ error: inviteError?.message || 'Failed to invite user' });
        }
        authUserId = inviteData.user.id;
      } else {
        // Create auth user with password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
        if (signUpError || !authData.user) {
          return res.status(400).json({ error: signUpError?.message || 'Failed to create user' });
        }
        authUserId = authData.user.id;
      }

      // Create user profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          auth_user_id: authUserId,
          email,
          first_name: firstName,
          last_name: lastName,
          is_admin: role === 'admin',
          status: 'active',
        }])
        .select()
        .single();

      if (userError) return res.status(500).json({ error: userError.message || 'Failed to create user profile' });

      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Delete user (admin only)
  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Verify admin access (same as above)
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !adminUser) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get user to delete
      const { data: userToDelete, error: userError } = await supabase
        .from('users')
        .select('auth_user_id')
        .eq('id', id)
        .single();

      if (userError) throw userError;

      // First delete from auth
      if (userToDelete?.auth_user_id) {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
          userToDelete.auth_user_id
        );
        if (deleteAuthError) throw deleteAuthError;
      }

      // Then delete from users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Protected route middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      console.log('Auth token:', token);
      if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

      // Verify the token with Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      console.log('Supabase user:', user, 'Error:', userError);
      if (userError || !user) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      console.log('User profile:', userProfile, 'Error:', profileError);
      if (profileError || !userProfile) {
        return res.status(401).json({ error: 'User profile not found' });
      }

      // Attach user to request
      req.user = {
        id: userProfile.id,
        email: userProfile.email,
        isAdmin: userProfile.is_admin,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        status: userProfile.status
      };

    next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      console.log('Auth token:', token);
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Verify the token with Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      console.log('Supabase user:', user, 'Error:', userError);
      if (userError || !user) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
      }

      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();
      console.log('User profile:', userProfile, 'Error:', profileError);
      if (profileError || !userProfile) {
        return res.status(401).json({ error: 'User profile not found' });
      }

      if (!userProfile.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

      // Attach user to request
      req.user = {
        id: userProfile.id,
        email: userProfile.email,
        isAdmin: userProfile.is_admin,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        status: userProfile.status
      };

    next();
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return res.status(401).json({ error: 'Authentication failed' });
    }
  };

  // Helper function to handle async middleware
  const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Admin routes - User management
  console.log('Registering route: GET /api/users');
  app.get("/api/users", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Member management routes
  console.log('Registering route: GET /api/members');
  app.get("/api/members", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const members = await storage.getUsers();
      // Expose credit field
      const membersWithCredit = members.filter((user: any) => user.is_member).map((u: any) => ({ ...u, credit: u.credit ?? 0 }));
      res.json(membersWithCredit);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // Get detailed member information
  console.log('Registering route: GET /api/members/:id/details');
  app.get("/api/members/:id/details", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get member info
      const member = await storage.getUser(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's subscriptions with plan data
      const subscriptions = await storage.getSubscriptions();
      const plans = await storage.getPlans();
      const memberSubscriptions = subscriptions
        .filter((sub: any) => sub.user_id === id)
        .map((sub: any) => {
          const plan = plans.find((p: any) => p.id === sub.plan_id);
          return {
            ...sub,
            startDate: sub.start_date,
            endDate: sub.end_date,
            sessionsRemaining: sub.sessions_remaining,
            plan: plan ? {
              ...plan,
              sessionsIncluded: plan.sessionsIncluded,
              price: plan.price
            } : null
          };
        });

      // Get member's class registrations
      const registrations = await storage.getClassRegistrations(id);

      // Get member's check-ins
      const checkins = await storage.getUserCheckins(id);

      // Get member's payments
      const payments = await storage.getPaymentsByUser(id);

      // Expose credit field
      res.json({
        member: { ...member, credit: member.credit ?? 0 },
        subscriptions: memberSubscriptions,
        registrations,
        checkins,
        payments
      });
    } catch (error) {
      console.error("Error fetching member details:", error);
      res.status(500).json({ error: "Failed to fetch member details" });
    }
  });

  console.log('Registering route: POST /api/users');
  app.post("/api/users", requireAdmin, async (req: any, res) => {
    try {
      const userData = req.body;
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  console.log('Registering route: PUT /api/users/:id');
  app.put("/api/users/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, dateOfBirth, memberNotes, isAdmin, isMember, isTrainer, status } = req.body;
      
      // Map camelCase to snake_case for database
      const updates: any = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth;
      if (memberNotes !== undefined) updates.member_notes = memberNotes;
      if (isAdmin !== undefined) updates.is_admin = isAdmin;
      if (isMember !== undefined) updates.is_member = isMember;
      if (isTrainer !== undefined) updates.is_trainer = isTrainer;
      if (status !== undefined) updates.status = status;
      
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Trainers management
  console.log('Registering route: GET /api/trainers');
  app.get("/api/trainers", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const trainers = await storage.getTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ error: "Failed to fetch trainers" });
    }
  });

  console.log('Registering route: POST /api/trainers');
  app.post("/api/trainers", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { firstName, lastName, email, phone, bio, status } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: "First name, last name, and email are required" });
      }

      const trainerData = {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        bio: bio || undefined,
        status: status || 'active',
        specialties: undefined, // Will be handled as empty array in the database
      };

      const trainer = await storage.createTrainer(trainerData);
      res.json({ success: true, trainer });
    } catch (error) {
      console.error("Error creating trainer:", error);
      res.status(500).json({ error: "Failed to create trainer" });
    }
  });

  console.log('Registering route: PUT /api/trainers/:id');
  app.put("/api/trainers/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const trainer = await storage.updateTrainer(parseInt(id), updates);
      res.json({ success: true, trainer });
    } catch (error) {
      console.error("Error updating trainer:", error);
      res.status(500).json({ error: "Failed to update trainer" });
    }
  });

  console.log('Registering route: DELETE /api/trainers/:id');
  app.delete("/api/trainers/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTrainer(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting trainer:", error);
      res.status(500).json({ error: "Failed to delete trainer" });
    }
  });

  // Categories routes
  console.log('Registering route: GET /api/admin/categories');
  app.get("/api/admin/categories", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  console.log('Registering route: POST /api/admin/categories');
  app.post("/api/admin/categories", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      console.log("Received category creation request:", req.body);
      const { name, description, color, isActive } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Category name is required and must be a string" });
      }

      const categoryData = {
        name: name.trim(),
        description: description ? String(description).trim() : undefined,
        color: color ? String(color).trim() : undefined,
        is_active: isActive !== undefined ? Boolean(isActive) : true,
      };

      console.log("Creating category with:", categoryData);
      const category = await storage.createCategory(categoryData);
      console.log("Category created successfully:", category);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Failed to create category", details: error instanceof Error ? error.message : String(error) });
    }
  });

  console.log('Registering route: PATCH /api/admin/categories/:id');
  app.patch("/api/admin/categories/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      let updates = { ...req.body };
      if (typeof updates.isActive !== "undefined") {
        updates.is_active = updates.isActive;
        delete updates.isActive;
      }
      const category = await storage.updateCategory(id, updates);
      res.json({ success: true, category });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  console.log('Registering route: DELETE /api/admin/categories/:id');
  app.delete("/api/admin/categories/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Classes management
  console.log('Registering route: GET /api/admin/classes');
  app.get("/api/admin/classes", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  console.log('Registering route: POST /api/admin/classes');
  app.post("/api/admin/classes", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      console.log("Received class creation request:", req.body);
      const { name, description, categoryId, category_id, duration, durationMinutes, maxCapacity, max_capacity, equipment, isActive, is_active, difficulty } = req.body;

      const resolvedCategoryId = Number(category_id ?? categoryId);
      if (!resolvedCategoryId || isNaN(resolvedCategoryId)) {
        return res.status(400).json({ error: "Category ID is required and must be a valid number" });
      }

      const resolvedDuration = Number(duration ?? durationMinutes);
      const resolvedMaxCapacity = Number(max_capacity ?? maxCapacity);

      const classData = {
        name: name.trim(),
        description: description ? String(description).trim() : undefined,
        category_id: resolvedCategoryId,
        difficulty: difficulty || 'beginner',
        duration: resolvedDuration,
        max_capacity: resolvedMaxCapacity,
        equipment: equipment || null,
        is_active: is_active !== undefined ? Boolean(is_active) : (isActive !== undefined ? Boolean(isActive) : true),
      };

      console.log("Creating class with:", classData);
      const newClass = await storage.createClass(classData);
      console.log("Class created successfully:", newClass);
      res.json(newClass);
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ error: "Failed to create class", details: error instanceof Error ? error.message : String(error) });
    }
  });

  console.log('Registering route: PATCH /api/admin/classes/:id');
  app.patch("/api/admin/classes/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (typeof updates.className !== "undefined") {
        delete updates.className;
      }
      if (typeof updates.class_name !== "undefined") {
        delete updates.class_name;
      }
      const updatedClass = await storage.updateClass(parseInt(id), updates);
      res.json(updatedClass);
    } catch (error) {
      console.error("Error updating class:", error);
      res.status(500).json({ error: "Failed to update class" });
    }
  });

  console.log('Registering route: DELETE /api/admin/classes/:id');
  app.delete("/api/admin/classes/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClass(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting class:", error);
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // Plans management
  console.log('Registering route: GET /api/plans');
  app.get("/api/plans", asyncHandler(requireAuth), async (_req: any, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  console.log('Registering route: POST /api/plans');
  app.post("/api/plans", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const planData = req.body;
      const plan = await storage.createPlan(planData);
      res.json({ success: true, plan });
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  console.log('Registering route: PUT /api/plans/:id');
  app.put("/api/plans/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedPlan = await storage.updatePlan(parseInt(id), updates);
      res.json({ success: true, plan: updatedPlan });
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  // Schedules management
  console.log('Registering route: GET /api/schedules');
  app.get("/api/schedules", asyncHandler(requireAuth), async (_req: any, res) => {
    try {
      const schedules = await storage.getSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  console.log('Registering route: POST /api/schedules');
  app.post("/api/schedules", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    let createdSchedule: any = null;
    
    try {
      console.log("Received schedule creation request:", req.body);
      const { 
        classId, class_id,
        trainerId, trainer_id,
        dayOfWeek, day_of_week,
        startTime, start_time,
        endTime, end_time,
        repetitionType, repetition_type,
        scheduleDate, schedule_date,
        startDate, start_date,
        endDate, end_date,
        isActive, is_active,
        maxParticipants, max_participants
      } = req.body;

      const resolvedClassId = Number(class_id ?? classId);
      const resolvedTrainerId = Number(trainer_id ?? trainerId);
      const resolvedDayOfWeek = Number(day_of_week ?? dayOfWeek);
      const resolvedStartTime = start_time ?? startTime;
      const resolvedEndTime = end_time ?? endTime;
      const resolvedRepetitionType = repetition_type ?? repetitionType;
      const resolvedScheduleDate = schedule_date ?? scheduleDate;
      const resolvedStartDate = start_date ?? startDate;
      const resolvedEndDate = end_date ?? endDate;
      const resolvedIsActive = is_active !== undefined ? is_active : isActive;
      const resolvedMaxParticipants = Number(max_participants ?? maxParticipants ?? 10);

      if (
        !resolvedClassId ||
        !resolvedTrainerId ||
        resolvedDayOfWeek === undefined ||
        !resolvedStartTime ||
        !resolvedEndTime ||
        !resolvedRepetitionType ||
        !resolvedMaxParticipants
      ) {
        return res.status(400).json({ error: "Missing required schedule fields" });
      }

      // Only include day_of_week if repetition_type is not 'once'
      let scheduleData: any = {
        class_id: resolvedClassId,
        trainer_id: resolvedTrainerId,
        start_time: resolvedStartTime,
        end_time: resolvedEndTime,
        max_participants: resolvedMaxParticipants,
        repetition_type: resolvedRepetitionType,
        schedule_date: resolvedScheduleDate ? new Date(resolvedScheduleDate) : null,
        is_active: resolvedIsActive !== undefined ? Boolean(resolvedIsActive) : true,
      };
      if (resolvedRepetitionType !== 'once') {
        scheduleData.day_of_week = resolvedDayOfWeek;
      }
      // For 'once', require schedule_date
      if (resolvedRepetitionType === 'once' && !resolvedScheduleDate) {
        return res.status(400).json({ error: "schedule_date is required for one-time schedules" });
      }

      console.log("Creating schedule with:", scheduleData);
      createdSchedule = await storage.createSchedule(scheduleData);
      console.log("Schedule created successfully:", createdSchedule);

      // Automatically generate courses for the next 4 weeks
      const today = new Date();
      const fourWeeksFromNow = new Date(today);
      fourWeeksFromNow.setDate(today.getDate() + 28); // 4 weeks

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = fourWeeksFromNow.toISOString().split('T')[0];

      console.log(`Generating courses for schedule ${createdSchedule.id} from ${startDateStr} to ${endDateStr}`);
      const generatedCourses = await storage.generateCoursesFromSchedule(createdSchedule.id, startDateStr, endDateStr);
      console.log(`Generated ${generatedCourses.length} courses successfully`);

      res.json({
        ...createdSchedule,
        generatedCourses: generatedCourses.length,
        courseGenerationRange: { startDate: startDateStr, endDate: endDateStr }
      });
    } catch (error) {
      console.error("Error creating schedule:", error);
      
      // Rollback: Delete the created schedule if course generation failed
      if (createdSchedule) {
        try {
          console.log(`Rolling back: Deleting schedule ${createdSchedule.id} due to course generation failure`);
          await storage.deleteSchedule(createdSchedule.id);
          console.log("Schedule rollback completed");
        } catch (rollbackError) {
          console.error("Error during rollback:", rollbackError);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to create schedule", 
        details: error instanceof Error ? error.message : String(error),
        rollback: createdSchedule ? "Schedule was created but deleted due to course generation failure" : "No rollback needed"
      });
    }
  });

  console.log('Registering route: PUT /api/schedules/:id');
  app.put("/api/schedules/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    let originalSchedule: any = null;
    let updatedSchedule: any = null;
    
    try {
      const { id } = req.params;
      console.log("Received schedule update request for ID:", id, "with data:", req.body);
      
      // First, get the original schedule for potential rollback
      originalSchedule = await storage.getSchedule(parseInt(id));
      if (!originalSchedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const {
        classId, class_id,
        trainerId, trainer_id,
        dayOfWeek, day_of_week,
        startTime, start_time,
        endTime, end_time,
        repetitionType, repetition_type,
        scheduleDate, schedule_date,
        startDate, start_date,
        endDate, end_date,
        isActive, is_active,
        maxParticipants, max_participants
      } = req.body;

      const resolvedClassId = Number(class_id ?? classId);
      const resolvedTrainerId = Number(trainer_id ?? trainerId);
      const resolvedDayOfWeek = Number(day_of_week ?? dayOfWeek);
      const resolvedStartTime = start_time ?? startTime;
      const resolvedEndTime = end_time ?? endTime;
      const resolvedRepetitionType = repetition_type ?? repetitionType;
      const resolvedScheduleDate = schedule_date ?? scheduleDate;
      const resolvedStartDate = start_date ?? startDate;
      const resolvedEndDate = end_date ?? endDate;
      const resolvedIsActive = is_active !== undefined ? is_active : isActive;
      const resolvedMaxParticipants = Number(max_participants ?? maxParticipants ?? 10);

      if (
        !resolvedClassId ||
        !resolvedTrainerId ||
        resolvedDayOfWeek === undefined ||
        !resolvedStartTime ||
        !resolvedEndTime ||
        !resolvedRepetitionType ||
        !resolvedMaxParticipants
      ) {
        return res.status(400).json({ error: "Missing required schedule fields" });
      }

      // Only include day_of_week if repetition_type is not 'once'
      let scheduleData: any = {
        class_id: resolvedClassId,
        trainer_id: resolvedTrainerId,
        start_time: resolvedStartTime,
        end_time: resolvedEndTime,
        max_participants: resolvedMaxParticipants,
        repetition_type: resolvedRepetitionType,
        schedule_date: resolvedScheduleDate ? new Date(resolvedScheduleDate) : null,
        is_active: resolvedIsActive !== undefined ? Boolean(resolvedIsActive) : true,
      };
      if (resolvedRepetitionType !== 'once') {
        scheduleData.day_of_week = resolvedDayOfWeek;
      }
      // For 'once', require schedule_date
      if (resolvedRepetitionType === 'once' && !resolvedScheduleDate) {
        return res.status(400).json({ error: "schedule_date is required for one-time schedules" });
      }

      console.log("Updating schedule with:", scheduleData);
      updatedSchedule = await storage.updateSchedule(parseInt(id), scheduleData);
      console.log("Schedule updated successfully:", updatedSchedule);

      // Delete existing courses for this schedule and regenerate them
      const today = new Date();
      const fourWeeksFromNow = new Date(today);
      fourWeeksFromNow.setDate(today.getDate() + 28); // 4 weeks

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = fourWeeksFromNow.toISOString().split('T')[0];

      // Delete existing courses for this schedule
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('schedule_id', parseInt(id));

      if (deleteError) {
        console.error("Error deleting existing courses:", deleteError);
        throw new Error("Failed to delete existing courses");
      } else {
        console.log("Deleted existing courses for schedule");
      }

      // Regenerate courses
      console.log(`Regenerating courses for schedule ${id} from ${startDateStr} to ${endDateStr}`);
      const generatedCourses = await storage.generateCoursesFromSchedule(parseInt(id), startDateStr, endDateStr);
      console.log(`Generated ${generatedCourses.length} courses successfully`);

      res.json({
        ...updatedSchedule,
        generatedCourses: generatedCourses.length,
        courseGenerationRange: { startDate: startDateStr, endDate: endDateStr }
      });
    } catch (error) {
      console.error("Error updating schedule:", error);
      
      // Rollback: Restore original schedule if course regeneration failed
      if (originalSchedule && updatedSchedule) {
        try {
          console.log(`Rolling back: Restoring original schedule data for schedule ${originalSchedule.id}`);
          await storage.updateSchedule(parseInt(originalSchedule.id), {
            class_id: originalSchedule.class_id,
            trainer_id: originalSchedule.trainer_id,
            start_time: originalSchedule.start_time,
            end_time: originalSchedule.end_time,
            max_participants: originalSchedule.max_participants,
            repetition_type: originalSchedule.repetition_type,
            schedule_date: originalSchedule.schedule_date,
            day_of_week: originalSchedule.day_of_week,
            is_active: originalSchedule.is_active,
          });
          console.log("Schedule rollback completed");
        } catch (rollbackError) {
          console.error("Error during rollback:", rollbackError);
        }
      }
      
      res.status(500).json({ 
        error: "Failed to update schedule", 
        details: error instanceof Error ? error.message : String(error),
        rollback: originalSchedule ? "Schedule was updated but restored due to course generation failure" : "No rollback needed"
      });
    }
  });

  console.log('Registering route: DELETE /api/schedules/:id');
  app.delete("/api/schedules/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSchedule(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // Courses management (Individual class instances)
  console.log('Registering route: GET /api/courses');
  app.get("/api/courses", asyncHandler(requireAuth), async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
      const courses = await storage.getCourses(dateRange);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ error: "Failed to fetch courses" });
    }
  });

  console.log('Registering route: POST /api/courses');
  app.post("/api/courses", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      console.log("Received course creation request:", req.body);
      const {
        scheduleId, schedule_id,
        classId, class_id,
        trainerId, trainer_id,
        courseDate, course_date,
        startTime, start_time,
        endTime, end_time,
        maxParticipants, max_participants,
        currentParticipants, current_participants,
        status,
        isActive, is_active
      } = req.body;

      const resolvedScheduleId = Number(schedule_id ?? scheduleId);
      const resolvedClassId = Number(class_id ?? classId);
      const resolvedTrainerId = Number(trainer_id ?? trainerId);
      const resolvedCourseDate = course_date ?? courseDate;
      const resolvedStartTime = start_time ?? startTime;
      const resolvedEndTime = end_time ?? endTime;
      const resolvedMaxParticipants = Number(max_participants ?? maxParticipants ?? 10);
      const resolvedCurrentParticipants = Number(current_participants ?? currentParticipants ?? 0);
      const resolvedStatus = status || 'scheduled';
      const resolvedIsActive = is_active !== undefined ? is_active : isActive;

      if (
        !resolvedScheduleId ||
        !resolvedClassId ||
        !resolvedTrainerId ||
        !resolvedCourseDate ||
        !resolvedStartTime ||
        !resolvedEndTime ||
        !resolvedMaxParticipants
      ) {
        return res.status(400).json({ error: "Missing required course fields" });
      }

      const courseData = {
        scheduleId: resolvedScheduleId,
        classId: resolvedClassId,
        trainerId: resolvedTrainerId,
        courseDate: resolvedCourseDate,
        startTime: resolvedStartTime,
        endTime: resolvedEndTime,
        maxParticipants: resolvedMaxParticipants,
        currentParticipants: resolvedCurrentParticipants,
        status: resolvedStatus,
        isActive: resolvedIsActive !== undefined ? Boolean(resolvedIsActive) : true,
      };

      console.log("Creating course with:", courseData);
      const course = await storage.createCourse(courseData);
      console.log("Course created successfully:", course);
      res.json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ error: "Failed to create course", details: error instanceof Error ? error.message : String(error) });
    }
  });

  console.log('Registering route: PUT /api/courses/:id');
  app.put("/api/courses/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log("Received course update request for ID:", id, "with data:", req.body);
      
      const {
        scheduleId, schedule_id,
        classId, class_id,
        trainerId, trainer_id,
        courseDate, course_date,
        startTime, start_time,
        endTime, end_time,
        maxParticipants, max_participants,
        currentParticipants, current_participants,
        status,
        isActive, is_active
      } = req.body;

      const resolvedScheduleId = Number(schedule_id ?? scheduleId);
      const resolvedClassId = Number(class_id ?? classId);
      const resolvedTrainerId = Number(trainer_id ?? trainerId);
      const resolvedCourseDate = course_date ?? courseDate;
      const resolvedStartTime = start_time ?? startTime;
      const resolvedEndTime = end_time ?? endTime;
      const resolvedMaxParticipants = Number(max_participants ?? maxParticipants ?? 10);
      const resolvedCurrentParticipants = Number(current_participants ?? currentParticipants ?? 0);
      const resolvedStatus = status || 'scheduled';
      const resolvedIsActive = is_active !== undefined ? is_active : isActive;

      if (
        !resolvedScheduleId ||
        !resolvedClassId ||
        !resolvedTrainerId ||
        !resolvedCourseDate ||
        !resolvedStartTime ||
        !resolvedEndTime ||
        !resolvedMaxParticipants
      ) {
        return res.status(400).json({ error: "Missing required course fields" });
      }

      const courseData = {
        scheduleId: resolvedScheduleId,
        classId: resolvedClassId,
        trainerId: resolvedTrainerId,
        courseDate: resolvedCourseDate,
        startTime: resolvedStartTime,
        endTime: resolvedEndTime,
        maxParticipants: resolvedMaxParticipants,
        currentParticipants: resolvedCurrentParticipants,
        status: resolvedStatus,
        isActive: resolvedIsActive !== undefined ? Boolean(resolvedIsActive) : true,
      };

      console.log("Updating course with:", courseData);
      const updatedCourse = await storage.updateCourse(parseInt(id), courseData);
      console.log("Course updated successfully:", updatedCourse);
      res.json(updatedCourse);
    } catch (error) {
      console.error("Error updating course:", error);
      res.status(500).json({ error: "Failed to update course", details: error instanceof Error ? error.message : String(error) });
    }
  });

  console.log('Registering route: DELETE /api/courses/:id');
  app.delete("/api/courses/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCourse(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  console.log('Registering route: POST /api/schedules/:id/generate-courses');
  app.post("/api/schedules/:id/generate-courses", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }

      console.log(`Generating courses for schedule ${id} from ${startDate} to ${endDate}`);
      const courses = await storage.generateCoursesFromSchedule(parseInt(id), startDate, endDate);
      console.log(`Generated ${courses.length} courses successfully`);
      res.json({ success: true, courses, count: courses.length });
    } catch (error) {
      console.error("Error generating courses:", error);
      res.status(500).json({ error: "Failed to generate courses", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Subscriptions management
  console.log('Registering route: GET /api/subscriptions');
  app.get("/api/subscriptions", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  console.log('Registering route: POST /api/subscriptions');
  app.post("/api/subscriptions", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      console.log("Creating subscription with data:", req.body);
      let { userId, planId, startDate, endDate, status, notes } = req.body;

      // Validate required fields
      if (!userId || !planId) {
        return res.status(400).json({ error: "userId and planId are required" });
      }

      // Always fetch plan and set sessions_remaining to plan.max_sessions
      const plan = await storage.getPlan(parseInt(planId));
      if (!plan) {
        return res.status(400).json({ error: "Plan not found" });
      }
      const sessionsRemaining = plan.max_sessions || 0;

      // Accept startDate and endDate as 'YYYY-MM-DD 00:00:00' and convert to Date objects for DB
      const subscriptionData = {
        user_id: userId,
        plan_id: parseInt(planId),
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        sessions_remaining: parseInt(sessionsRemaining) || 0,
        status: (status || 'active'),
        notes: notes || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log("Processed subscription data:", subscriptionData);
      const subscription = await storage.createSubscription(subscriptionData);
      console.log("Subscription created successfully:", subscription);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "Failed to create subscription", details: error instanceof Error ? error.message : String(error) });
    }
  });

  console.log('Registering route: PUT /api/subscriptions/:id');
  app.put("/api/subscriptions/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId, planId, startDate, endDate, status, notes } = req.body;

      // Validate required fields
      if (!userId || !planId) {
        return res.status(400).json({ error: "userId and planId are required" });
      }

      // Always fetch plan and set sessions_remaining to plan.max_sessions
      const plan = await storage.getPlan(parseInt(planId));
      if (!plan) {
        return res.status(400).json({ error: "Plan not found" });
      }
      const sessionsRemaining = plan.max_sessions || 0;

      const updates = {
        user_id: userId,
        plan_id: parseInt(planId),
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        sessions_remaining: parseInt(sessionsRemaining) || 0,
        status: status,
        notes: notes || null,
        updated_at: new Date()
      };

      const subscription = await storage.updateSubscription(parseInt(id), updates);
      res.json(subscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  console.log('Registering route: DELETE /api/subscriptions/:id');
  app.delete("/api/subscriptions/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubscription(parseInt(id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting subscription:", error);
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });

  // Class registrations
  console.log('Registering route: GET /api/registrations');
  app.get("/api/registrations", asyncHandler(requireAuth), async (req: any, res) => {
    try {
              const userId = req.user?.isAdmin ? undefined : req.user?.id;
      if (userId) {
        const registrations = await storage.getClassRegistrations(userId);
        res.json(registrations);
      } else {
        res.status(400).json({ error: 'User ID is undefined' });
      }
    } catch (error) {
      console.error('Error retrieving registrations:', error);
      res.status(500).json({ error: 'Failed to retrieve registrations' });
    }
  });

  console.log('Registering route: POST /api/registrations');
  app.post("/api/registrations", asyncHandler(requireAuth), async (req: any, res) => {
    try {
      const { courseId } = req.body;
      const userId = req.user?.id;

      if (!courseId) {
        return res.status(400).json({ error: 'Course ID is required' });
      }

      if (!userId) {
        return res.status(400).json({ error: 'User ID is undefined' });
      }

      // Check if user has any active subscription with sessions remaining
      const activeSubscriptions = await storage.getUserActiveSubscriptions(userId);
      console.log('Active subscriptions found:', activeSubscriptions);
      
      // Also get all subscriptions to debug
      const allSubscriptions = await storage.getUserSubscriptions(userId);
      console.log('All subscriptions for user:', allSubscriptions);
      
      const totalSessionsRemaining = activeSubscriptions.reduce((sum: number, sub: any) => sum + (sub.sessions_remaining || 0), 0);
      console.log('Total sessions remaining:', totalSessionsRemaining);
      
      if (totalSessionsRemaining <= 0) {
        return res.status(400).json({ error: 'No active subscription with sessions remaining' });
      }

      // Check if course exists and has available spots
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      console.log('Course object from database:', JSON.stringify(course, null, 2));
      console.log('Course current_participants:', course.currentParticipants);
      console.log('Course max_participants:', course.maxParticipants);

      const currentParticipants = course.currentParticipants ?? 0;
      const maxParticipants = course.maxParticipants ?? 10;

      if (currentParticipants >= maxParticipants) {
        return res.status(400).json({ error: 'Course is full' });
      }

      // Check if user is already registered for this course (per-instance booking)
      const existingRegistrations = await storage.getClassRegistrations(userId);
      const isAlreadyRegistered = existingRegistrations.some((reg: any) => 
        reg.course_id === courseId && reg.status === 'registered'
      );
      if (isAlreadyRegistered) {
        return res.status(400).json({ error: 'Already registered for this course' });
      }

      // Find the subscription to deduct from (oldest with sessions remaining)
      let subscriptionToDeduct = null;
      for (const subscription of activeSubscriptions) {
        if (subscription.sessions_remaining > 0) {
          subscriptionToDeduct = subscription;
          break;
        }
      }

      if (!subscriptionToDeduct) {
        return res.status(400).json({ error: 'No active subscription with sessions remaining' });
      }

      console.log('Using subscription:', subscriptionToDeduct.id, 'with sessions remaining:', subscriptionToDeduct.sessions_remaining);

      // Use a simple approach with proper error handling
      try {
        // Create registration
        const registration = await storage.createClassRegistration({
          userId: userId,
          courseId: courseId,
          notes: undefined
        });

        // Update course participants count
        await storage.updateCourse(courseId, {
          currentParticipants: currentParticipants + 1
        });

        // Deduct session from subscription
        await storage.updateSubscription(subscriptionToDeduct.id, {
          sessionsRemaining: subscriptionToDeduct.sessions_remaining - 1
        });

        console.log(`Successfully registered for course ${courseId}, deducted session from subscription ${subscriptionToDeduct.id}`);

        res.json({ success: true, registration });
      } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Failed to create registration' });
      }
    } catch (error) {
      console.error('Error creating registration:', error);
      res.status(500).json({ error: 'Failed to create registration' });
    }
  });

  // Cancel registration endpoint
  console.log('Registering route: POST /api/registrations/:id/cancel');
  app.post("/api/registrations/:id/cancel", asyncHandler(requireAuth), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is undefined' });
      }

      // Get the registration
      const registrations = await storage.getClassRegistrations(userId);
      const registration = registrations.find((reg: any) => reg.id === parseInt(id));

      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      // Check if user owns this registration
      if (registration.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this registration' });
      }

      // Check if registration is already cancelled
      if (registration.status === 'cancelled') {
        return res.status(400).json({ error: 'Registration is already cancelled' });
      }

      // Get the course details
      const course = await storage.getCourse(registration.course_id);
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Check if class has already started
      const courseDateTime = new Date(`${course.courseDate}T${course.startTime}`);
      const now = new Date();
      
      if (now >= courseDateTime) {
        return res.status(400).json({ error: 'Cannot cancel registration for a class that has already started' });
      }

      // Calculate if within 24 hours
      const cutoffTime = new Date(courseDateTime.getTime() - (24 * 60 * 60 * 1000));
      const isWithin24Hours = now >= cutoffTime;

      console.log(`Cancelling registration ${id} for course ${course.id}`);
      console.log(`Course date/time: ${courseDateTime}`);
      console.log(`Cutoff time: ${cutoffTime}`);
      console.log(`Current time: ${now}`);
      console.log(`Within 24 hours: ${isWithin24Hours}`);

      // Use a simple approach with proper error handling
      try {
        // Update registration status to cancelled
        await storage.updateClassRegistration(parseInt(id), {
          status: 'cancelled'
        } as any);

        // Update course participants count
        // For within 24 hours: increase participants (spot becomes available, session forfeited)
        // For more than 24 hours: decrease participants (spot becomes available, session refunded)
        const participantChange = isWithin24Hours ? 1 : -1;
        await storage.updateCourse(course.id, {
          currentParticipants: course.currentParticipants + participantChange
        });

        let refundInfo = null;

        // Only refund session if more than 24 hours in advance
        if (!isWithin24Hours) {
          // Find the subscription that was used for this registration
          // We'll refund to the oldest active subscription with sessions remaining
          const activeSubscriptions = await storage.getUserActiveSubscriptions(userId);
          const subscriptionToRefund = activeSubscriptions.find((sub: any) => sub.sessions_remaining > 0);

          if (subscriptionToRefund) {
            await storage.updateSubscription(subscriptionToRefund.id, {
              sessionsRemaining: subscriptionToRefund.sessions_remaining + 1
            });
            refundInfo = {
              subscriptionId: subscriptionToRefund.id,
              sessionsRefunded: 1,
              newSessionsRemaining: subscriptionToRefund.sessions_remaining + 1
            };
          }
        }

        console.log(`Successfully cancelled registration ${id} for course ${course.id}`);
        console.log(`Within 24 hours: ${isWithin24Hours}, Session refunded: ${!isWithin24Hours}`);

        res.json({ 
          success: true, 
          registration: { ...registration, status: 'cancelled' },
          refundInfo,
          isWithin24Hours
        });
      } catch (error) {
        console.error('Error during cancellation:', error);
        res.status(500).json({ error: 'Failed to cancel registration' });
      }
    } catch (error) {
      console.error('Error cancelling registration:', error);
      res.status(500).json({ error: 'Failed to cancel registration' });
    }
  });

  // Check-ins
  console.log('Registering route: GET /api/checkins');
  app.get("/api/checkins", asyncHandler(requireAuth), async (req: any, res) => {
    try {
      const { date } = req.query;
      const checkins = await storage.getCheckins(date as string);
      res.json(checkins);
    } catch (error) {
      console.error("Error fetching checkins:", error);
      res.status(500).json({ error: "Failed to fetch checkins" });
    }
  });

  // Member specific routes
  console.log('Registering route: GET /api/member/subscription');
  app.get("/api/member/subscription", asyncHandler(requireAuth), async (req: any, res) => {
    try {
        const userId = req.user?.id;
      if (userId) {
        const subscription = await storage.getUserActiveSubscription(userId);
        res.json(subscription);
      } else {
        res.status(400).json({ error: 'User ID is undefined' });
      }
    } catch (error) {
      console.error("Error fetching member subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  console.log('Registering route: GET /api/member/subscriptions');
  app.get("/api/member/subscriptions", asyncHandler(requireAuth), async (req: any, res) => {
    try {
        const userId = req.user?.id;
      if (userId) {
        const subscriptions = await storage.getUserSubscriptions(userId);
        res.json(subscriptions);
      } else {
        res.status(400).json({ error: 'User ID is undefined' });
      }
    } catch (error) {
      console.error("Error fetching member subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  console.log('Registering route: GET /api/member/checkins');
  app.get("/api/member/checkins", asyncHandler(requireAuth), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (userId) {
        const checkins = await storage.getUserCheckins(userId);
        res.json(checkins);
      } else {
        res.status(400).json({ error: 'User ID is undefined' });
      }
    } catch (error) {
      console.error("Error fetching member checkins:", error);
      res.status(500).json({ error: "Failed to fetch checkins" });
    }
  });

  console.log('Registering route: GET /api/member/payments');
  app.get("/api/member/payments", asyncHandler(requireAuth), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (userId) {
        const payments = await storage.getPaymentsByUser(userId);
        res.json(payments);
      } else {
        res.status(400).json({ error: 'User ID is undefined' });
      }
    } catch (error) {
      console.error("Error fetching member payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Public classes endpoint for schedule creation
  console.log('Registering route: GET /api/classes');
  app.get("/api/classes", asyncHandler(requireAuth), async (_req: any, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  // Dashboard stats
  console.log('Registering route: GET /api/dashboard/stats');
  app.get("/api/dashboard/stats", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Payments routes
  console.log('Registering route: GET /api/payments');
  app.get("/api/payments", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (_req: any, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  console.log('Registering route: GET /api/payments/subscription/:id');
  app.get("/api/payments/subscription/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const payments = await storage.getPaymentsBySubscription(parseInt(id));
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments by subscription:", error);
      res.status(500).json({ error: "Failed to fetch payments by subscription" });
    }
  });

  console.log('Registering route: POST /api/payments');
  app.post("/api/payments", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      console.log("Incoming payment POST body:", req.body);
      const paymentData = req.body;
      // Use snake_case only
      const subscription_id = paymentData.subscription_id;
      const user_id = paymentData.user_id;
      const amount = paymentData.amount;
      const payment_type = paymentData.payment_type;
      if (!subscription_id || !user_id || !amount || amount <= 0) {
        return res.status(400).json({ error: "subscription_id, user_id, and positive amount are required" });
      }
      // If payment_type is 'credit', check and deduct credit
      if (payment_type === 'credit') {
        const user = await storage.getUser(user_id);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (typeof user.credit !== 'number' || user.credit < amount) {
          return res.status(400).json({ error: "Not enough credit to complete this payment" });
        }
        // Deduct credit
        await storage.updateUser(user_id, { credit: user.credit - amount });
      }
      // Fetch subscription and plan
      const subscription = await storage.getSubscription(subscription_id);
      if (!subscription) return res.status(404).json({ error: "Subscription not found" });
      const plan = await storage.getPlan(subscription.plan_id);
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      // Calculate total paid so far
      const payments = await storage.getPaymentsBySubscription(subscription_id);
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const planPrice = Number(plan.price);
      let appliedAmount = amount;
      let creditAmount = 0;
      if (totalPaid + amount > planPrice) {
        appliedAmount = Math.max(planPrice - totalPaid, 0);
        creditAmount = amount - appliedAmount;
      }
      // Create payment with appliedAmount (skip if appliedAmount is 0)
      let payment = null;
      if (appliedAmount > 0) {
        payment = await storage.createPayment({ ...paymentData, subscription_id, user_id, amount: appliedAmount });
        // If subscription is inactive, activate it after first payment
        if (subscription.status === 'inactive') {
          await storage.updateSubscription(subscription_id, { status: 'active' });
        }
        // Update subscription status if fully paid
        if (payment && payment.subscription_id) {
          await storage.updateSubscriptionStatusIfFullyPaid(payment.subscription_id);
        }
      }
      // If creditAmount > 0, update user's credit (add back the excess, even for credit payments)
      if (creditAmount > 0) {
        const user = await storage.getUser(user_id);
        if (user && typeof user.credit === 'number') {
          const newCredit = user.credit + creditAmount;
          await storage.updateUser(user_id, { credit: newCredit });
        }
      }
      res.json({ payment, creditAdded: creditAmount });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  console.log('Registering route: PUT /api/payments/:id');
  app.put("/api/payments/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      // Use snake_case only
      const subscription_id = updates.subscription_id;
      const payment = await storage.updatePayment(parseInt(id), { ...updates, subscription_id });
      // Update subscription status if fully paid
      if (payment.subscription_id) {
        await storage.updateSubscriptionStatusIfFullyPaid(payment.subscription_id);
      }
      res.json(payment);
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  console.log('Registering route: DELETE /api/payments/:id');
  app.delete("/api/payments/:id", asyncHandler(requireAuth), asyncHandler(requireAdmin), async (req: any, res) => {
    try {
      const { id } = req.params;
      // Fetch the payment first
      const payment = await storage.getPayment(parseInt(id));
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      // If payment type is 'credit', restore the credit to the user
      if (payment.paymentType === 'credit') {
        const user = await storage.getUser(payment.userId);
        if (user && typeof user.credit === 'number') {
          const newCredit = user.credit + Number(payment.amount);
          await storage.updateUser(payment.userId, { credit: newCredit });
        }
      }
      // Delete the payment
      await storage.deletePayment(parseInt(id));

      // After deletion, check if the subscription is still fully paid
      if (payment.subscriptionId) {
        // Get the subscription and plan
        const subscription = await storage.getSubscription(payment.subscriptionId);
        const plan = subscription ? await storage.getPlan(subscription.planId) : null;
        if (subscription && plan) {
          // Get all payments for this subscription
          const payments = await storage.getPaymentsBySubscription(payment.subscriptionId);
          const totalPaid = payments
            .filter((p: any) => p.paymentStatus === 'completed')
            .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0);
          const planPrice = parseFloat(plan.price);
          if (totalPaid < planPrice && subscription.status === 'active') {
            await storage.updateSubscription(payment.subscription_id, { status: 'pending' });
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  // All other API routes can be added here following the same pattern

  // Public categories endpoint
  console.log('Registering route: GET /api/categories');
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}