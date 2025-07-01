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

  // Supabase login endpoint
  console.log('Registering route: POST /api/auth/login');
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Authentication error:', authError);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user profile from your users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userError || !user) {
        console.error('User not found in database:', userError);
        return res.status(401).json({ error: 'User not found' });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return res.status(403).json({ 
          error: 'Account not active',
          status: user.status || 'inactive'
        });
      }

      // Return the session tokens and user data
      res.json({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isAdmin: user.is_admin,
          // Add other user fields as needed
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current user session
  app.get('/api/auth/session', async (req, res) => {
    try {
      // Get the auth token from the request headers
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'No authorization token' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify the token with Supabase
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      
      if (error || !authUser) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get user profile
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          isAdmin: user.is_admin,
          // Add other user fields as needed
        }
      });
    } catch (error) {
      console.error('Session error:', error);
      res.status(500).json({ error: 'Failed to verify session' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Logout
  console.log('Registering route: POST /api/auth/logout');
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            return res.status(500).json({ error: 'Logout failed' });
          }
          res.clearCookie('connect.sid');
          res.json({ success: true });
        });
      } else {
        res.json({ success: true });
      }
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Signup endpoint
  console.log('Registering route: POST /api/auth/signup');
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Create user in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: 'Failed to create user' });
      }

      // Create user in database with on-hold status
      const dbUser = await storage.createUser({
        authUserId: authData.user.id,
        email,
        firstName,
        lastName,
        status: 'onhold',
        isAdmin: false,
        isMember: true,
        subscriptionStatus: 'inactive', // Add default subscription status
      });

      res.json({ user: dbUser, message: 'Account created successfully. Please wait for admin approval.' });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  // Protected route middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!(req.session as CustomSession).user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    const user = (req.session as CustomSession).user;
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  };

  // Admin routes - User management
  console.log('Registering route: GET /api/users');
  app.get("/api/users", requireAuth, requireAdmin, async (req: any, res) => {
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
  app.get("/api/members", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const members = await storage.getUsers(); // Get all users, filter members in frontend
      res.json(members.filter((user: any) => user.isMember));
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  // Get detailed member information
  console.log('Registering route: GET /api/members/:id/details');
  app.get("/api/members/:id/details", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get member info
      const member = await storage.getUser(id);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Get member's subscriptions
      const subscriptions = await storage.getSubscriptions();
      const memberSubscriptions = subscriptions.filter((sub: any) => sub.userId === id);

      // Get member's class registrations
      const registrations = await storage.getClassRegistrations(id);

      // Get member's check-ins
      const checkins = await storage.getUserCheckins(id);

      res.json({
        member,
        subscriptions: memberSubscriptions,
        registrations,
        checkins
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
  app.put("/api/users/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  console.log('Registering route: DELETE /api/users/:id');
  app.delete("/api/users/:id", requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Trainers management
  console.log('Registering route: GET /api/trainers');
  app.get("/api/trainers", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const trainers = await storage.getTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ error: "Failed to fetch trainers" });
    }
  });

  console.log('Registering route: POST /api/trainers');
  app.post("/api/trainers", requireAuth, requireAdmin, async (req: any, res) => {
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
  app.put("/api/trainers/:id", requireAuth, requireAdmin, async (req: any, res) => {
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
  app.delete("/api/trainers/:id", requireAuth, requireAdmin, async (req: any, res) => {
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
  app.get("/api/admin/categories", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  console.log('Registering route: POST /api/admin/categories');
  app.post("/api/admin/categories", requireAuth, requireAdmin, async (req: any, res) => {
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
        isActive: isActive !== undefined ? Boolean(isActive) : true,
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
  app.patch("/api/admin/categories/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const category = await storage.updateCategory(id, updates);
      res.json({ success: true, category });
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  console.log('Registering route: DELETE /api/admin/categories/:id');
  app.delete("/api/admin/categories/:id", requireAuth, requireAdmin, async (req: any, res) => {
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
  app.get("/api/admin/classes", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: "Failed to fetch classes" });
    }
  });

  console.log('Registering route: POST /api/admin/classes');
  app.post("/api/admin/classes", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      console.log("Received class creation request:", req.body);
      const { name, description, categoryId, duration, maxCapacity, equipment, isActive } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "Class name is required and must be a string" });
      }

      if (!categoryId || isNaN(parseInt(categoryId))) {
        return res.status(400).json({ error: "Category ID is required and must be a valid number" });
      }

      const classData = {
        name: name.trim(),
        description: description ? String(description).trim() : undefined,
        categoryId: Number(categoryId),
        difficulty: 'beginner' as const, // Default to beginner if not specified
        durationMinutes: Number(duration),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
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
  app.patch("/api/admin/classes/:id", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedClass = await storage.updateClass(parseInt(id), updates);
      res.json(updatedClass);
    } catch (error) {
      console.error("Error updating class:", error);
      res.status(500).json({ error: "Failed to update class" });
    }
  });

  console.log('Registering route: DELETE /api/admin/classes/:id');
  app.delete("/api/admin/classes/:id", requireAuth, requireAdmin, async (req: any, res) => {
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
  app.get("/api/plans", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  console.log('Registering route: POST /api/plans');
  app.post("/api/plans", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const planData = req.body;
      const plan = await storage.createPlan(planData);
      res.json({ success: true, plan });
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  // Schedules management
  console.log('Registering route: GET /api/schedules');
  app.get("/api/schedules", requireAuth, async (req: any, res) => {
    try {
      const schedules = await storage.getSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  console.log('Registering route: POST /api/schedules');
  app.post("/api/schedules", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      console.log("Received schedule creation request:", req.body);
      const { classId, trainerId, dayOfWeek, startTime, endTime, repetitionType, scheduleDate, startDate, endDate, isActive } = req.body;

      if (!classId || !trainerId || dayOfWeek === undefined || !startTime || !endTime || !repetitionType) {
        return res.status(400).json({ error: "Missing required schedule fields" });
      }

      const scheduleData = {
        classId: parseInt(classId),
        trainerId: parseInt(trainerId),
        dayOfWeek: parseInt(dayOfWeek),
        startTime: String(startTime),
        endTime: String(endTime),
        repetitionType: String(repetitionType),
        scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      };

      console.log("Creating schedule with:", scheduleData);
      const schedule = await storage.createSchedule(scheduleData);
      console.log("Schedule created successfully:", schedule);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ error: "Failed to create schedule", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Subscriptions management
  console.log('Registering route: GET /api/subscriptions');
  app.get("/api/subscriptions", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  console.log('Registering route: POST /api/subscriptions');
  app.post("/api/subscriptions", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      console.log("Creating subscription with data:", req.body);
      const { userId, planId, startDate, endDate, sessionsRemaining, status, paymentStatus, notes } = req.body;

      // Validate required fields
      if (!userId || !planId) {
        return res.status(400).json({ error: "userId and planId are required" });
      }

      // Convert dates from ISO strings to Date objects
      const subscriptionData = {
        userId,
        planId: parseInt(planId),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        sessionsRemaining: parseInt(sessionsRemaining) || 0,
        status: (status || 'active') as 'active' | 'expired' | 'cancelled',
        paymentStatus: (paymentStatus || 'pending') as 'pending' | 'paid' | 'failed',
        paymentMethod: undefined,
        transactionId: undefined
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

  // Class registrations
  console.log('Registering route: GET /api/registrations');
  app.get("/api/registrations", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as CustomSession).user?.isAdmin ? undefined : (req.session as CustomSession).user?.id;
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

  // Check-ins
  console.log('Registering route: GET /api/checkins');
  app.get("/api/checkins", requireAuth, async (req: any, res) => {
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
  app.get("/api/member/subscription", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as CustomSession).user?.id;
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

  console.log('Registering route: GET /api/member/checkins');
  app.get("/api/member/checkins", requireAuth, async (req: any, res) => {
    try {
      const userId = (req.session as CustomSession).user?.id;
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

  // Public classes endpoint for schedule creation
  console.log('Registering route: GET /api/classes');
  app.get("/api/classes", requireAuth, async (req: any, res) => {
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
  app.get("/api/dashboard/stats", requireAuth, requireAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // All other API routes can be added here following the same pattern

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}