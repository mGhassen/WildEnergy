import { apiRequest } from '../queryClient';
import { Registration } from './registrations';
import { Subscription } from './subscriptions';
import { Plan } from './plans';
import { Category } from './categories';
import { Schedule } from './schedules';
import { Trainer } from './trainers';
import { Checkin } from './checkins';
import { Payment } from './payments';
import { SessionData } from './auth';

export interface AddMembersToCourseRequest {
  memberIds: string[];
}

export interface AddMembersToCourseResponse {
  success: boolean;
  registered: number;
  alreadyRegistered: number;
  message: string;
}

export interface Course {
  id: number;
  class_id: number;
  trainer_id: number;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  current_participants: number;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  class?: any;
  trainer?: any;
  schedule?: any;
  registrations?: any[];
  checkins?: any[];
  statistics?: any;
  isEdited?: boolean;
  differences?: {
    trainer?: {
      original: number;
      current: number;
    };
    startTime?: {
      original: string;
      current: string;
    };
    endTime?: {
      original: string;
      current: string;
    };
    maxParticipants?: {
      original: number;
      current: number;
    };
  };
}

export const courseApi = {
  async getCourse(courseId: number): Promise<Course> {
    return apiRequest('GET', `/api/admin/courses/${courseId}`);
  },

  async getCourses(): Promise<Course[]> {
    return apiRequest('GET', '/api/admin/courses');
  },

  async createCourse(data: Partial<Course>): Promise<Course> {
    return apiRequest('POST', '/api/admin/courses', data);
  },

  async updateCourse(courseId: number, data: Partial<Course>): Promise<Course> {
    return apiRequest('PUT', `/api/admin/courses/${courseId}`, data);
  },

  async deleteCourse(courseId: number): Promise<void> {
    return apiRequest('DELETE', `/api/admin/courses/${courseId}`);
  },

  async addMembersToCourse(
    courseId: number, 
    data: AddMembersToCourseRequest
  ): Promise<AddMembersToCourseResponse> {
    return apiRequest('POST', `/api/admin/courses/${courseId}`, data);
  },

  async getMemberCourses(): Promise<Course[]> {
    return apiRequest('GET', '/api/member/courses');
  },

  async getMemberCourse(courseId: number): Promise<Course> {
    return apiRequest('GET', `/api/member/courses/${courseId}`);
  },

  async registerForCourse(courseId: number): Promise<Registration> {
    return apiRequest('POST', `/api/registrations/register/${courseId}`);
  },

  async getMemberCourseRegistrations(): Promise<Registration[]> {
    return apiRequest('GET', '/api/registrations');
  },

  async getMemberCourseSubscription(): Promise<Subscription> {
    return apiRequest('GET', '/api/member/subscription');
  },

  async getMemberCoursePlans(): Promise<Plan[]> {
    return apiRequest('GET', '/api/member/plans');
  },

  async getMemberCourseCategories(): Promise<Category[]> {
    return apiRequest('GET', '/api/member/categories');
  },

  async getMemberCourseSchedules(): Promise<Schedule[]> {
    return apiRequest('GET', '/api/schedules');
  },

  async getMemberCourseTrainers(): Promise<Trainer[]> {
    return apiRequest('GET', '/api/trainers');
  },

  async getMemberCourseCheckins(): Promise<Checkin[]> {
    return apiRequest('GET', '/api/member/checkins');
  },

  async getMemberCoursePayments(): Promise<Payment[]> {
    return apiRequest('GET', '/api/member/payments');
  },

  async getMemberCourseAuthSession(): Promise<SessionData> {
    return apiRequest('GET', '/api/auth/session');
  }
};
