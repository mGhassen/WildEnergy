import { pgTable, text, serial, integer, timestamp, boolean, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table (for authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("member"), // 'admin' or 'member'
  createdAt: timestamp("created_at").defaultNow(),
});

// Members table
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  joinDate: timestamp("join_date").defaultNow(),
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'suspended'
  hasUserAccess: boolean("has_user_access").default(false),
  generatedPassword: text("generated_password"),
});

// Trainers table
export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  specialties: text("specialties").array(),
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
  durationDays: integer("duration_days").notNull(), // e.g., 30 for monthly
  isActive: boolean("is_active").notNull().default(true),
});

// Classes table
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'yoga', 'hiit', 'strength', etc.
  duration: integer("duration").notNull(), // in minutes
  maxCapacity: integer("max_capacity").notNull(),
  isActive: boolean("is_active").notNull().default(true),
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
  memberId: integer("member_id").references(() => members.id).notNull(),
  planId: integer("plan_id").references(() => plans.id).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  sessionsRemaining: integer("sessions_remaining").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Class registrations table
export const classRegistrations = pgTable("class_registrations", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  scheduleId: integer("schedule_id").references(() => schedules.id).notNull(),
  registrationDate: timestamp("registration_date").notNull(),
  qrCode: text("qr_code").notNull(),
  status: text("status").notNull().default("registered"), // 'registered', 'checked_in', 'cancelled'
});

// Check-ins table
export const checkins = pgTable("checkins", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").references(() => members.id).notNull(),
  registrationId: integer("registration_id").references(() => classRegistrations.id).notNull(),
  checkinTime: timestamp("checkin_time").defaultNow(),
  sessionConsumed: boolean("session_consumed").notNull().default(true),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  subscriptions: many(subscriptions),
  registrations: many(classRegistrations),
  checkins: many(checkins),
}));

export const trainersRelations = relations(trainers, ({ many }) => ({
  schedules: many(schedules),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const classesRelations = relations(classes, ({ many }) => ({
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
  member: one(members, {
    fields: [subscriptions.memberId],
    references: [members.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
}));

export const classRegistrationsRelations = relations(classRegistrations, ({ one, many }) => ({
  member: one(members, {
    fields: [classRegistrations.memberId],
    references: [members.id],
  }),
  schedule: one(schedules, {
    fields: [classRegistrations.scheduleId],
    references: [schedules.id],
  }),
  checkins: many(checkins),
}));

export const checkinsRelations = relations(checkins, ({ one }) => ({
  member: one(members, {
    fields: [checkins.memberId],
    references: [members.id],
  }),
  registration: one(classRegistrations, {
    fields: [checkins.registrationId],
    references: [classRegistrations.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  joinDate: true,
});

export const insertTrainerSchema = createInsertSchema(trainers).omit({
  id: true,
  hireDate: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
});

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
}).extend({
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
}).extend({
  startDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date()
  ]),
  endDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date()
  ]),
});

export const insertClassRegistrationSchema = createInsertSchema(classRegistrations).omit({
  id: true,
});

export const insertCheckinSchema = createInsertSchema(checkins).omit({
  id: true,
  checkinTime: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;

export type Trainer = typeof trainers.$inferSelect;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;

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
