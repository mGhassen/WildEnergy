import { z } from "zod";

const UserStatus = ['active', 'pending', 'archived', 'suspended'] as const;

export const userBaseSchema = {
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date().optional(),
  isAdmin: z.boolean().default(false),
  isMember: z.boolean().default(true),
  status: z.enum(UserStatus).default('archived'),
  subscriptionStatus: z.string().default('inactive'),
  profileImageUrl: z.string().optional(),
  memberNotes: z.string().optional(),
  credit: z.number().optional(),
};

export const insertUserSchema = z.object({
  ...userBaseSchema,
  authUserId: z.string().optional(),
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
  duration_days: z.number().min(1, 'Duration must be at least 1 day'),
  max_sessions: z.number().min(1, 'Must allow at least 1 session'),
  is_active: z.boolean(),
});

export const insertClassSchema = z.object({
  name: z.string().min(1, 'Class name is required'),
  description: z.string().optional(),
  categoryId: z.number().min(1, 'Category is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  maxCapacity: z.number().min(1, 'Max capacity is required'),
  equipment: z.string().optional(),
  isActive: z.boolean(),
});

export const insertScheduleSchema = z.object({
  classId: z.number().min(1, 'Class is required'),
  trainerId: z.number().min(1, 'Trainer is required'),
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
  trainerId: z.number().min(1, 'Trainer is required'),
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
  startDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Must be YYYY-MM-DD'),
  sessionsRemaining: z.number().min(0).default(0),
  status: z.enum(['active', 'cancelled', 'pending', 'expired']),
  notes: z.string().optional(),
});

// Types for form usage
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTrainer = z.infer<typeof insertTrainerSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertClassRegistration = z.infer<typeof insertClassRegistrationSchema>;
export type InsertCheckin = z.infer<typeof insertCheckinSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>; 