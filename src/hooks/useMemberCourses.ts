import { useQuery } from '@tanstack/react-query';
import { courseApi, Course } from '@/lib/api/courses';

// Member Courses Hooks
export const useMemberCourses = () => {
  return useQuery<Course[]>({
    queryKey: ['/api/member/courses'],
    queryFn: courseApi.getMemberCourses,
  });
};

export const useMemberCourse = (courseId: number) => {
  return useQuery<Course>({
    queryKey: ['/api/member/courses', courseId],
    queryFn: () => courseApi.getMemberCourse(courseId),
    enabled: !!courseId,
  });
};