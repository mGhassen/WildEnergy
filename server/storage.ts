import type {
  User, InsertUser, Trainer, InsertTrainer, Category, InsertCategory,
  Plan, InsertPlan, Class, InsertClass, Schedule, InsertSchedule, 
  Subscription, InsertSubscription, ClassRegistration, InsertClassRegistration, 
  Checkin, InsertCheckin
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

  // Subscriptions
  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getUserActiveSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription>;

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
      is_trainer: insertUser.isTrainer || false,
      status: insertUser.status || 'active',
      subscription_status: insertUser.subscriptionStatus || 'inactive',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
    const { data: user, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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
    const { data: user, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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
      .from('users')
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

    // Update user data if needed
    const userUpdates: any = {};
    if (updates.firstName) userUpdates.first_name = updates.firstName;
    if (updates.lastName) userUpdates.last_name = updates.lastName;
    if (updates.email) userUpdates.email = updates.email;
    if (updates.phone) userUpdates.phone = updates.phone;

    if (Object.keys(userUpdates).length > 0) {
      const { error: userError } = await supabase.auth.admin.updateUserById(
        currentTrainer.user_id,
        { user_metadata: userUpdates }
      );

      if (userError) {
        console.error('Error updating trainer user:', userError);
        throw new Error(userError.message || 'Failed to update trainer user');
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
        ...insertPlan,
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
        ...updates,
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
      .select('*')
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
      .select('*')
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

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const { data: newSubscription, error } = await supabase
      .from('subscriptions')
      .insert({
        ...subscription,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      throw new Error(error.message || 'Failed to create subscription');
    }

    return newSubscription as Subscription;
  }

  async updateSubscription(id: number, updates: Partial<InsertSubscription>): Promise<Subscription> {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
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

  async getClassRegistrations(userId?: string): Promise<ClassRegistration[]> {
    let query = supabase
      .from('class_registrations')
      .select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: registrations, error } = await query;

    if (error) {
      console.error('Error fetching class registrations:', error);
      throw new Error(error.message || 'Failed to fetch class registrations');
    }

    return registrations || [];
  }

  async createClassRegistration(registration: InsertClassRegistration): Promise<ClassRegistration> {
    const { data: newRegistration, error } = await supabase
      .from('class_registrations')
      .insert({
        ...registration,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    const { data: registration, error } = await supabase
      .from('class_registrations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
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

    return checkins || [];
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

    return checkins || [];
  }

  async createCheckin(checkin: InsertCheckin): Promise<Checkin> {
    const { data: newCheckin, error } = await supabase
      .from('checkins')
      .insert({
        ...checkin,
        checkin_time: new Date().toISOString()
      })
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
          schedule:schedule_id (id, start_time, end_time)
        `)
        .eq('status', 'registered')
        .lt('schedule.end_time', oneHourAgo.toISOString())
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

        // Deduct session from user's active subscription
        const activeSubscription = await this.getUserActiveSubscription(registration.user_id);
        if (activeSubscription && activeSubscription.sessionsRemaining > 0) {
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .update({ 
              sessionsRemaining: activeSubscription.sessionsRemaining - 1,
              updated_at: now.toISOString()
            })
            .eq('id', activeSubscription.id);

          if (subscriptionError) {
            console.error(`Error updating subscription for user ${registration.user_id}:`, subscriptionError);
          }
        }
      }
    } catch (error) {
      console.error('Error in markAbsentClasses:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();