import { pgTable, text, serial, integer, timestamp, boolean, decimal, uuid, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table - unified user management with Supabase integration
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: text("auth_user_id").unique(), // Reference to Supabase auth.users
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  // Role and status management
  isAdmin: boolean("is_admin").notNull().default(false),
  isMember: boolean("is_member").notNull().default(true),
  status: text("status", { enum: ['active', 'inactive', 'suspended', 'onhold'] }).notNull().default("onhold"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  profileImageUrl: text("profile_image_url"),
  // Member-specific fields (only relevant when isMember = true)
  memberNotes: text("member_notes"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  color: text("color"), // hex color code for UI
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trainers table - matching actual database structure
export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  specialties: text("specialties").array(), // text array in database
  bio: text("bio"),
  hireDate: timestamp("hire_date").defaultNow(),
  status: text("status").notNull().default("active"),
});

// Plans table
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sessionsIncluded: integer("sessions_included").notNull(),
  durationDays: integer("duration_days").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  duration: integer("duration").notNull(), // in minutes
  maxCapacity: integer("max_capacity").notNull(),
  equipment: text("equipment"), // JSON string for required equipment
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedules table
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  trainerId: integer("trainer_id").references(() => trainers.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(),
  scheduleDate: timestamp("schedule_date").notNull(), // Specific date for this schedule instance
  repetitionType: text("repetition_type").notNull().default("weekly"), // 'once', 'daily', 'weekly', 'monthly'
  parentScheduleId: integer("parent_schedule_id"), // Reference to the original schedule for series
  isActive: boolean("is_active").notNull().default(true),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(), // Direct reference to users table
  planId: integer("plan_id").references(() => plans.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  sessionsRemaining: integer("sessions_remaining").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'expired', 'cancelled'
  paymentStatus: text("payment_status").notNull().default("pending"), // 'pending', 'paid', 'failed'
  notes: text("notes"),
});

// Class registrations table
export const classRegistrations = pgTable("class_registrations", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(), // Direct reference to users table
  scheduleId: integer("schedule_id").references(() => schedules.id).notNull(),
  registrationDate: timestamp("registration_date").defaultNow(),
  qrCode: text("qr_code").notNull().unique(),
  status: text("status").notNull().default("registered"), // 'registered', 'attended', 'cancelled', 'absent'
  notes: text("notes"),
});

// Check-ins table
export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(), // Direct reference to users table
  registrationId: integer("registration_id").references(() => classRegistrations.id).notNull(),
  checkinTime: timestamp("checkin_time").defaultNow(),
  sessionConsumed: boolean("session_consumed").notNull().default(true),
  notes: text("notes"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  registrations: many(classRegistrations),
  checkins: many(checkins),
}));

export const trainersRelations = relations(trainers, ({ many }) => ({
  schedules: many(schedules),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  classes: many(classes),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  category: one(categories, {
    fields: [classes.categoryId],
    references: [categories.id],
  }),
  schedules: many(schedules),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  class: one(classes, {
    fields: [schedules.classId],
    references: [classes.id],
  }),
  trainer: one(trainers, {
    fields: [schedules.trainerId],
    references: [trainers.id],
  }),
  registrations: many(classRegistrations),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

export const classRegistrationsRelations = relations(classRegistrations, ({ one, many }) => ({
  user: one(users, {
    fields: [classRegistrations.userId],
    references: [users.id],
  }),
  schedule: one(schedules, {
    fields: [classRegistrations.scheduleId],
    references: [schedules.id],
  }),
  checkins: many(checkins),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  user: one(users, {
    fields: [checkins.userId],
    references: [users.id],
  }),
  registration: one(classRegistrations, {
    fields: [checkins.registrationId],
    references: [classRegistrations.id],
  }),
}));

// Define status enums
const UserStatus = ['active', 'inactive', 'suspended', 'onhold'] as const;
type UserStatusType = typeof UserStatus[number];

// Base user schema
export const userBaseSchema = {
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date().optional(),
  isAdmin: z.boolean().default(false),
  isMember: z.boolean().default(true),
  status: z.enum(UserStatus).default('onhold'),
  subscriptionStatus: z.string().default('inactive'),
  profileImageUrl: z.string().optional(),
  memberNotes: z.string().optional(),
};

// Insert user schema
export const insertUserSchema = z.object({
  ...userBaseSchema,
  authUserId: z.string().optional(),
  // Explicitly include all fields that should be in the insert schema
  id: z.undefined(),
  createdAt: z.undefined(),
  updatedAt: z.undefined(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  bio: z.string().optional(),
  status: z.string().default('active')
});

export const insertCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().optional(),
  isActive: z.boolean().default(true)
});

export const insertPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  durationDays: z.number().min(1, 'Duration must be at least 1 day'),
  maxClasses: z.number().min(1, 'Must allow at least 1 class'),
  isActive: z.boolean().default(true)
});

export const insertClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  categoryId: z.number().min(1, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  isActive: z.boolean().default(true),
}).extend({
  categoryId: z.number().min(1, "Category is required"),
});

export const insertScheduleSchema = z.object({
  classId: z.number().min(1, "Class is required"),
  trainerId: z.number().min(1, "Trainer is required"),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  maxParticipants: z.number().min(1, "Must allow at least 1 participant"),
  isActive: z.boolean().default(true)
});

export const insertClassRegistrationSchema = z.object({
  userId: z.string().uuid(),
  scheduleId: z.number().min(1, "Schedule is required"),
  notes: z.string().optional()
});

export const insertCheckinSchema = z.object({
  userId: z.string().uuid(),
  registrationId: z.number().min(1, "Registration is required"),
  sessionConsumed: z.boolean().default(true),
  notes: z.string().optional()
});

export const insertSubscriptionSchema = z.object({
  userId: z.string().uuid(),
  planId: z.number().min(1, "Plan is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['active', 'expired', 'cancelled']).default('active'),
  paymentStatus: z.enum(['pending', 'paid', 'failed']).default('pending'),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional()
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Trainer = typeof trainers.$inferSelect;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type InsertClassRegistration = z.infer<typeof insertClassRegistrationSchema>;

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;