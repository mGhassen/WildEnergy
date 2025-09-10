import { pgTable, text, serial, integer, timestamp, boolean, decimal, uuid, numeric, time, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Accounts table - authentication and admin status
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey(), // Same as Supabase auth.users.id
  email: text("email").notNull().unique(),
  status: text("status", { enum: ['active', 'pending', 'archived', 'suspended'] }).notNull().default("pending"),
  isAdmin: boolean("is_admin").notNull().default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Profiles table - personal information
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  address: text("address"),
  profession: text("profession"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Members table - member-specific data
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  memberNotes: text("member_notes"),
  credit: numeric("credit").default("0"),
  status: text("status", { enum: ['active', 'inactive', 'suspended'] }).notNull().default("active"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trainers table - trainer-specific data
export const trainers = pgTable("trainers", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  specialization: text("specialization"),
  experienceYears: integer("experience_years").default(0),
  bio: text("bio"),
  certification: text("certification"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0"),
  status: text("status", { enum: ['active', 'inactive', 'suspended'] }).notNull().default("active"),
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
  durationDays: integer("duration_days").notNull(), // in days
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
  classId: integer("class_id").notNull().references(() => classes.id),
  trainerId: integer("trainer_id").notNull().references(() => trainers.id),
  dayOfWeek: integer("day_of_week"), // 0-6 (Sunday-Saturday), null for one-time
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  maxParticipants: integer("max_participants").notNull().default(10),
  repetitionType: text("repetition_type").notNull(), // 'weekly', 'biweekly', 'monthly', 'once'
  scheduleDate: date("schedule_date"), // For one-time schedules
  isActive: boolean("is_active").notNull().default(true),
  // parentScheduleId: integer("parent_schedule_id").references(() => schedules.id), // For recurring schedules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  classId: integer("class_id").notNull().references(() => classes.id),
  trainerId: integer("trainer_id").notNull().references(() => trainers.id),
  courseDate: date("course_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  maxParticipants: integer("max_participants").notNull().default(10),
  currentParticipants: integer("current_participants").notNull().default(0),
  status: text("status").notNull().default("scheduled").$type<"scheduled" | "in_progress" | "completed" | "cancelled">(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table - separate from subscriptions to allow multiple payments
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull().default("cash"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  paymentDate: date("payment_date"),
  dueDate: date("due_date"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions table - updated to remove payment fields
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  memberId: uuid("member_id").references(() => members.id).notNull(), // Direct reference to members table
  planId: integer("plan_id").references(() => plans.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'expired', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Class registrations table
export const classRegistrations = pgTable("class_registrations", {
  id: serial("id").primaryKey(),
  memberId: uuid("member_id").references(() => members.id).notNull(), // Direct reference to members table
  courseId: integer("course_id").references(() => courses.id).notNull(),
  registrationDate: timestamp("registration_date").defaultNow(),
  qrCode: text("qr_code").notNull().unique(),
  status: text("status").notNull().default("registered"), // 'registered', 'attended', 'cancelled', 'absent'
  notes: text("notes"),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
});

// Check-ins table
export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  memberId: uuid("member_id").references(() => members.id).notNull(), // Direct reference to members table
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

export const schedulesRelations = relations(schedules, ({ one }) => ({
  class: one(classes, {
    fields: [schedules.classId],
    references: [classes.id],
  }),
  trainer: one(trainers, {
    fields: [schedules.trainerId],
    references: [trainers.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  schedule: one(schedules, {
    fields: [courses.scheduleId],
    references: [schedules.id],
  }),
  class: one(classes, {
    fields: [courses.classId],
    references: [classes.id],
  }),
  trainer: one(trainers, {
    fields: [courses.trainerId],
    references: [trainers.id],
  }),
  registrations: many(classRegistrations),
}));

export const classRegistrationsRelations = relations(classRegistrations, ({ one, many }) => ({
  user: one(users, {
    fields: [classRegistrations.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [classRegistrations.courseId],
    references: [courses.id],
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
const UserStatus = ['active', 'pending', 'archived', 'suspended'] as const;
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
  status: z.enum(UserStatus).default('pending'),
  subscriptionStatus: z.string().default('inactive'),
  profileImageUrl: z.string().optional(),
  memberNotes: z.string().optional(),
  // Add credit field for InsertUser
  credit: z.number().optional(),
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
  maxSessions: z.number().min(1, 'Must allow at least 1 session'),
  isActive: z.boolean().default(true)
});

export const insertClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  categoryId: z.number().min(1, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  maxCapacity: z.number().min(1, 'Max capacity is required'),
  equipment: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertScheduleSchema = z.object({
  classId: z.number().min(1, 'Class is required'),
  trainerId: z.string().min(1, 'Trainer is required'), // Changed to string for UUID
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  maxParticipants: z.number().min(1, 'Max participants must be at least 1'),
  repetitionType: z.enum(['weekly', 'biweekly', 'monthly', 'once']),
  scheduleDate: z.string().optional(),
  isActive: z.boolean().default(true),
  parentScheduleId: z.number().optional(),
});

export const insertCourseSchema = z.object({
  scheduleId: z.number().min(1, 'Schedule is required'),
  classId: z.number().min(1, 'Class is required'),
  trainerId: z.string().min(1, 'Trainer is required'), // Changed to string for UUID
  courseDate: z.string().min(1, 'Course date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  maxParticipants: z.number().min(1, 'Max participants must be at least 1'),
  currentParticipants: z.number().min(0).default(0),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  isActive: z.boolean().default(true),
});

export const insertClassRegistrationSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.number().min(1, "Course is required"),
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
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  sessionsRemaining: z.number().min(0).default(0),
  status: z.enum(['active', 'expired', 'cancelled']).default('active'),
  notes: z.string().optional(),
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

export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type ClassRegistration = typeof classRegistrations.$inferSelect;
export type InsertClassRegistration = z.infer<typeof insertClassRegistrationSchema>;

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;

// Enhanced Checkin type with related data for frontend use
export interface EnhancedCheckin extends Checkin {
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  registration?: {
    id: number;
    course?: {
      id: number;
      courseDate: string;
      startTime: string;
      endTime: string;
      scheduleId: number;
      classId: number;
      trainerId: number;
      schedule?: {
        id: number;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
      };
      class?: {
        id: number;
        name: string;
        category: string;
      };
      trainer?: {
        id: number;
        firstName: string;
        lastName: string;
      };
    };
  };
}

// Payment schemas
export const insertPaymentSchema = createInsertSchema(payments, {
  paymentType: z.enum(['cash', 'card', 'bank_transfer', 'check', 'other']),
  paymentStatus: z.enum(['pending', 'completed', 'failed', 'refunded', 'cancelled']),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;