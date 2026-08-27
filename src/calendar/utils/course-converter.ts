import type { IEvent } from "@/calendar/interfaces";
import type { TEventColor } from "@/calendar/types";
import { normalizeHex } from "@/calendar/helpers";

interface CourseData {
  id: number;
  class?: {
    id: number;
    name: string;
    description?: string;
    color?: string | null;
    category?: {
      id: number;
      name: string;
      color: string;
    };
    difficulty?: string | string[];
    duration?: number;
    max_capacity?: number;
  };
  trainer?: {
    id: number;
    user?: {
      first_name: string;
      last_name: string;
    };
    specialization?: string;
  };
  courseDate?: string;
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
  scheduleId?: number;
  maxParticipants?: number;
  currentParticipants?: number;
  status?: string;
}

interface RegistrationData {
  course_id?: number;
  status: string;
  qr_code?: string;
}

function resolveCourseHex(
  course: any,
  classById?: Map<number, any>
): string | undefined {
  const nested = course.class ?? course.classes;
  const classObj = Array.isArray(nested) ? nested[0] : nested;
  const fromCatalog = classById?.get(course.class_id ?? course.classId ?? classObj?.id);
  return normalizeHex(
    classObj?.color ||
    fromCatalog?.color ||
    classObj?.category?.color ||
    classObj?.categories?.color ||
    fromCatalog?.category?.color
  );
}

function namedColorFromHex(hex?: string): TEventColor {
  if (!hex) return "blue";
  const value = hex.replace(/^#/, "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.12) return "gray";
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      default: h = ((r - g) / d + 4) * 60; break;
    }
  }
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 75) return "yellow";
  if (h < 165) return "green";
  if (h < 255) return "blue";
  return "purple";
}

// Convert courses to calendar events for member view
export const convertCoursesToMemberEvents = (
  courses: any[], 
  registrations: RegistrationData[] = [],
  classCatalog: any[] = []
): IEvent[] => {
  if (!courses || !Array.isArray(courses)) return [];

  const classById = new Map(classCatalog.map((item) => [item.id, item]));
  const validEvents: IEvent[] = [];
  
  for (const course of courses) {
    // Check if user is registered for this course
    const isRegistered = registrations.some(reg => 
      reg.course_id === course.id && reg.status === 'registered'
    );
    
    const instructorName = course.trainer?.user ? 
      `${course.trainer.user.first_name} ${course.trainer.user.last_name}` : 
      course.trainer?.specialization || 'Unknown Trainer';

    // Create start and end dates using correct field names (snake_case from API)
    const courseDate = course.course_date || course.courseDate;
    const startTime = course.start_time || course.startTime;
    const endTime = course.end_time || course.endTime;

    // Validate date and time fields before creating Date objects
    if (!courseDate || !startTime || !endTime) {
      console.warn('Invalid course data - missing date/time fields:', {
        id: course.id,
        courseDate,
        startTime,
        endTime
      });
      continue; // Skip invalid courses
    }

    const startDate = new Date(`${courseDate}T${startTime}`);
    const endDate = new Date(`${courseDate}T${endTime}`);

    // Validate that the dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Invalid course date/time - cannot create valid Date objects:', {
        id: course.id,
        courseDate,
        startTime,
        endTime,
        startDate: startDate.toString(),
        endDate: endDate.toString()
      });
      continue; // Skip invalid courses
    }

    const hexColor = resolveCourseHex(course, classById);

    validEvents.push({
      id: course.id,
      title: course.class?.name || 'Unknown Class',
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nDifficulty: ${Array.isArray(course.class?.difficulty) ? course.class.difficulty.join(', ') : (course.class?.difficulty || 'Unknown')}\nDuration: ${course.class?.duration || 60} minutes`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: namedColorFromHex(hexColor),
      hexColor,
      user: {
        id: course.trainer?.id?.toString() || 'unknown',
        name: instructorName,
        picturePath: null
      },
      category: course.class?.category ? {
        id: course.class.category.id,
        name: course.class.category.name,
        color: course.class.category.color
      } : undefined,
      isRegistered: isRegistered
    });
  }
  
  return validEvents;
};

// Convert courses to calendar events for admin view
export const convertCoursesToAdminEvents = (courses: any[], classCatalog: any[] = []): IEvent[] => {
  if (!courses || !Array.isArray(courses)) return [];

  const classById = new Map(classCatalog.map((item) => [item.id, item]));
  console.log('Converting admin courses to events:', courses.length);
  const validEvents: IEvent[] = [];
  
  for (const course of courses) {
    console.log('Processing course:', {
      id: course.id,
      class: course.class,
      category: course.class?.category
    });
    const instructorName = course.trainer?.specialization || 'Unknown Trainer';

    // Create start and end dates using correct field names (snake_case from API)
    const courseDate = course.course_date || course.courseDate;
    const startTime = course.start_time || course.startTime;
    const endTime = course.end_time || course.endTime;

    // Validate date and time fields before creating Date objects
    if (!courseDate || !startTime || !endTime) {
      console.warn('Invalid course data - missing date/time fields:', {
        id: course.id,
        courseDate,
        startTime,
        endTime
      });
      continue; // Skip invalid courses
    }

    const startDate = new Date(`${courseDate}T${startTime}`);
    const endDate = new Date(`${courseDate}T${endTime}`);

    // Validate that the dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Invalid course date/time - cannot create valid Date objects:', {
        id: course.id,
        courseDate,
        startTime,
        endTime,
        startDate: startDate.toString(),
        endDate: endDate.toString()
      });
      continue; // Skip invalid courses
    }

    const hexColor = resolveCourseHex(course, classById);

    validEvents.push({
      id: course.id,
      title: course.class?.name || 'Unknown Class',
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nParticipants: ${course.current_participants || course.currentParticipants || 0}/${course.max_participants || course.maxParticipants || 0}\nStatus: ${course.status || 'scheduled'}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: namedColorFromHex(hexColor),
      hexColor,
      user: {
        id: course.trainer?.id?.toString() || 'unknown',
        name: instructorName,
        picturePath: null
      },
      category: course.class?.category ? {
        id: course.class.category.id,
        name: course.class.category.name,
        color: course.class.category.color
      } : undefined
    });
  }
  
  return validEvents;
};

// Helper function to create users array for calendar
export const createMemberUsers = () => [{
  id: 'member',
  name: 'My Classes',
  picturePath: null
}];

export const createAdminUsers = (trainers: any[]) => {
  if (!trainers || !Array.isArray(trainers)) return [];
  return trainers.map((trainer: any) => ({
    id: trainer.id.toString(),
    name: trainer.specialization || 'Unknown Trainer',
    picturePath: null
  }));
};
