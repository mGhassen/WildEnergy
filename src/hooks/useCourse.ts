import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseApi, Course, AddMembersToCourseRequest, AddMembersToCourseResponse } from '@/lib/api/courses';

export function useCourse(courseId: number) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getCourse(courseId),
    enabled: !!courseId,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.getCourses(),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Course>) => courseApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: Partial<Course> }) => 
      courseApi.updateCourse(courseId, data),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (courseId: number) => courseApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useAddMembersToCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: AddMembersToCourseRequest }) => 
      courseApi.addMembersToCourse(courseId, data),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}
