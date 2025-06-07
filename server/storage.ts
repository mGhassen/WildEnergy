import {
  users, members, trainers, plans, classes, schedules, subscriptions, classRegistrations, checkins,
  type User, type InsertUser, type Member, type InsertMember, type Trainer, type InsertTrainer,
  type Plan, type InsertPlan, type Class, type InsertClass, type Schedule, type InsertSchedule,
  type Subscription, type InsertSubscription, type ClassRegistration, type InsertClassRegistration,
  type Checkin, type InsertCheckin
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsersWithMembers(): Promise<any[]>;

  // Members
  getMembers(): Promise<Member[]>;
  getMember(id: number): Promise<Member | undefined>;
  getMemberByUserId(userId: number): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, updates: Partial<InsertMember>): Promise<Member>;
  deleteMember(id: number): Promise<void>;

  // Trainers
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: number): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainer(id: number, updates: Partial<InsertTrainer>): Promise<Trainer>;
  deleteTrainer(id: number): Promise<void>;

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
  getMemberActiveSubscription(memberId: number): Promise<any | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;

  // Class Registrations
  getClassRegistrations(memberId?: number): Promise<any[]>;
  createClassRegistration(registration: InsertClassRegistration): Promise<ClassRegistration>;
  updateClassRegistration(id: number, updates: Partial<InsertClassRegistration>): Promise<ClassRegistration>;
  getRegistrationByQRCode(qrCode: string): Promise<any | undefined>;

  // Check-ins
  getCheckins(date?: string): Promise<any[]>;
  getMemberCheckins(memberId: number): Promise<any[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;

  // Mark absent classes and deduct sessions
  markAbsentClasses(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Delete associated member first if exists
    const member = await this.getMemberByUserId(id);
    if (member) {
      await this.deleteMember(member.id);
    }
    
    // Delete user
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersWithMembers(): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
          phone: members.phone,
        },
      })
      .from(users)
      .leftJoin(members, eq(users.id, members.userId))
      .orderBy(desc(users.createdAt));
  }

  // Members
  async getMembers(): Promise<Member[]> {
    return await db.select().from(members).orderBy(asc(members.lastName));
  }

  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member || undefined;
  }

  async getMemberByUserId(userId: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.userId, userId));
    return member || undefined;
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(insertMember).returning();
    return member;
  }

  async updateMember(id: number, updates: Partial<InsertMember>): Promise<Member> {
    const [member] = await db.update(members).set(updates).where(eq(members.id, id)).returning();
    return member;
  }

  async deleteMember(id: number): Promise<void> {
    await db.delete(members).where(eq(members.id, id));
  }

  // Trainers
  async getTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers).orderBy(asc(trainers.lastName));
  }

  async getTrainer(id: number): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer || undefined;
  }

  async createTrainer(insertTrainer: InsertTrainer): Promise<Trainer> {
    const [trainer] = await db.insert(trainers).values(insertTrainer).returning();
    return trainer;
  }

  async updateTrainer(id: number, updates: Partial<InsertTrainer>): Promise<Trainer> {
    const [trainer] = await db.update(trainers).set(updates).where(eq(trainers.id, id)).returning();
    return trainer;
  }

  async deleteTrainer(id: number): Promise<void> {
    await db.delete(trainers).where(eq(trainers.id, id));
  }

  // Plans
  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.price));
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan || undefined;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db.insert(plans).values(insertPlan).returning();
    return plan;
  }

  async updatePlan(id: number, updates: Partial<InsertPlan>): Promise<Plan> {
    const [plan] = await db.update(plans).set(updates).where(eq(plans.id, id)).returning();
    return plan;
  }

  async deletePlan(id: number): Promise<void> {
    await db.update(plans).set({ isActive: false }).where(eq(plans.id, id));
  }

  // Classes
  async getClasses(): Promise<Class[]> {
    return await db.select().from(classes).where(eq(classes.isActive, true)).orderBy(asc(classes.name));
  }

  async getClass(id: number): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData || undefined;
  }

  async createClass(insertClass: InsertClass): Promise<Class> {
    const [classData] = await db.insert(classes).values(insertClass).returning();
    return classData;
  }

  async updateClass(id: number, updates: Partial<InsertClass>): Promise<Class> {
    const [classData] = await db.update(classes).set(updates).where(eq(classes.id, id)).returning();
    return classData;
  }

  async deleteClass(id: number): Promise<void> {
    await db.update(classes).set({ isActive: false }).where(eq(classes.id, id));
  }

  // Schedules
  async getSchedules(): Promise<any[]> {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    
    return await db
      .select({
        id: schedules.id,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        scheduleDate: schedules.scheduleDate,
        repetitionType: schedules.repetitionType,
        parentScheduleId: schedules.parentScheduleId,
        isActive: schedules.isActive,
        class: {
          id: classes.id,
          name: classes.name,
          category: classes.category,
          duration: classes.duration,
          maxCapacity: classes.maxCapacity,
        },
        trainer: {
          id: trainers.id,
          firstName: trainers.firstName,
          lastName: trainers.lastName,
        },
      })
      .from(schedules)
      .leftJoin(classes, eq(schedules.classId, classes.id))
      .leftJoin(trainers, eq(schedules.trainerId, trainers.id))
      .where(
        and(
          eq(schedules.isActive, true),
          sql`${schedules.scheduleDate} >= ${today}` // Only future classes
        )
      )
      .orderBy(asc(schedules.scheduleDate), asc(schedules.startTime));
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
    return schedule || undefined;
  }

  async createSchedule(scheduleData: any): Promise<Schedule> {
    const scheduleInstances = this.generateScheduleInstances(scheduleData);
    
    if (scheduleInstances.length === 0) {
      throw new Error("No valid schedule instances could be generated");
    }
    
    const createdSchedules = await db.insert(schedules).values(scheduleInstances).returning();
    return createdSchedules[0]; // Return the first instance as the main schedule
  }

  private generateScheduleInstances(scheduleData: any): any[] {
    const instances = [];
    const { repetitionType = 'once' } = scheduleData;
    
    switch (repetitionType) {
      case 'once': {
        // For 'once', use scheduleDate directly
        const scheduleDate = scheduleData.scheduleDate ? new Date(scheduleData.scheduleDate) : new Date();
        instances.push({
          classId: scheduleData.classId,
          trainerId: scheduleData.trainerId,
          dayOfWeek: scheduleDate.getDay(),
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          scheduleDate: scheduleDate,
          repetitionType: 'once',
          parentScheduleId: null,
          isActive: scheduleData.isActive !== false,
        });
        break;
      }
        
      case 'daily': {
        // For daily, create instances from startDate to endDate
        const startDate = new Date(scheduleData.startDate);
        const endDate = new Date(scheduleData.endDate);
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          instances.push({
            classId: scheduleData.classId,
            trainerId: scheduleData.trainerId,
            dayOfWeek: currentDate.getDay(),
            startTime: scheduleData.startTime,
            endTime: scheduleData.endTime,
            scheduleDate: new Date(currentDate),
            repetitionType: 'daily',
            parentScheduleId: null,
            isActive: scheduleData.isActive !== false,
          });
          currentDate.setDate(currentDate.getDate() + 1);
          
          // Prevent infinite loops
          if (instances.length > 365) break;
        }
        break;
      }
        
      case 'weekly': {
        // For weekly, create instances on the specified dayOfWeek from startDate to endDate
        const startDate = new Date(scheduleData.startDate);
        const endDate = new Date(scheduleData.endDate);
        const targetDay = scheduleData.dayOfWeek;
        
        // Find the first occurrence of the target day
        let currentDate = new Date(startDate);
        const daysUntilTarget = (targetDay - currentDate.getDay() + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysUntilTarget);
        
        while (currentDate <= endDate) {
          instances.push({
            classId: scheduleData.classId,
            trainerId: scheduleData.trainerId,
            dayOfWeek: targetDay,
            startTime: scheduleData.startTime,
            endTime: scheduleData.endTime,
            scheduleDate: new Date(currentDate),
            repetitionType: 'weekly',
            parentScheduleId: null,
            isActive: scheduleData.isActive !== false,
          });
          currentDate.setDate(currentDate.getDate() + 7);
          
          // Prevent infinite loops
          if (instances.length > 100) break;
        }
        break;
      }
        

    }
    
    return instances;
  }

  async updateSchedule(id: number, updates: Partial<InsertSchedule>): Promise<Schedule> {
    // For updates, only update the specific schedule instance, don't create new ones
    const updateData: any = {
      classId: updates.classId,
      trainerId: updates.trainerId,
      startTime: updates.startTime,
      endTime: updates.endTime,
      isActive: updates.isActive,
    };

    // Update schedule date if provided
    if (updates.scheduleDate) {
      updateData.scheduleDate = new Date(updates.scheduleDate);
      updateData.dayOfWeek = new Date(updates.scheduleDate).getDay();
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const [schedule] = await db.update(schedules).set(updateData).where(eq(schedules.id, id)).returning();
    return schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.update(schedules).set({ isActive: false }).where(eq(schedules.id, id));
  }

  // Subscriptions
  async getSubscriptions(): Promise<any[]> {
    return await db
      .select({
        id: subscriptions.id,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        sessionsRemaining: subscriptions.sessionsRemaining,
        isActive: subscriptions.isActive,
        createdAt: subscriptions.createdAt,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
        },
        plan: {
          id: plans.id,
          name: plans.name,
          price: plans.price,
          sessionsIncluded: plans.sessionsIncluded,
        },
      })
      .from(subscriptions)
      .leftJoin(members, eq(subscriptions.memberId, members.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .orderBy(desc(subscriptions.createdAt));
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async getMemberActiveSubscription(memberId: number): Promise<any | undefined> {
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        sessionsRemaining: subscriptions.sessionsRemaining,
        isActive: subscriptions.isActive,
        status: sql<string>`CASE 
          WHEN ${subscriptions.isActive} = true AND ${subscriptions.endDate} > NOW() THEN 'active'
          WHEN ${subscriptions.endDate} <= NOW() THEN 'expired'
          ELSE 'inactive'
        END`.as('status'),
        plan: {
          id: plans.id,
          name: plans.name,
          price: plans.price,
          sessionsIncluded: plans.sessionsIncluded,
        },
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(
        eq(subscriptions.memberId, memberId),
        eq(subscriptions.isActive, true)
      ))
      .orderBy(desc(subscriptions.endDate))
      .limit(1);
    
    return subscription || undefined;
  }

  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(insertSubscription).returning();
    return subscription;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const [subscription] = await db.update(subscriptions).set(updates).where(eq(subscriptions.id, id)).returning();
    return subscription;
  }

  // Class Registrations
  async getClassRegistrations(memberId?: number): Promise<any[]> {
    let query = db
      .select({
        id: classRegistrations.id,
        registrationDate: classRegistrations.registrationDate,
        qrCode: classRegistrations.qrCode,
        status: classRegistrations.status,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          email: members.email,
        },
        schedule: {
          id: schedules.id,
          dayOfWeek: schedules.dayOfWeek,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          scheduleDate: schedules.scheduleDate,
          repetitionType: schedules.repetitionType,
          parentScheduleId: schedules.parentScheduleId,
          isActive: schedules.isActive,
          class: {
            id: classes.id,
            name: classes.name,
            category: classes.category,
            duration: classes.duration,
            maxCapacity: classes.maxCapacity,
          },
          trainer: {
            id: trainers.id,
            firstName: trainers.firstName,
            lastName: trainers.lastName,
          },
        },
      })
      .from(classRegistrations)
      .leftJoin(members, eq(classRegistrations.memberId, members.id))
      .leftJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .leftJoin(classes, eq(schedules.classId, classes.id))
      .leftJoin(trainers, eq(schedules.trainerId, trainers.id));

    if (memberId) {
      query = query.where(eq(classRegistrations.memberId, memberId));
    }

    return await query.orderBy(desc(classRegistrations.registrationDate));
  }

  async createClassRegistration(insertRegistration: InsertClassRegistration): Promise<ClassRegistration> {
    const [registration] = await db.insert(classRegistrations).values(insertRegistration).returning();
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
    const [registration] = await db
      .select({
        id: classRegistrations.id,
        status: classRegistrations.status,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        },
        schedule: {
          id: schedules.id,
          dayOfWeek: schedules.dayOfWeek,
          startTime: schedules.startTime,
          endTime: schedules.endTime,
          scheduleDate: schedules.scheduleDate,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
      })
      .from(classRegistrations)
      .leftJoin(members, eq(classRegistrations.memberId, members.id))
      .leftJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .leftJoin(classes, eq(schedules.classId, classes.id))
      .where(eq(classRegistrations.qrCode, qrCode));

    return registration || undefined;
  }

  // Check-ins
  async getCheckins(date?: string): Promise<any[]> {
    let query = db
      .select({
        id: checkins.id,
        checkinTime: checkins.checkinTime,
        sessionConsumed: checkins.sessionConsumed,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
        },
        class: {
          id: classes.id,
          name: classes.name,
        },
      })
      .from(checkins)
      .leftJoin(classRegistrations, eq(checkins.registrationId, classRegistrations.id))
      .leftJoin(members, eq(checkins.memberId, members.id))
      .leftJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .leftJoin(classes, eq(schedules.classId, classes.id));

    if (date) {
      query = query.where(sql`DATE(${checkins.checkinTime}) = ${date}`);
    }

    return await query.orderBy(desc(checkins.checkinTime));
  }

  async getMemberCheckins(memberId: number): Promise<any[]> {
    const memberCheckins = await db
      .select({
        id: checkins.id,
        checkinTime: checkins.checkinTime,
        sessionConsumed: checkins.sessionConsumed,
        registration: {
          id: classRegistrations.id,
          registrationDate: classRegistrations.registrationDate,
          qrCode: classRegistrations.qrCode,
          status: classRegistrations.status,
          schedule: {
            id: schedules.id,
            dayOfWeek: schedules.dayOfWeek,
            startTime: schedules.startTime,
            endTime: schedules.endTime,
            scheduleDate: schedules.scheduleDate,
            class: {
              id: classes.id,
              name: classes.name,
              category: classes.category,
              duration: classes.duration,
            },
            trainer: {
              id: trainers.id,
              firstName: trainers.firstName,
              lastName: trainers.lastName,
            },
          },
        },
      })
      .from(checkins)
      .leftJoin(classRegistrations, eq(checkins.registrationId, classRegistrations.id))
      .leftJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .leftJoin(classes, eq(schedules.classId, classes.id))
      .leftJoin(trainers, eq(schedules.trainerId, trainers.id))
      .leftJoin(members, eq(classRegistrations.memberId, members.id))
      .where(eq(members.id, memberId))
      .orderBy(desc(checkins.checkinTime));

    return memberCheckins;
  }

  async createCheckin(insertCheckin: InsertCheckin): Promise<Checkin> {
    const [checkin] = await db.insert(checkins).values(insertCheckin).returning();
    return checkin;
  }

  // Dashboard stats
  async getDashboardStats(): Promise<any> {
    const [totalMembers] = await db.select({ count: sql<number>`count(*)` }).from(members);
    const [activeTrainers] = await db.select({ count: sql<number>`count(*)` }).from(trainers).where(eq(trainers.status, 'active'));
    const [activeSubscriptions] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(eq(subscriptions.isActive, true));
    
    const today = new Date().toISOString().split('T')[0];
    const [todayCheckins] = await db.select({ count: sql<number>`count(*)` }).from(checkins).where(sql`DATE(${checkins.checkinTime}) = ${today}`);

    return {
      totalMembers: totalMembers.count,
      activeTrainers: activeTrainers.count,
      activeSubscriptions: activeSubscriptions.count,
      todayCheckins: todayCheckins.count,
    };
  }

  async markAbsentClasses(): Promise<void> {
    const now = new Date();
    
    // Find all registered classes that have passed without a check-in
    const registrationsWithSchedules = await db
      .select({
        registrationId: classRegistrations.id,
        memberId: classRegistrations.memberId,
        scheduleDate: schedules.scheduleDate,
        startTime: schedules.startTime,
      })
      .from(classRegistrations)
      .leftJoin(schedules, eq(classRegistrations.scheduleId, schedules.id))
      .leftJoin(checkins, eq(checkins.registrationId, classRegistrations.id))
      .where(
        and(
          eq(classRegistrations.status, 'registered'),
          sql`${checkins.id} IS NULL` // No check-in exists
        )
      );

    for (const reg of registrationsWithSchedules) {
      if (!reg.scheduleDate || !reg.startTime) continue;
      
      // Calculate class end time
      const classDate = new Date(reg.scheduleDate);
      const [hours, minutes] = reg.startTime.split(':');
      classDate.setHours(parseInt(hours), parseInt(minutes));
      
      // If class ended, mark as absent
      if (now > classDate) {
        // Mark registration as absent
        await this.updateClassRegistration(reg.registrationId, { status: 'absent' });
        
        // Deduct session from member's active subscription
        const subscription = await this.getMemberActiveSubscription(reg.memberId);
        if (subscription && subscription.sessionsRemaining > 0) {
          await this.updateSubscription(subscription.id, {
            sessionsRemaining: subscription.sessionsRemaining - 1
          });
        }
      }
    }
  }
}

export const storage = new DatabaseStorage();
