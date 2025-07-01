import {
  users, trainers, categories, plans, classes, schedules, subscriptions, classRegistrations, checkins,
  type User, type InsertUser, type Trainer, type InsertTrainer, type Category, type InsertCategory,
  type Plan, type InsertPlan, type Class, type InsertClass, type Schedule, type InsertSchedule, 
  type Subscription, type InsertSubscription, type ClassRegistration, type InsertClassRegistration, 
  type Checkin, type InsertCheckin
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users - Updated for unified user management
  getUser(id: string): Promise<User | undefined>;
  getUserByAuthId(authUserId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  updateUserByEmail(email: string, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsers(): Promise<User[]>;

  // Trainers
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: number): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainer(id: number, updates: Partial<InsertTrainer>): Promise<Trainer>;
  deleteTrainer(id: number): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  // Plans
  getPlans(): Promise<Plan[]>;
  getPlan(id: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  updatePlan(id: number, updates: Partial<InsertPlan>): Promise<Plan>;
  deletePlan(id: number): Promise<void>;

  // Classes
  getClasses(): Promise<Class[]>;
  getClass(id: number): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, updates: Partial<InsertClass>): Promise<Class>;
  deleteClass(id: number): Promise<void>;

  // Schedules
  getSchedules(): Promise<any[]>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  createSchedule(schedule: any): Promise<Schedule>;
  updateSchedule(id: number, updates: any): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Subscriptions
  getSubscriptions(): Promise<any[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getUserActiveSubscription(userId: string): Promise<any | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;

  // Class Registrations
  getClassRegistrations(userId?: string): Promise<any[]>;
  createClassRegistration(registration: InsertClassRegistration): Promise<ClassRegistration>;
  updateClassRegistration(id: number, updates: Partial<InsertClassRegistration>): Promise<ClassRegistration>;
  getRegistrationByQRCode(qrCode: string): Promise<any | undefined>;

  // Check-ins
  getCheckins(date?: string): Promise<any[]>;
  getUserCheckins(userId: string): Promise<any[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;

  // Mark absent classes and deduct sessions
  markAbsentClasses(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByAuthId(authUserId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authUserId, authUserId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserByEmail(email: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async getTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers).orderBy(trainers.firstName);
  }

  async getTrainer(id: number): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer || undefined;
  }

  async createTrainer(insertTrainer: InsertTrainer): Promise<Trainer> {
    const [trainer] = await db
      .insert(trainers)
      .values(insertTrainer)
      .returning();
    return trainer;
  }

  async updateTrainer(id: number, updates: Partial<InsertTrainer>): Promise<Trainer> {
    const [trainer] = await db
      .update(trainers)
      .set(updates)
      .where(eq(trainers.id, id))
      .returning();
    return trainer;
  }

  async deleteTrainer(id: number): Promise<void> {
    await db.delete(trainers).where(eq(trainers.id, id));
  }

  async getCategories(): Promise<Category[]> {
    const result = await db.select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      color: categories.color,
      isActive: categories.isActive,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    }).from(categories).orderBy(categories.name);
    return result;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    console.log("Creating category with data:", insertCategory);
    const [category] = await db
      .insert(categories)
      .values({
        name: insertCategory.name,
        description: insertCategory.description || null,
        color: insertCategory.color || null,
        isActive: insertCategory.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return category;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(plans.name);
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan || undefined;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db
      .insert(plans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  async updatePlan(id: number, updates: Partial<InsertPlan>): Promise<Plan> {
    const [plan] = await db
      .update(plans)
      .set(updates)
      .where(eq(plans.id, id))
      .returning();
    return plan;
  }

  async deletePlan(id: number): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  async getClasses(): Promise<any[]> {
    return await db
      .select({
        id: classes.id,
        name: classes.name,
        description: classes.description,
        categoryId: classes.categoryId,
        duration: classes.duration,
        maxCapacity: classes.maxCapacity,
        equipment: classes.equipment,
        isActive: classes.isActive,
        createdAt: classes.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
          description: categories.description,
          color: categories.color,
        },
      })
      .from(classes)
      .leftJoin(categories, eq(classes.categoryId, categories.id))
      .orderBy(classes.name);
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData || undefined;
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    console.log("Creating class with data:", insertClass);
    const [classData] = await db
      .insert(classes)
      .values({
        name: insertClass.name,
        description: insertClass.description || null,
        categoryId: insertClass.categoryId,
        duration: insertClass.duration,
        maxCapacity: insertClass.maxCapacity,
        equipment: insertClass.equipment || null,
        isActive: insertClass.isActive ?? true,
        createdAt: new Date(),
      })
      .returning();
    return classData;
  }

  async updateClass(id: number, updates: Partial<InsertClass>): Promise<Class> {
    const [classData] = await db
      .update(classes)
      .set(updates)
      .where(eq(classes.id, id))
      .returning();
    return classData;
  }

  async deleteClass(id: number): Promise<void> {
    await db.delete(classes).where(eq(classes.id, id));
  }

  async getSchedules(): Promise<any[]> {
    const results = await db
      .select({
        id: schedules.id,
        classId: schedules.classId,
        trainerId: schedules.trainerId,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        scheduleDate: schedules.scheduleDate,
        repetitionType: schedules.repetitionType,
        parentScheduleId: schedules.parentScheduleId,
        isActive: schedules.isActive,

        className: classes.name,
        classDescription: classes.description,
        classDuration: classes.duration,
        classMaxCapacity: classes.maxCapacity,
        categoryId: classes.categoryId,
        categoryName: categories.name,
        trainerFirstName: trainers.firstName,
        trainerLastName: trainers.lastName,
        trainerEmail: trainers.email,
      })
      .from(schedules)
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .innerJoin(trainers, eq(schedules.trainerId, trainers.id))
      .leftJoin(categories, eq(classes.categoryId, categories.id))
      .where(eq(schedules.isActive, true))
      .orderBy(schedules.scheduleDate, schedules.startTime);

    // Transform the flat results into nested objects
    return results.map(row => ({
      id: row.id,
      classId: row.classId,
      trainerId: row.trainerId,
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
      scheduleDate: row.scheduleDate,
      repetitionType: row.repetitionType,
      parentScheduleId: row.parentScheduleId,
      isActive: row.isActive,

      class: {
        id: row.classId,
        name: row.className || 'Unknown Class',
        description: row.classDescription,
        duration: row.classDuration || 60,
        maxCapacity: row.classMaxCapacity || 10,
        categoryId: row.categoryId,
        category: row.categoryName || 'Unknown Category',
      },
      trainer: {
        id: row.trainerId,
        firstName: row.trainerFirstName || 'Unknown',
        lastName: row.trainerLastName || 'Trainer',
        email: row.trainerEmail,
      },
    }));
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
  }

  async createSchedule(scheduleData: any): Promise<Schedule> {
    console.log("Creating schedule with:", scheduleData);
    
    if (scheduleData.repetitionType === 'once') {
      // Single schedule - create one entry with the specific date
      const [schedule] = await db
        .insert(schedules)
        .values({
          classId: scheduleData.classId,
          trainerId: scheduleData.trainerId,
          dayOfWeek: scheduleData.dayOfWeek,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          scheduleDate: scheduleData.scheduleDate ? new Date(scheduleData.scheduleDate) : null,
          repetitionType: scheduleData.repetitionType,
          parentScheduleId: null,
          isActive: scheduleData.isActive ?? true,
        })
        .returning();
      
      console.log("Created single schedule:", schedule);
      return schedule;
    }
    
    // For repeating schedules, create multiple instances
    const instances = this.generateRepeatingSchedules(scheduleData);
    
    if (instances.length === 0) {
      throw new Error("No schedule instances generated");
    }
    
    // Create parent schedule
    const [parentSchedule] = await db
      .insert(schedules)
      .values({
        classId: scheduleData.classId,
        trainerId: scheduleData.trainerId,
        dayOfWeek: scheduleData.dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        scheduleDate: instances[0].scheduleDate,
        repetitionType: scheduleData.repetitionType,
        parentScheduleId: null,
        isActive: scheduleData.isActive ?? true,
      })
      .returning();
    
    // Create child instances
    if (instances.length > 1) {
      const childInstances = instances.slice(1).map(instance => ({
        classId: scheduleData.classId,
        trainerId: scheduleData.trainerId,
        dayOfWeek: scheduleData.dayOfWeek,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        scheduleDate: instance.scheduleDate,
        repetitionType: scheduleData.repetitionType,
        parentScheduleId: parentSchedule.id,
        isActive: scheduleData.isActive ?? true,
      }));
      
      await db.insert(schedules).values(childInstances);
    }
    
    console.log("Created repeating schedule with", instances.length, "instances");
    return parentSchedule;
  }

  private generateRepeatingSchedules(scheduleData: any): any[] {
    const instances = [];
    const startDate = new Date(scheduleData.startDate);
    const endDate = new Date(scheduleData.endDate);
    
    if (scheduleData.repetitionType === 'weekly') {
      // Find first occurrence of the specified day of week on or after start date
      const targetDayOfWeek = scheduleData.dayOfWeek;
      const current = new Date(startDate);
      
      // Adjust to the target day of week
      const daysToAdd = (targetDayOfWeek - current.getDay() + 7) % 7;
      current.setDate(current.getDate() + daysToAdd);
      
      // Generate weekly instances until end date
      while (current <= endDate) {
        instances.push({
          scheduleDate: new Date(current)
        });
        current.setDate(current.getDate() + 7); // Add 7 days for next week
      }
    } else if (scheduleData.repetitionType === 'daily') {
      // Generate daily instances from start to end date
      const current = new Date(startDate);
      
      while (current <= endDate) {
        instances.push({
          scheduleDate: new Date(current)
        });
        current.setDate(current.getDate() + 1); // Add 1 day
      }
    }
    
    return instances;
  }

  async updateSchedule(id: number, updates: Partial<InsertSchedule>): Promise<Schedule> {
    const [schedule] = await db
      .update(schedules)
      .set(updates)
      .where(eq(schedules.id, id))
      .returning();
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  async getSubscriptions(): Promise<any[]> {
    return await db
      .select({
        id: subscriptions.id,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        sessionsRemaining: subscriptions.sessionsRemaining,
        status: subscriptions.status,
        paymentStatus: subscriptions.paymentStatus,
        notes: subscriptions.notes,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        plan: {
          id: plans.id,
          name: plans.name,
          description: plans.description,
          price: plans.price,
          sessionsIncluded: plans.sessionsIncluded,
          durationDays: plans.durationDays,
        },
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .orderBy(desc(subscriptions.startDate));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async getUserActiveSubscription(userId: string): Promise<any | undefined> {
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        sessionsRemaining: subscriptions.sessionsRemaining,
        status: subscriptions.status,
        paymentStatus: subscriptions.paymentStatus,
        plan: {
          id: plans.id,
          name: plans.name,
          description: plans.description,
          price: plans.price,
          sessionsIncluded: plans.sessionsIncluded,
          durationDays: plans.durationDays,
        },
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.startDate))
      .limit(1);

    return subscription || undefined;
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values(insertSubscription)
      .returning();
    return subscription;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async getClassRegistrations(userId?: string): Promise<any[]> {
    const baseQuery = db
      .select()
      .from(classRegistrations)
      .innerJoin(users, eq(classRegistrations.userId, users.id))
      .innerJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .innerJoin(trainers, eq(schedules.trainerId, trainers.id));

    const query = userId 
      ? baseQuery.where(eq(classRegistrations.userId, userId))
      : baseQuery;

    const results = await query.orderBy(desc(classRegistrations.registrationDate));
    
    return results.map((row: any) => ({
      id: row.class_registrations.id,
      registrationDate: row.class_registrations.registrationDate,
      qrCode: row.class_registrations.qrCode,
      status: row.class_registrations.status,
      notes: row.class_registrations.notes,
      user: {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        email: row.users.email,
      },
      schedule: {
        id: row.schedules.id,
        dayOfWeek: row.schedules.dayOfWeek,
        startTime: row.schedules.startTime,
        endTime: row.schedules.endTime,
        scheduleDate: row.schedules.scheduleDate,
        class: {
          id: row.classes.id,
          name: row.classes.name,
          category: row.classes.category,
          duration: row.classes.duration,
          maxCapacity: row.classes.maxCapacity,
        },
        trainer: {
          id: row.trainers.id,
          firstName: row.trainers.firstName,
          lastName: row.trainers.lastName,
        },
      },
    }));
  }

  async createClassRegistration(insertRegistration: InsertClassRegistration): Promise<ClassRegistration> {
    const [registration] = await db
      .insert(classRegistrations)
      .values({
        ...insertRegistration,
        registrationDate: new Date(),
      })
      .returning();
    return registration;
  }

  async updateClassRegistration(id: number, updates: Partial<InsertClassRegistration>): Promise<ClassRegistration> {
    const [registration] = await db
      .update(classRegistrations)
      .set(updates)
      .where(eq(classRegistrations.id, id))
      .returning();
    return registration;
  }

  async getRegistrationByQRCode(qrCode: string): Promise<any | undefined> {
    const results = await db
      .select()
      .from(classRegistrations)
      .innerJoin(users, eq(classRegistrations.userId, users.id))
      .innerJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .innerJoin(trainers, eq(schedules.trainerId, trainers.id))
      .where(eq(classRegistrations.qrCode, qrCode))
      .limit(1);

    if (results.length === 0) return undefined;

    const row = results[0];
    return {
      id: row.class_registrations.id,
      registrationDate: row.class_registrations.registrationDate,
      qrCode: row.class_registrations.qrCode,
      status: row.class_registrations.status,
      notes: row.class_registrations.notes,
      user: {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
        email: row.users.email,
      },
      schedule: {
        id: row.schedules.id,
        dayOfWeek: row.schedules.dayOfWeek,
        startTime: row.schedules.startTime,
        endTime: row.schedules.endTime,
        scheduleDate: row.schedules.scheduleDate,
        class: {
          id: row.classes.id,
          name: row.classes.name,
          category: row.classes.category,
          duration: row.classes.duration,
          maxCapacity: row.classes.maxCapacity,
        },
        trainer: {
          id: row.trainers.id,
          firstName: row.trainers.firstName,
          lastName: row.trainers.lastName,
        },
      },
    };
  }

  async getCheckins(date?: string): Promise<any[]> {
    const baseQuery = db
      .select()
      .from(checkins)
      .innerJoin(users, eq(checkins.userId, users.id))
      .innerJoin(classRegistrations, eq(checkins.registrationId, classRegistrations.id))
      .innerJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .innerJoin(trainers, eq(schedules.trainerId, trainers.id));

    const query = date 
      ? baseQuery.where(sql`DATE(${checkins.checkinTime}) = ${date}`)
      : baseQuery;

    const results = await query.orderBy(desc(checkins.checkinTime));
    
    return results.map((row: any) => ({
      id: row.checkins.id,
      checkinTime: row.checkins.checkinTime,
      sessionConsumed: row.checkins.sessionConsumed,
      notes: row.checkins.notes,
      user: {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
      },
      registration: {
        id: row.class_registrations.id,
        qrCode: row.class_registrations.qrCode,
        status: row.class_registrations.status,
        schedule: {
          id: row.schedules.id,
          scheduleDate: row.schedules.scheduleDate,
          startTime: row.schedules.startTime,
          endTime: row.schedules.endTime,
          class: {
            id: row.classes.id,
            name: row.classes.name,
            category: row.classes.category,
          },
          trainer: {
            id: row.trainers.id,
            firstName: row.trainers.firstName,
            lastName: row.trainers.lastName,
          },
        },
      },
    }));
  }

  async getUserCheckins(userId: string): Promise<any[]> {
    const results = await db
      .select()
      .from(checkins)
      .innerJoin(users, eq(checkins.userId, users.id))
      .innerJoin(classRegistrations, eq(checkins.registrationId, classRegistrations.id))
      .innerJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .innerJoin(classes, eq(schedules.classId, classes.id))
      .innerJoin(trainers, eq(schedules.trainerId, trainers.id))
      .where(eq(checkins.userId, userId))
      .orderBy(desc(checkins.checkinTime));

    return results.map((row: any) => ({
      id: row.checkins.id,
      checkinTime: row.checkins.checkinTime,
      sessionConsumed: row.checkins.sessionConsumed,
      notes: row.checkins.notes,
      user: {
        id: row.users.id,
        firstName: row.users.firstName,
        lastName: row.users.lastName,
      },
      registration: {
        id: row.class_registrations.id,
        qrCode: row.class_registrations.qrCode,
        status: row.class_registrations.status,
        schedule: {
          id: row.schedules.id,
          scheduleDate: row.schedules.scheduleDate,
          startTime: row.schedules.startTime,
          endTime: row.schedules.endTime,
          class: {
            id: row.classes.id,
            name: row.classes.name,
            category: row.classes.category,
          },
          trainer: {
            id: row.trainers.id,
            firstName: row.trainers.firstName,
            lastName: row.trainers.lastName,
          },
        },
      },
    }));
  }

  async createCheckin(insertCheckin: InsertCheckin): Promise<Checkin> {
    const [checkin] = await db
      .insert(checkins)
      .values({
        ...insertCheckin,
        checkinTime: new Date(),
      })
      .returning();
    return checkin;
  }

  async getDashboardStats(): Promise<any> {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const activeUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.status, "active"));
    const totalClasses = await db.select({ count: sql<number>`count(*)` }).from(classes);
    const totalTrainers = await db.select({ count: sql<number>`count(*)` }).from(trainers);

    return {
      totalUsers: totalUsers[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      totalClasses: totalClasses[0]?.count || 0,
      totalTrainers: totalTrainers[0]?.count || 0,
    };
  }

  async markAbsentClasses(): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Find registrations for classes that ended more than 1 hour ago and haven't been checked in
    const absentRegistrations = await db
      .select({
        id: classRegistrations.id,
        userId: classRegistrations.userId,
      })
      .from(classRegistrations)
      .innerJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .leftJoin(checkins, eq(checkins.registrationId, classRegistrations.id))
      .where(
        and(
          sql`${schedules.scheduleDate} + INTERVAL '1 hour' * ${schedules.endTime}::time < ${oneHourAgo}`,
          eq(classRegistrations.status, "registered"),
          sql`${checkins.id} IS NULL`
        )
      );

    // Mark registrations as absent
    for (const registration of absentRegistrations) {
      await db
        .update(classRegistrations)
        .set({ status: "absent" })
        .where(eq(classRegistrations.id, registration.id));

      // Deduct session from user's active subscription
      const activeSubscription = await this.getUserActiveSubscription(registration.userId);
      if (activeSubscription && activeSubscription.sessionsRemaining > 0) {
        await db
          .update(subscriptions)
          .set({ 
            sessionsRemaining: activeSubscription.sessionsRemaining - 1 
          })
          .where(eq(subscriptions.id, activeSubscription.id));
      }
    }
  }
}

export const storage = new DatabaseStorage();