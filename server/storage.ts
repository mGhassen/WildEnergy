import type {
  User, InsertUser, Trainer, InsertTrainer, Category, InsertCategory,
  Plan, InsertPlan, Class, InsertClass, Schedule, InsertSchedule, 
  Course, InsertCourse, Subscription, InsertSubscription, ClassRegistration, InsertClassRegistration, 
  Checkin, InsertCheckin, Payment, InsertPayment
} from "@shared/schema";
import { supabase } from "./supabase";

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
  updateTrainer(id: number, updates: Partial<InsertTrainer & {
    experience_years?: number;
    certification?: string;
    specialties?: string | string[];
  }>): Promise<Trainer>;
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
  getSchedules(): Promise<Schedule[]>;
  getSchedule(id: number): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, updates: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Courses (Individual class instances)
  getCourses(dateRange?: { startDate: string; endDate: string }): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: number): Promise<void>;
  generateCoursesFromSchedule(scheduleId: number, startDate: string, endDate: string): Promise<Course[]>;

  // Subscriptions
  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getUserActiveSubscription(userId: string): Promise<Subscription | undefined>;
  getUserOldestActiveSubscription(userId: string): Promise<Subscription | undefined>;
  getUserActiveSubscriptions(userId: string): Promise<Subscription[]>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;
  deleteSubscription(id: number): Promise<void>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsBySubscription(subscriptionId: number): Promise<Payment[]>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, updates: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: number): Promise<void>;

  // Class Registrations
  getClassRegistrations(userId?: string): Promise<ClassRegistration[]>;
  createClassRegistration(registration: InsertClassRegistration): Promise<ClassRegistration>;
  updateClassRegistration(id: number, updates: Partial<InsertClassRegistration>): Promise<ClassRegistration>;
  getRegistrationByQRCode(qrCode: string): Promise<ClassRegistration | undefined>;

  // Check-ins
  getCheckins(date?: string): Promise<Checkin[]>;
  getUserCheckins(userId: string): Promise<Checkin[]>;
  createCheckin(checkin: InsertCheckin): Promise<Checkin>;

  // Dashboard stats
  getDashboardStats(): Promise<any>;

  // Mark absent classes and deduct sessions
  markAbsentClasses(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
    
    return user as User;
  }

  async getUserByAuthId(authUserId: string): Promise<User | undefined> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();
      
    if (error) {
      console.error('Error fetching user by auth ID:', error);
      return undefined;
    }
    
    return user as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Map the insert data to match the actual database column names
    const userData = {
      auth_user_id: insertUser.authUserId,
      email: insertUser.email,
      first_name: insertUser.firstName,
      last_name: insertUser.lastName,
      is_admin: insertUser.isAdmin,
      is_member: insertUser.isMember,
      // status, subscriptionStatus, credit are all valid
      status: insertUser.status || 'onhold',
      subscription_status: insertUser.subscriptionStatus || 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(insertUser.credit !== undefined ? { credit: insertUser.credit } : {}),
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
      
    if (error) {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create user');
    }
    
    return user as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
    
    return user as User | undefined;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    // Convert camelCase to snake_case and filter out invalid values
    const dbUpdates: any = {};
    
    if (updates.email !== undefined && updates.email !== '') dbUpdates.email = updates.email;
    if (updates.firstName !== undefined && updates.firstName !== '') dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined && updates.lastName !== '') dbUpdates.last_name = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.dateOfBirth !== undefined && updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
    if (updates.isMember !== undefined) dbUpdates.is_member = updates.isMember;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.subscriptionStatus !== undefined && updates.subscriptionStatus !== '') dbUpdates.subscription_status = updates.subscriptionStatus;
    if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;
    if (updates.memberNotes !== undefined) dbUpdates.member_notes = updates.memberNotes;
    if (updates.credit !== undefined) dbUpdates.credit = updates.credit;
    
    dbUpdates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message || 'Failed to update user');
    }
    
    return user as User;
  }

  async updateUserByEmail(email: string, updates: Partial<InsertUser>): Promise<User> {
    // Convert camelCase to snake_case and filter out invalid values
    const dbUpdates: any = {};
    
    if (updates.email !== undefined && updates.email !== '') dbUpdates.email = updates.email;
    if (updates.firstName !== undefined && updates.firstName !== '') dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined && updates.lastName !== '') dbUpdates.last_name = updates.lastName;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.dateOfBirth !== undefined && updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
    if (updates.isMember !== undefined) dbUpdates.is_member = updates.isMember;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.subscriptionStatus !== undefined && updates.subscriptionStatus !== '') dbUpdates.subscription_status = updates.subscriptionStatus;
    if (updates.profileImageUrl !== undefined) dbUpdates.profile_image_url = updates.profileImageUrl;
    if (updates.memberNotes !== undefined) dbUpdates.member_notes = updates.memberNotes;
    if (updates.credit !== undefined) dbUpdates.credit = updates.credit;
    
    dbUpdates.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('email', email)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating user by email:', error);
      throw new Error(error.message || 'Failed to update user by email');
    }
    
    return user as User;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  async getUsers(): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('members_with_subscription_status')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    return users as User[];
  }

  async getTrainers(): Promise<Trainer[]> {
    const { data: trainers, error } = await supabase
      .from('trainers')
      .select(`
        *,
        user:user_id (id, first_name, last_name, email, phone)
      `)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching trainers:', error);
      throw new Error(error.message || 'Failed to fetch trainers');
    }
    
    // Map the response to match the Trainer type
    return (trainers || []).map(trainer => ({
      ...trainer,
      userId: trainer.user_id,
      status: trainer.status,
      user: trainer.user ? {
        id: trainer.user.id,
        firstName: trainer.user.first_name,
        lastName: trainer.user.last_name,
        email: trainer.user.email,
        phone: trainer.user.phone
      } : null
    })) as Trainer[];
  }

  async getTrainer(id: number): Promise<Trainer | undefined> {
    const { data: trainer, error } = await supabase
      .from('trainers')
      .select(`
        *,
        user:user_id (id, first_name, last_name, email, phone)
      `)
      .eq('id', id)
      .maybeSingle();
      
    if (error || !trainer) {
      console.error('Error fetching trainer:', error);
      return undefined;
    }
    
    // Map the response to match the Trainer type
    return {
      ...trainer,
      userId: trainer.user_id,
      status: trainer.status,
      user: trainer.user ? {
        id: trainer.user.id,
        firstName: trainer.user.first_name,
        lastName: trainer.user.last_name,
        email: trainer.user.email,
        phone: trainer.user.phone
      } : null
    } as Trainer;
  }

  async createTrainer(insertTrainer: InsertTrainer): Promise<Trainer> {
    // First create the auth user
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    const { data: authUser, error: userError } = await supabase.auth.admin.createUser({
      email: insertTrainer.email,
      password: password,
      user_metadata: {
        first_name: insertTrainer.firstName,
        last_name: insertTrainer.lastName,
        phone: insertTrainer.phone,
        is_trainer: true
      },
      email_confirm: true
    });

    if (userError || !authUser.user) {
      console.error('Error creating trainer user:', userError);
      throw new Error(userError?.message || 'Failed to create trainer user');
    }

    // Create a user record in the users table
    const { data: user, error: userCreateError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email: insertTrainer.email,
        first_name: insertTrainer.firstName,
        last_name: insertTrainer.lastName,
        phone: insertTrainer.phone,
        is_member: false,
        is_trainer: true,
        status: 'active',
        subscription_status: 'inactive'
      })
      .select('*')
      .single();

    if (userCreateError || !user) {
      await supabase.auth.admin.deleteUser(authUser.user.id).catch(console.error);
      console.error('Error creating user record:', userCreateError);
      throw new Error(userCreateError?.message || 'Failed to create user record');
    }

    // Then create the trainer profile
    const trainerData = {
      user_id: user.id, // Link to the users table record
      specialization: Array.isArray(insertTrainer.specialties) 
        ? insertTrainer.specialties.join(', ')
        : insertTrainer.specialties,
      bio: insertTrainer.bio || '',
      experience_years: 0, // Default value, can be updated later
      certification: null, // Default value, can be updated later
      status: insertTrainer.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: trainer, error } = await supabase
      .from('trainers')
      .insert(trainerData)
      .select('*')
      .single();
      
    if (error) {
      // Clean up the auth user and user record if trainer creation fails
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.user.id);
      if (deleteAuthError) {
        console.error('Error cleaning up auth user:', deleteAuthError);
      }
      
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
        
      if (deleteUserError) {
        console.error('Error cleaning up user:', deleteUserError);
      }
      
      console.error('Error creating trainer profile:', error);
      throw new Error(error.message || 'Failed to create trainer profile');
    }
    
    // Return the created trainer with user data
    return {
      ...trainer,
      id: trainer.id,
      firstName: insertTrainer.firstName,
      lastName: insertTrainer.lastName,
      email: insertTrainer.email,
      phone: insertTrainer.phone,
      specialties: insertTrainer.specialties || [],
      bio: trainer.bio,
      createdAt: trainer.created_at,
      updatedAt: trainer.updated_at
    } as Trainer;
  }

  async updateTrainer(id: number, updates: Partial<InsertTrainer & {
    experience_years?: number;
    certification?: string;
    specialties?: string | string[];
  }>): Promise<Trainer> {
    // First get the current trainer to get the user ID
    const { data: currentTrainer, error: fetchError } = await supabase
      .from('trainers')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentTrainer) {
      console.error('Error finding trainer:', fetchError);
      throw new Error(fetchError?.message || 'Trainer not found');
    }

    // Get the user record to find the auth_user_id
    const { data: user, error: userFetchError } = await supabase
      .from('users')
      .select('auth_user_id, email, first_name, last_name, phone')
      .eq('id', currentTrainer.user_id)
      .single();

    if (userFetchError || !user) {
      console.error('Error finding user:', userFetchError);
      throw new Error(userFetchError?.message || 'User not found');
    }

    // Update user data if needed
    const userUpdates: any = {};
    if (updates.firstName) userUpdates.first_name = updates.firstName;
    if (updates.lastName) userUpdates.last_name = updates.lastName;
    if (updates.email) userUpdates.email = updates.email;
    if (updates.phone) userUpdates.phone = updates.phone;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase.auth.admin.updateUserById(
        user.auth_user_id,
        { user_metadata: userUpdates }
      );

      if (userError) {
        console.error('Error updating trainer user:', userError);
        throw new Error(userError.message || 'Failed to update trainer user');
      }

      // Also update the users table
      const userTableUpdates: any = {};
      if (updates.firstName) userTableUpdates.first_name = updates.firstName;
      if (updates.lastName) userTableUpdates.last_name = updates.lastName;
      if (updates.email) userTableUpdates.email = updates.email;
      if (updates.phone) userTableUpdates.phone = updates.phone;

      const { error: userTableError } = await supabase
        .from('users')
        .update(userTableUpdates)
        .eq('id', currentTrainer.user_id);

      if (userTableError) {
        console.error('Error updating user table:', userTableError);
        throw new Error(userTableError.message || 'Failed to update user table');
      }
    }

    // Update trainer profile
    const trainerData: any = {
      specialization: Array.isArray(updates.specialties) 
        ? updates.specialties.join(', ') 
        : updates.specialties,
      experience_years: updates.experience_years,
      bio: updates.bio,
      certification: updates.certification,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(trainerData).forEach(key => 
      trainerData[key] === undefined && delete trainerData[key]
    );

    if (Object.keys(trainerData).length > 0) {
      const { error } = await supabase
        .from('trainers')
        .update(trainerData)
        .eq('id', id);
        
      if (error) {
        console.error('Error updating trainer profile:', error);
        throw new Error(error.message || 'Failed to update trainer profile');
      }
    }
    
    // Return the updated trainer
    return this.getTrainer(id) as Promise<Trainer>;
  }

  async deleteTrainer(id: number): Promise<void> {
    const { error } = await supabase
      .from('trainers')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting trainer:', error);
      throw new Error(error.message || 'Failed to delete trainer');
    }
  }

  async getCategories(): Promise<Category[]> {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error(error.message || 'Failed to fetch categories');
    }
    
    return categories as Category[];
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Error fetching category:', error);
      return undefined;
    }
    
    return category as Category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        ...insertCategory,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating category:', error);
      throw new Error(error.message || 'Failed to create category');
    }
    
    return category as Category;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating category:', error);
      throw new Error(error.message || 'Failed to update category');
    }
    
    return category as Category;
  }

  async deleteCategory(id: number): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(error.message || 'Failed to delete category');
    }
  }

  async getPlans(): Promise<Plan[]> {
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      throw new Error(error.message || 'Failed to fetch plans');
    }

    return plans || [];
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    const { data: plan, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching plan:', error);
      return undefined;
    }

    return plan as Plan | undefined;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        name: insertPlan.name,
        description: insertPlan.description,
        price: insertPlan.price,
        duration_days: insertPlan.durationDays,
        max_sessions: insertPlan.maxSessions,
        is_active: insertPlan.isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      throw new Error(error.message || 'Failed to create plan');
    }

    return plan as Plan;
  }

  async updatePlan(id: number, updates: Partial<InsertPlan>): Promise<Plan> {
    const { data: plan, error } = await supabase
      .from('plans')
      .update({
        name: updates.name,
        description: updates.description,
        price: updates.price,
        duration_days: updates.durationDays,
        max_sessions: updates.maxSessions,
        is_active: updates.isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plan:', error);
      throw new Error(error.message || 'Failed to update plan');
    }

    return plan as Plan;
  }

  async deletePlan(id: number): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting plan:', error);
      throw new Error(error.message || 'Failed to delete plan');
    }
  }

  async getClasses(): Promise<Class[]> {
    const { data: classes, error } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching classes:', error);
      throw new Error(error.message || 'Failed to fetch classes');
    }

    return classes || [];
  }

  async getClass(id: number): Promise<Class | undefined> {
    const { data: classItem, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching class:', error);
      return undefined;
    }

    return classItem as Class | undefined;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        ...classData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating class:', error);
      throw new Error(error.message || 'Failed to create class');
    }

    return newClass as Class;
  }

  async updateClass(id: number, updates: Partial<InsertClass>): Promise<Class> {
    const { data: updatedClass, error } = await supabase
      .from('classes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating class:', error);
      throw new Error(error.message || 'Failed to update class');
    }

    return updatedClass as Class;
  }

  async deleteClass(id: number): Promise<void> {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting class:', error);
      throw new Error(error.message || 'Failed to delete class');
    }
  }

  async getSchedules(): Promise<Schedule[]> {
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select(`
        *,
        class:class_id (id, name, max_capacity),
        trainer:trainer_id (
          id,
          user:user_id (id, first_name, last_name)
        )
      `)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching schedules:', error);
      throw new Error(error.message || 'Failed to fetch schedules');
    }

    return schedules || [];
  }

  async getSchedule(id: number): Promise<Schedule | undefined> {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching schedule:', error);
      return undefined;
    }

    return schedule as Schedule | undefined;
  }

  async createSchedule(scheduleData: InsertSchedule): Promise<Schedule> {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .insert({
        ...scheduleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating schedule:', error);
      throw new Error(error.message || 'Failed to create schedule');
    }

    return schedule as Schedule;
  }

  async updateSchedule(id: number, updates: Partial<InsertSchedule>): Promise<Schedule> {
    const { data: schedule, error } = await supabase
      .from('schedules')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating schedule:', error);
      throw new Error(error.message || 'Failed to update schedule');
    }

    return schedule as Schedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting schedule:', error);
      throw new Error(error.message || 'Failed to delete schedule');
    }
  }

  async getCourses(dateRange?: { startDate: string; endDate: string }): Promise<Course[]> {
    let query = supabase
      .from('courses')
      .select('*, class:class_id (id, name, difficulty, category:category_id (id, name, color)), trainer:trainer_id (id, user:user_id (first_name, last_name))')
      .order('course_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (dateRange) {
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);

      query = query
        .gte('course_date', start.toISOString().split('T')[0])
        .lte('course_date', end.toISOString().split('T')[0]);
    }

    const { data: courses, error } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
      throw new Error(error.message || 'Failed to fetch courses');
    }

    // Convert snake_case to camelCase for each course
    return (courses || []).map(course => ({
      id: course.id,
      scheduleId: course.schedule_id,
      classId: course.class_id,
      trainerId: course.trainer_id,
      courseDate: course.course_date,
      startTime: course.start_time,
      endTime: course.end_time,
      maxParticipants: course.max_participants,
      currentParticipants: course.current_participants,
      status: course.status,
      isActive: course.is_active,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
      class: course.class,
      trainer: course.trainer
    })) as Course[];
  }

  async getCourse(id: number): Promise<Course | undefined> {
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching course:', error);
      return undefined;
    }

    if (!course) {
      return undefined;
    }

    // Convert snake_case to camelCase
    return {
      id: course.id,
      scheduleId: course.schedule_id,
      classId: course.class_id,
      trainerId: course.trainer_id,
      courseDate: course.course_date,
      startTime: course.start_time,
      endTime: course.end_time,
      maxParticipants: course.max_participants,
      currentParticipants: course.current_participants,
      status: course.status,
      isActive: course.is_active,
      createdAt: course.created_at,
      updatedAt: course.updated_at
    } as Course;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const { data: newCourse, error } = await supabase
      .from('courses')
      .insert({
        ...course,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating course:', error);
      throw new Error(error.message || 'Failed to create course');
    }

    return newCourse as Course;
  }

  async updateCourse(id: number, updates: Partial<InsertCourse>): Promise<Course> {
    console.log('updateCourse called with id:', id, 'updates:', updates);
    
    // Map camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.scheduleId !== undefined) dbUpdates.schedule_id = updates.scheduleId;
    if (updates.classId !== undefined) dbUpdates.class_id = updates.classId;
    if (updates.trainerId !== undefined) dbUpdates.trainer_id = updates.trainerId;
    if (updates.courseDate !== undefined) dbUpdates.course_date = updates.courseDate;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.maxParticipants !== undefined) dbUpdates.max_participants = updates.maxParticipants;
    if (updates.currentParticipants !== undefined && updates.currentParticipants !== null) {
      dbUpdates.current_participants = updates.currentParticipants;
    }
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    console.log('dbUpdates object:', dbUpdates);

    const { data: updatedCourse, error } = await supabase
      .from('courses')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating course:', error);
      throw new Error(error.message || 'Failed to update course');
    }

    return updatedCourse as Course;
  }

  async deleteCourse(id: number): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting course:', error);
      throw new Error(error.message || 'Failed to delete course');
    }
  }

  async generateCoursesFromSchedule(scheduleId: number, startDate: string, endDate: string): Promise<Course[]> {
    // First, check if courses table exists
    const { error: tableCheckError } = await supabase
      .from('courses')
      .select('id')
      .limit(1);

    if (tableCheckError) {
      console.error('Courses table does not exist or is not accessible:', tableCheckError);
      throw new Error('Courses table is not available. Please run the migration first.');
    }

    const { data: schedule, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (fetchError || !schedule) {
      console.error('Error fetching schedule for course generation:', fetchError);
      throw new Error(fetchError?.message || 'Failed to fetch schedule for course generation');
    }

    console.log('Generating courses for schedule:', schedule);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Check for existing courses in the date range
    const { data: existingCourses, error: courseError } = await supabase
      .from('courses')
      .select('course_date')
      .eq('schedule_id', scheduleId)
      .gte('course_date', start.toISOString().split('T')[0])
      .lte('course_date', end.toISOString().split('T')[0]);

    if (courseError) {
      console.error('Error fetching existing courses:', courseError);
      throw new Error(courseError.message || 'Failed to fetch existing courses');
    }

    const existingDates = new Set(existingCourses?.map(c => c.course_date) || []);
    const newCourses: InsertCourse[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip if course already exists for this date
      if (existingDates.has(dateString)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      let shouldCreateCourse = false;

      if (schedule.repetition_type === 'once') {
        // For one-time schedules, only create if it's the specific schedule date
        if (schedule.schedule_date) {
          const scheduleDateString = new Date(schedule.schedule_date).toISOString().split('T')[0];
          console.log(`Comparing ${dateString} with schedule date ${scheduleDateString}`);
          if (dateString === scheduleDateString) {
            shouldCreateCourse = true;
            console.log('Should create course for one-time schedule');
          }
        }
      } else if (schedule.repetition_type === 'weekly') {
        // For weekly schedules, create on the specified day of week
        if (schedule.day_of_week !== null && currentDate.getDay() === schedule.day_of_week) {
          shouldCreateCourse = true;
        }
      } else if (schedule.repetition_type === 'biweekly') {
        // For biweekly schedules, create every other week on the specified day
        if (schedule.day_of_week !== null && currentDate.getDay() === schedule.day_of_week) {
          const weeksSinceStart = Math.floor((currentDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weeksSinceStart % 2 === 0) {
            shouldCreateCourse = true;
          }
        }
      } else if (schedule.repetition_type === 'monthly') {
        // For monthly schedules, create on the same day of month (or last day if month is shorter)
        if (schedule.day_of_week !== null && currentDate.getDay() === schedule.day_of_week) {
          const startDay = start.getDate();
          const currentDay = currentDate.getDate();
          const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          
          // Create on the same day of month, or last day if month is shorter
          const targetDay = Math.min(startDay, daysInMonth);
          if (currentDay === targetDay) {
            shouldCreateCourse = true;
          }
        }
      }

      if (shouldCreateCourse) {
        console.log(`Creating course for date: ${dateString}`);
        newCourses.push({
          scheduleId: scheduleId,
          classId: schedule.class_id,
          trainerId: schedule.trainer_id,
          courseDate: dateString,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          maxParticipants: schedule.max_participants,
          currentParticipants: 0,
          status: 'scheduled',
          isActive: schedule.is_active,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (newCourses.length === 0) {
      console.log('No courses to generate');
      return [];
    }

    console.log(`Inserting ${newCourses.length} courses:`, newCourses);

    const { data: insertedCourses, error: insertError } = await supabase
      .from('courses')
      .insert(newCourses)
      .select();

    if (insertError) {
      console.error('Error inserting generated courses:', insertError);
      throw new Error(insertError.message || 'Failed to insert generated courses');
    }

    console.log(`Successfully inserted ${insertedCourses.length} courses`);
    return insertedCourses as Course[];
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw new Error(error.message || 'Failed to fetch subscriptions');
    }

    return subscriptions || [];
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      return undefined;
    }

    return subscription as Subscription | undefined;
  }

  async getUserActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plan_id (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user active subscription:', error);
      return undefined;
    }

    return subscription as Subscription | undefined;
  }

  async getUserOldestActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plan_id (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user oldest active subscription:', error);
      return undefined;
    }

    return subscription as Subscription | undefined;
  }

  async getUserActiveSubscriptions(userId: string): Promise<Subscription[]> {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plan_id (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching user active subscriptions:', error);
      return [];
    }

    return subscriptions || [];
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plan:plan_id (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user subscriptions:', error);
      return [];
    }

    return subscriptions || [];
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    // Convert camelCase properties to snake_case for Supabase
    const subscriptionData = {
      user_id: subscription.userId,
      plan_id: subscription.planId,
      start_date: subscription.startDate,
      end_date: subscription.endDate,
      sessions_remaining: subscription.sessionsRemaining,
      status: subscription.status,
      notes: subscription.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newSubscription, error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error(error.message || 'Failed to create subscription');
    }

    return newSubscription as Subscription;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    // Map camelCase to snake_case for database
    const dbUpdates: any = {};
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (updates.planId !== undefined) dbUpdates.plan_id = updates.planId;
    if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
    if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
    if (updates.sessionsRemaining !== undefined) dbUpdates.sessions_remaining = updates.sessionsRemaining;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      throw new Error(error.message || 'Failed to update subscription');
    }

    return subscription as Subscription;
  }

  async deleteSubscription(id: number): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscription:', error);
      throw new Error(error.message || 'Failed to delete subscription');
    }
  }

  async getPayments(): Promise<Payment[]> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      throw new Error(error.message || 'Failed to fetch payments');
    }

    return payments || [];
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching payment:', error);
      return undefined;
    }

    return payment as Payment | undefined;
  }

  async getPaymentsBySubscription(subscriptionId: number): Promise<Payment[]> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payments by subscription:', error);
      throw new Error(error.message || 'Failed to fetch payments by subscription');
    }

    // Convert snake_case to camelCase and map properties for frontend compatibility
    const mappedPayments = (payments || []).map((payment: any) => ({
      ...payment,
      // Map payment properties to match frontend expectations
      method: payment.payment_type || 'cash',
      status: payment.payment_status || 'pending',
      payment_date: payment.payment_date || payment.paymentDate,
      subscription_id: payment.subscription_id || payment.subscriptionId,
      user_id: payment.user_id || payment.userId,
      transaction_id: payment.transaction_id || payment.transactionId,
      due_date: payment.due_date || payment.dueDate,
      created_at: payment.created_at || payment.createdAt,
      updated_at: payment.updated_at || payment.updatedAt
    }));

    return mappedPayments;
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error fetching payments by user:', error);
      throw new Error(error.message || 'Failed to fetch payments by user');
    }

    // Convert snake_case to camelCase and map properties for frontend compatibility
    const mappedPayments = (payments || []).map((payment: any) => ({
      ...payment,
      // Map payment properties to match frontend expectations
      method: payment.payment_type || 'cash',
      status: payment.payment_status || 'pending',
      payment_date: payment.payment_date || payment.paymentDate,
      subscription_id: payment.subscription_id || payment.subscriptionId,
      user_id: payment.user_id || payment.userId,
      transaction_id: payment.transaction_id || payment.transactionId,
      due_date: payment.due_date || payment.dueDate,
      created_at: payment.created_at || payment.createdAt,
      updated_at: payment.updated_at || payment.updatedAt
    }));

    return mappedPayments;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    // Convert camelCase properties to snake_case for Supabase
    const paymentData = {
      subscription_id: payment.subscriptionId,
      user_id: payment.userId,
      amount: payment.amount,
      payment_type: payment.paymentType,
      payment_status: payment.paymentStatus,
      transaction_id: payment.transactionId,
      payment_date: payment.paymentDate || new Date().toISOString(),
      due_date: payment.dueDate,
      discount: payment.discount,
      notes: payment.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newPayment, error } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      throw new Error(error.message || 'Failed to create payment');
    }

    return newPayment as Payment;
  }

  async updatePayment(id: number, updates: Partial<InsertPayment>): Promise<Payment> {
    // Convert camelCase properties to snake_case for Supabase
    const dbUpdates: any = {};
    if (updates.subscriptionId !== undefined) dbUpdates.subscription_id = updates.subscriptionId;
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.paymentType !== undefined) dbUpdates.payment_type = updates.paymentType;
    if (updates.paymentStatus !== undefined) dbUpdates.payment_status = updates.paymentStatus;
    if (updates.transactionId !== undefined) dbUpdates.transaction_id = updates.transactionId;
    if (updates.paymentDate !== undefined) dbUpdates.payment_date = updates.paymentDate;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    dbUpdates.updated_at = new Date().toISOString();

    const { data: payment, error } = await supabase
      .from('payments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      throw new Error(error.message || 'Failed to update payment');
    }

    return payment as Payment;
  }

  async deletePayment(id: number): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment:', error);
      throw new Error(error.message || 'Failed to delete payment');
    }
  }

  async getClassRegistrations(userId?: string): Promise<ClassRegistration[]> {
    let query = supabase
      .from('class_registrations')
      .select(`
        *,
        course:course_id (
          id,
          course_date,
          start_time,
          end_time,
          schedule_id,
          class_id,
          trainer_id,
          schedule:schedule_id (
            id,
            day_of_week,
            start_time,
            end_time
          ),
          class:class_id (id, name, category_id, category:category_id (id, name)),
          trainer:trainer_id (id, user:user_id (first_name, last_name))
        )
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: registrations, error } = await query;

    if (error) {
      console.error('Error fetching class registrations:', error);
      throw new Error(error.message || 'Failed to fetch class registrations');
    }

    // Convert snake_case to camelCase and map the data structure
    const mappedRegistrations = (registrations || []).map((reg: any) => ({
      ...reg,
      qrCode: reg.qr_code, // Map qr_code to qrCode
      course: reg.course ? {
        ...reg.course,
        courseDate: reg.course.course_date,
        startTime: reg.course.start_time,
        endTime: reg.course.end_time,
        scheduleId: reg.course.schedule_id,
        classId: reg.course.class_id,
        trainerId: reg.course.trainer_id,
        schedule: reg.course.schedule ? {
          ...reg.course.schedule,
          dayOfWeek: reg.course.schedule.day_of_week,
          startTime: reg.course.schedule.start_time,
          endTime: reg.course.schedule.end_time
        } : null,
        class: reg.course.class ? {
          ...reg.course.class,
          category: reg.course.class.category
        } : null,
        trainer: reg.course.trainer ? {
          ...reg.course.trainer,
          firstName: reg.course.trainer.user?.first_name || '',
          lastName: reg.course.trainer.user?.last_name || ''
        } : null
      } : null
    }));

    return mappedRegistrations;
  }

  async createClassRegistration(registration: InsertClassRegistration): Promise<ClassRegistration> {
    // Generate a unique QR code for this registration
    const qrCode = `REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: newRegistration, error } = await supabase
      .from('class_registrations')
      .insert({
        user_id: registration.userId,
        course_id: registration.courseId,
        qr_code: qrCode,
        registration_date: new Date().toISOString(),
        status: 'registered',
        notes: registration.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating class registration:', error);
      throw new Error(error.message || 'Failed to create class registration');
    }

    return newRegistration as ClassRegistration;
  }

  async updateClassRegistration(id: number, updates: Partial<InsertClassRegistration>): Promise<ClassRegistration> {
    // Convert camelCase properties to snake_case for Supabase
    const dbUpdates: any = {};
    if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
    if (updates.courseId !== undefined) dbUpdates.course_id = updates.courseId;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    const { data: registration, error } = await supabase
      .from('class_registrations')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating class registration:', error);
      throw new Error(error.message || 'Failed to update class registration');
    }

    return registration as ClassRegistration;
  }

  async getRegistrationByQRCode(qrCode: string): Promise<ClassRegistration | undefined> {
    const { data: registration, error } = await supabase
      .from('class_registrations')
      .select('*')
      .eq('qr_code', qrCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching registration by QR code:', error);
      return undefined;
    }

    return registration as ClassRegistration | undefined;
  }

  async getCheckins(date?: string): Promise<Checkin[]> {
    let query = supabase
      .from('checkins')
      .select('*')
      .order('checkin_time', { ascending: false });

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('checkin_time', startOfDay.toISOString())
        .lte('checkin_time', endOfDay.toISOString());
    }

    const { data: checkins, error } = await query;

    if (error) {
      console.error('Error fetching checkins:', error);
      throw new Error(error.message || 'Failed to fetch checkins');
    }

    // Convert snake_case to camelCase for consistency with TypeScript types
    return (checkins || []).map(checkin => ({
      id: checkin.id,
      userId: checkin.user_id,
      registrationId: checkin.registration_id,
      checkinTime: checkin.checkin_time,
      sessionConsumed: checkin.session_consumed,
      notes: checkin.notes
    })) as Checkin[];
  }

  async getUserCheckins(userId: string): Promise<Checkin[]> {
    const { data: checkins, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('checkin_time', { ascending: false });

    if (error) {
      console.error('Error fetching user checkins:', error);
      throw new Error(error.message || 'Failed to fetch user checkins');
    }

    // Convert snake_case to camelCase for consistency with TypeScript types
    return (checkins || []).map(checkin => ({
      id: checkin.id,
      userId: checkin.user_id,
      registrationId: checkin.registration_id,
      checkinTime: checkin.checkin_time,
      sessionConsumed: checkin.session_consumed,
      notes: checkin.notes
    })) as Checkin[];
  }

  async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
    // Convert camelCase properties to snake_case for Supabase
    const checkinData = {
      user_id: checkin.userId,
      registration_id: checkin.registrationId,
      session_consumed: checkin.sessionConsumed,
      notes: checkin.notes,
      checkin_time: new Date().toISOString()
    };

    const { data: newCheckin, error } = await supabase
      .from('checkins')
      .insert(checkinData)
      .select()
      .single();

    if (error) {
      console.error('Error creating checkin:', error);
      throw new Error(error.message || 'Failed to create checkin');
    }

    return newCheckin as Checkin;
  }

  async getDashboardStats(): Promise<{
    totalUsers: number;
    activeSubscriptions: number;
    upcomingClasses: number;
    recentCheckins: any[];
  }> {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString());

    // Get upcoming classes (next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { count: upcomingClasses } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', today.toISOString())
      .lte('start_time', nextWeek.toISOString());

    // Get recent checkins
    const { data: recentCheckins } = await supabase
      .from('checkins')
      .select('*, users(*)')
      .order('checkin_time', { ascending: false })
      .limit(5);

    return {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      upcomingClasses: upcomingClasses || 0,
      recentCheckins: recentCheckins || []
    };
  }

  async markAbsentClasses(): Promise<void> {
    try {
      // Get current time and time one hour ago
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Find registrations for classes that ended more than 1 hour ago and haven't been checked in
      const { data: absentRegistrations, error: findError } = await supabase
        .from('class_registrations')
        .select(`
          id,
          user_id,
          course:course_id (id, start_time, end_time)
        `)
        .eq('status', 'registered')
        .lt('course.end_time', oneHourAgo.toISOString())
        .is('checkin_id', null);

      if (findError) {
        console.error('Error finding absent registrations:', findError);
        return;
      }

      if (!absentRegistrations || absentRegistrations.length === 0) {
        return;
      }

      // Process each absent registration
      for (const registration of absentRegistrations) {
        // Mark registration as absent
        const { error: updateError } = await supabase
          .from('class_registrations')
          .update({ 
            status: 'absent',
            updated_at: now.toISOString() 
          })
          .eq('id', registration.id);

        if (updateError) {
          console.error(`Error updating registration ${registration.id}:`, updateError);
          continue;
        }

        // Deduct session from user's oldest active subscription (FIFO principle)
        const oldestActiveSubscription = await this.getUserOldestActiveSubscription(registration.user_id);
        if (oldestActiveSubscription && oldestActiveSubscription.sessionsRemaining > 0) {
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .update({ 
              sessionsRemaining: oldestActiveSubscription.sessionsRemaining - 1,
              updated_at: now.toISOString()
            })
            .eq('id', oldestActiveSubscription.id);

          if (subscriptionError) {
            console.error(`Error updating oldest subscription for user ${registration.user_id}:`, subscriptionError);
          }
        }
      }
    } catch (error) {
      console.error('Error in markAbsentClasses:', error);
      throw error;
    }
  }

  // Helper: Update subscription status to active if fully paid
  async updateSubscriptionStatusIfFullyPaid(subscriptionId: number): Promise<void> {
    // Get the subscription
    const subscription = await this.getSubscription(subscriptionId);
    console.log('[updateSubscriptionStatusIfFullyPaid] subscription:', subscription);
    if (!subscription) {
      console.log('[updateSubscriptionStatusIfFullyPaid] No subscription found for id', subscriptionId);
      return;
    }
    // Use plan_id (snake_case) as returned by Supabase
    const plan = await this.getPlan((subscription as any).plan_id);
    console.log('[updateSubscriptionStatusIfFullyPaid] plan:', plan);
    if (!plan) {
      console.log('[updateSubscriptionStatusIfFullyPaid] No plan found for plan_id', (subscription as any).plan_id);
      return;
    }
    // Get all payments for this subscription
    const payments = await this.getPaymentsBySubscription(subscriptionId);
    console.log('[updateSubscriptionStatusIfFullyPaid] payments:', payments);
    // Use payment_status (snake_case) as returned by Supabase
    const totalPaid = payments
      .filter(p => (p as any).payment_status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount as any), 0);
    const planPrice = parseFloat(plan.price as any);
    console.log(`[updateSubscriptionStatusIfFullyPaid] totalPaid=${totalPaid}, planPrice=${planPrice}, currentStatus=${subscription.status}`);
    if (totalPaid >= planPrice && subscription.status !== 'active') {
      console.log(`[updateSubscriptionStatusIfFullyPaid] Subscription #${subscriptionId} status will be updated to 'active'`);
      await this.updateSubscription(subscriptionId, { status: 'active' });
      console.log(`[updateSubscriptionStatusIfFullyPaid] Subscription #${subscriptionId} status updated to 'active'`);
    } else {
      console.log(`[updateSubscriptionStatusIfFullyPaid] No status update needed for subscription #${subscriptionId}`);
    }
  }
}

export const storage = new DatabaseStorage();