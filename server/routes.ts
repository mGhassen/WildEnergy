import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertMemberSchema, insertTrainerSchema, insertPlanSchema, insertClassSchema, insertScheduleSchema, insertSubscriptionSchema, insertClassRegistrationSchema } from "@shared/schema";
import { z } from "zod";

declare module 'express-session' {
  interface Session {
    userId?: number;
    username?: string;
    role?: string;
  }
}

interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; role: string };
}

// Session middleware
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Helper function to mark absent registrations
async function markAbsentRegistrations(storage: any, registrations: any[]) {
  const now = new Date();
  
  for (const registration of registrations) {
    if (registration.status === 'registered') {
      // Create class end time
      const classDate = new Date(registration.schedule.scheduleDate);
      const [hours, minutes] = registration.schedule.startTime.split(':');
      classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Add class duration to get end time
      const classEndTime = new Date(classDate.getTime() + (registration.schedule.class.duration * 60 * 1000));
      
      // If class has ended and no check-in exists, mark as absent
      if (now > classEndTime) {
        const checkins = await storage.getMemberCheckins(registration.memberId);
        const hasCheckedIn = checkins.some((checkin: any) => 
          checkin.registrationId === registration.id
        );
        
        if (!hasCheckedIn) {
          // Mark as absent and don't refund session
          await storage.updateClassRegistration(registration.id, { status: 'absent' });
        }
      }
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // User management routes (Admin only)
  app.get("/api/users", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const users = await storage.getUsersWithMembers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { username, password, role, firstName, lastName, email, phone } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Check if email already exists for members
      if (role === "member" && email) {
        const members = await storage.getMembers();
        const existingMember = members.find(m => m.email === email);
        if (existingMember) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      // Create user account
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role,
      });

      // If role is member, create member profile automatically
      if (role === "member") {
        // Check if email already exists in members table
        if (email) {
          const existingMembers = await storage.getMembers();
          const emailExists = existingMembers.some(member => member.email === email);
          if (emailExists) {
            // Delete the created user since we can't create the member
            await storage.deleteUser(user.id);
            return res.status(400).json({ error: "Email already exists for another member" });
          }
        }

        await storage.createMember({
          userId: user.id,
          firstName: firstName || "",
          lastName: lastName || "",
          email: email || "",
          phone: phone || "",
        });
      }

      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.code === '23505') {
        if (error.constraint === 'members_email_unique') {
          return res.status(400).json({ error: "Email already exists" });
        }
        return res.status(400).json({ error: "Duplicate entry detected" });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, role, firstName, lastName, email, phone } = req.body;

      // Check if email already exists for other members
      if (role === "member" && email) {
        const members = await storage.getMembers();
        const existingMember = members.find(m => m.email === email && m.userId !== userId);
        if (existingMember) {
          return res.status(400).json({ error: "Email already exists" });
        }
      }

      // Update user account
      const user = await storage.updateUser(userId, { username, role });

      // Update or create member profile if role is member
      if (role === "member") {
        const existingMember = await storage.getMemberByUserId(userId);
        if (existingMember) {
          await storage.updateMember(existingMember.id, {
            firstName: firstName || "",
            lastName: lastName || "",
            email: email || "",
            phone: phone || "",
          });
        } else if (firstName || lastName || email) {
          await storage.createMember({
            userId,
            firstName: firstName || "",
            lastName: lastName || "",
            email: email || "",
            phone: phone || "",
          });
        }
      } else {
        // If changing from member to admin, optionally remove member profile
        const existingMember = await storage.getMemberByUserId(userId);
        if (existingMember) {
          // Keep member profile but note it's not linked to an active member role
        }
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error updating user:", error);
      if (error.code === '23505') {
        if (error.constraint === 'members_email_unique') {
          return res.status(400).json({ error: "Email already exists" });
        }
        return res.status(400).json({ error: "Duplicate entry detected" });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Check if trying to delete own account
      if (req.user?.id === userId) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      let profile = null;
      if (user.role === 'member') {
        profile = await storage.getMemberByUserId(user.id);
      }

      res.json({ 
        user: { id: user.id, username: user.username, role: user.role },
        profile
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: AuthenticatedRequest, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let profile = null;
      if (user.role === 'member') {
        profile = await storage.getMemberByUserId(user.id);
      }

      res.json({ 
        user: { id: user.id, username: user.username, role: user.role },
        profile
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  // Members routes
  app.get("/api/members", requireAdmin, async (req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Failed to get members" });
    }
  });

  app.get("/api/members/:id", requireAdmin, async (req, res) => {
    try {
      const member = await storage.getMember(parseInt(req.params.id));
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: "Failed to get member" });
    }
  });

  app.post("/api/members", requireAdmin, async (req, res) => {
    try {
      const memberData = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(memberData);
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid member data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create member" });
    }
  });

  app.put("/api/members/:id", requireAdmin, async (req, res) => {
    try {
      const memberData = insertMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(parseInt(req.params.id), memberData);
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid member data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update member" });
    }
  });

  app.delete("/api/members/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMember(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete member" });
    }
  });

  // Trainers routes
  app.get("/api/trainers", requireAdmin, async (req, res) => {
    try {
      const trainers = await storage.getTrainers();
      res.json(trainers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get trainers" });
    }
  });

  app.post("/api/trainers", requireAdmin, async (req, res) => {
    try {
      const trainerData = insertTrainerSchema.parse(req.body);
      const trainer = await storage.createTrainer(trainerData);
      res.json(trainer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trainer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create trainer" });
    }
  });

  app.put("/api/trainers/:id", requireAdmin, async (req, res) => {
    try {
      const trainerData = insertTrainerSchema.partial().parse(req.body);
      const trainer = await storage.updateTrainer(parseInt(req.params.id), trainerData);
      res.json(trainer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid trainer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update trainer" });
    }
  });

  app.delete("/api/trainers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteTrainer(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete trainer" });
    }
  });

  // Plans routes
  app.get("/api/plans", requireAuth, async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to get plans" });
    }
  });

  app.post("/api/plans", requireAdmin, async (req, res) => {
    try {
      const planData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(planData);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid plan data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.put("/api/plans/:id", requireAdmin, async (req, res) => {
    try {
      const planData = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(parseInt(req.params.id), planData);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid plan data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.delete("/api/plans/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deletePlan(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete plan" });
    }
  });

  // Classes routes
  app.get("/api/classes", requireAuth, async (req, res) => {
    try {
      const classes = await storage.getClasses();
      res.json(classes);
    } catch (error) {
      res.status(500).json({ error: "Failed to get classes" });
    }
  });

  app.post("/api/classes", requireAdmin, async (req, res) => {
    try {
      const classData = insertClassSchema.parse(req.body);
      const classObj = await storage.createClass(classData);
      res.json(classObj);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid class data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  app.put("/api/classes/:id", requireAdmin, async (req, res) => {
    try {
      const classData = insertClassSchema.partial().parse(req.body);
      const classObj = await storage.updateClass(parseInt(req.params.id), classData);
      res.json(classObj);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid class data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update class" });
    }
  });

  app.delete("/api/classes/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteClass(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // Schedules routes
  app.get("/api/schedules", requireAuth, async (req, res) => {
    try {
      const schedules = await storage.getSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to get schedules" });
    }
  });

  app.post("/api/schedules", requireAdmin, async (req, res) => {
    try {
      const schedule = await storage.createSchedule(req.body);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  app.put("/api/schedules/:id", requireAdmin, async (req, res) => {
    try {
      const schedule = await storage.updateSchedule(parseInt(req.params.id), req.body);
      res.json(schedule);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedules/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSchedule(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // Subscriptions routes
  app.get("/api/subscriptions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscriptions" });
    }
  });

  app.get("/api/member/subscription", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session?.role !== 'member') {
        return res.status(403).json({ error: "Member access required" });
      }
      
      const member = await storage.getMemberByUserId(req.session.userId!);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const subscription = await storage.getMemberActiveSubscription(member.id);
      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: "Failed to get member subscription" });
    }
  });

  app.get("/api/member/checkins", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session?.role !== 'member') {
        return res.status(403).json({ error: "Member access required" });
      }
      
      const member = await storage.getMemberByUserId(req.session.userId!);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const checkins = await storage.getMemberCheckins(member.id);
      res.json(checkins);
    } catch (error) {
      res.status(500).json({ error: "Failed to get member checkins" });
    }
  });

  app.post("/api/subscriptions", requireAdmin, async (req, res) => {
    try {
      const subscriptionData = insertSubscriptionSchema.parse(req.body);
      const subscription = await storage.createSubscription(subscriptionData);
      res.json(subscription);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid subscription data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Class registrations routes
  app.get("/api/registrations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      let memberId: number | undefined;
      
      // Get user from session
      const user = await storage.getUser(req.session!.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (user.role === 'member') {
        const member = await storage.getMemberByUserId(user.id);
        if (!member) {
          return res.status(404).json({ error: "Member not found" });
        }
        memberId = member.id;
      }

      const registrations = await storage.getClassRegistrations(memberId);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ error: "Failed to get registrations" });
    }
  });

  app.post("/api/registrations", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session?.role !== 'member') {
        return res.status(403).json({ error: "Member access required" });
      }

      const member = await storage.getMemberByUserId(req.session.userId!);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      // Check if member has active subscription with remaining sessions
      const subscription = await storage.getMemberActiveSubscription(member.id);
      if (!subscription || subscription.sessionsRemaining <= 0) {
        return res.status(400).json({ 
          error: "No sessions remaining", 
          message: "You have no remaining sessions. Please renew your subscription to book classes."
        });
      }

      const { scheduleId } = req.body;
      
      // Check if already registered for this schedule
      const existingRegistrations = await storage.getClassRegistrations(member.id);
      const alreadyRegistered = existingRegistrations.some((reg: any) => 
        reg.scheduleId === parseInt(scheduleId) && reg.status === 'registered'
      );
      
      if (alreadyRegistered) {
        return res.status(400).json({ 
          error: "Already registered", 
          message: "You are already registered for this class."
        });
      }

      const qrCode = `QR-${Date.now()}-${member.id}-${scheduleId}`;

      const registrationData = {
        memberId: member.id,
        scheduleId: parseInt(scheduleId),
        registrationDate: new Date(),
        qrCode,
        status: 'registered'
      };

      const registration = await storage.createClassRegistration(registrationData);
      
      // Deduct session from subscription
      await storage.updateSubscription(subscription.id, {
        sessionsRemaining: subscription.sessionsRemaining - 1
      });

      res.json(registration);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Failed to create registration" });
    }
  });

  app.post("/api/registrations/:id/cancel", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session?.role !== 'member') {
        return res.status(403).json({ error: "Member access required" });
      }

      const member = await storage.getMemberByUserId(req.session.userId!);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }

      const registrationId = parseInt(req.params.id);
      
      // Get the registration directly by ID and verify it belongs to the member
      const registrations = await storage.getClassRegistrations(member.id);
      const registration = registrations.find((reg: any) => reg.id === registrationId);
      
      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      // Check if class has already started
      const classDate = new Date(registration.schedule.scheduleDate);
      const [hours, minutes] = registration.schedule.startTime.split(':');
      classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const now = new Date();
      
      if (now >= classDate) {
        return res.status(400).json({ 
          error: "Cannot cancel after class has started" 
        });
      }

      // Check if within 24 hours for session refund policy
      const cutoffTime = new Date(classDate.getTime() - (24 * 60 * 60 * 1000));
      const within24Hours = now >= cutoffTime;

      // Update registration status to cancelled
      await storage.updateClassRegistration(registrationId, { status: 'cancelled' });
      
      // Refund session only if cancelled more than 24 hours before
      if (!within24Hours) {
        const subscription = await storage.getMemberActiveSubscription(member.id);
        if (subscription) {
          await storage.updateSubscription(subscription.id, {
            sessionsRemaining: subscription.sessionsRemaining + 1
          });
        }
      }

      const message = within24Hours 
        ? "Registration cancelled. Session forfeited due to 24-hour policy."
        : "Registration cancelled and session refunded";
      
      res.json({ success: true, message });
    } catch (error) {
      console.error('Cancellation error:', error);
      res.status(500).json({ error: "Failed to cancel registration" });
    }
  });

  // Check-ins routes
  app.get("/api/checkins", requireAdmin, async (req, res) => {
    try {
      const date = req.query.date as string;
      const checkins = await storage.getCheckins(date);
      res.json(checkins);
    } catch (error) {
      res.status(500).json({ error: "Failed to get checkins" });
    }
  });

  app.post("/api/checkins/qr", requireAdmin, async (req, res) => {
    try {
      const { qrCode } = req.body;
      
      const registration = await storage.getRegistrationByQRCode(qrCode);
      if (!registration) {
        return res.status(404).json({ 
          error: "Registration not found", 
          message: "This QR code is not valid or the registration may have been cancelled. Please check with the member or try scanning again.",
          suggestion: "Verify the QR code is correct or create a manual check-in"
        });
      }

      if (registration.status === 'checked_in') {
        return res.status(400).json({ 
          error: "Already checked in", 
          message: `${registration.member.firstName} ${registration.member.lastName} has already been checked in to this class.`,
          member: registration.member
        });
      }

      // Get member's active subscription
      const subscription = await storage.getMemberActiveSubscription(registration.member.id);
      if (!subscription || subscription.sessionsRemaining <= 0) {
        return res.status(400).json({ 
          error: "No sessions remaining", 
          message: `${registration.member.firstName} ${registration.member.lastName} has no remaining sessions. Please renew their subscription.`,
          member: registration.member,
          sessionsRemaining: subscription?.sessionsRemaining || 0
        });
      }

      // Create check-in
      const checkin = await storage.createCheckin({
        memberId: registration.member.id,
        registrationId: registration.id,
        sessionConsumed: true,
      });

      // Update subscription sessions
      await storage.updateSubscription(subscription.id, {
        sessionsRemaining: subscription.sessionsRemaining - 1,
      });

      res.json({
        checkin,
        member: registration.member,
        class: registration.class,
        sessionsRemaining: subscription.sessionsRemaining - 1,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process check-in" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
