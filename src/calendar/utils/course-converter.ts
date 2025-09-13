import type { IEvent } from "@/calendar/interfaces";
import type { TEventColor } from "@/calendar/types";

interface CourseData {
  id: number;
  class?: {
    id: number;
    name: string;
    description?: string;
    category?: {
      id: number;
      name: string;
      color: string;
    };
    difficulty?: string;
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

// Color mapping for consistent color assignment
const getEventColor = (category?: { color: string }): TEventColor => {
  if (!category?.color) return "blue";
  
  const colorMap: Record<string, TEventColor> = {
    '#FF0000': 'red',
    '#00FF00': 'green', 
    '#0000FF': 'blue',
    '#FFFF00': 'yellow',
    '#FF00FF': 'purple',
    '#FFA500': 'orange',
    '#808080': 'gray',
    '#FFD700': 'yellow', // Gold
    '#FF69B4': 'purple', // Hot pink
    '#00CED1': 'blue',   // Dark turquoise
    '#32CD32': 'green',  // Lime green
    '#FF6347': 'orange', // Tomato
    '#9370DB': 'purple', // Medium purple
    '#20B2AA': 'green',  // Light sea green
    '#FF1493': 'purple', // Deep pink
    '#00BFFF': 'blue',   // Deep sky blue
    '#FF8C00': 'orange', // Dark orange
    '#DC143C': 'red',    // Crimson
    '#8B008B': 'purple', // Dark magenta
  };
  
  return colorMap[category.color.toUpperCase()] || 'blue';
};

// Convert courses to calendar events for member view
export const convertCoursesToMemberEvents = (
  courses: any[], 
  registrations: RegistrationData[] = []
): IEvent[] => {
  if (!courses || !Array.isArray(courses)) return [];

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

    validEvents.push({
      id: course.id,
      title: course.class?.name || 'Unknown Class',
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nDifficulty: ${course.class?.difficulty || 'Unknown'}\nDuration: ${course.class?.duration || 60} minutes`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: getEventColor(course.class?.category),
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
export const convertCoursesToAdminEvents = (courses: any[]): IEvent[] => {
  if (!courses || !Array.isArray(courses)) return [];

  const validEvents: IEvent[] = [];
  
  for (const course of courses) {
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

    validEvents.push({
      id: course.id,
      title: course.class?.name || 'Unknown Class',
      description: `${course.class?.description || ''}\n\nInstructor: ${instructorName}\nParticipants: ${course.current_participants || course.currentParticipants || 0}/${course.max_participants || course.maxParticipants || 0}\nStatus: ${course.status || 'scheduled'}`,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      color: getEventColor(course.class?.category),
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
