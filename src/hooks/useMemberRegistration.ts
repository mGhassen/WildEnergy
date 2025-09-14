import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuthToken } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useMemberCourseRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (courseId: number) => {
      // Get token using the shared utility
      const token = getAuthToken();
      console.log('Registration attempt with token:', token ? 'present' : 'missing');
      
      const response = await fetch("/api/member/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify({ courseId })
      });
      
      console.log('Registration response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 409) {
          const overlapData = await response.json();
          throw { type: 'OVERLAP', ...overlapData };
        } else {
          let message = `${response.status}: ${response.statusText}`;
          try {
            const text = await response.text();
            if (text.startsWith('{') || text.startsWith('[')) {
              const errorData = JSON.parse(text);
              message = errorData.error || errorData.message || message;
            } else if (text.length > 0 && text.length < 200) {
              message = text;
            }
          } catch {
            // If text parsing fails, use the status message
          }
          throw new Error(message);
        }
      }
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      
      return response;
    },
    onMutate: async (courseId: number) => {
      // Optimistically update the registrations
      await queryClient.cancelQueries({ queryKey: ["/api/registrations"] });
      
      const previousRegistrations = queryClient.getQueryData(["/api/registrations"]);
      
      // Optimistically add the new registration
      queryClient.setQueryData(["/api/registrations"], (old: any[]) => {
        const newRegistration = {
          id: Date.now(), // temporary ID
          course_id: courseId,
          user_id: "temp",
          status: "registered",
          registration_date: new Date().toISOString(),
          qr_code: "temp",
          notes: null
        };
        return old ? [...old, newRegistration] : [newRegistration];
      });
      
      return { previousRegistrations };
    },
    onError: (error: unknown, courseId: number, context: unknown) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousRegistrations' in context) {
        queryClient.setQueryData(["/api/registrations"], context.previousRegistrations);
      }
      
      console.log('Registration error:', error);
      console.log('Error type:', typeof error);
      console.log('Error keys:', error && typeof error === 'object' ? Object.keys(error) : 'not an object');
      
      // Check if this is an overlap error
      if (typeof error === 'object' && error && 'type' in error && error.type === 'OVERLAP') {
        // Don't show toast for overlap errors, let the component handle it
        return;
      }
      
      // Check if this is an overlap error by looking at the error message
      if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        const errorMessage = error.message;
        
        // Handle other specific error messages
        let errorMessageToShow = "Failed to book course";
        if (errorMessage.includes("Already registered")) {
          errorMessageToShow = "You are already registered for this course";
        } else if (errorMessage.includes("No active subscription")) {
          errorMessageToShow = "No active subscription with sessions remaining";
        } else if (errorMessage.includes("Course is full")) {
          errorMessageToShow = "This course is full";
        } else {
          errorMessageToShow = errorMessage;
        }
        
        toast({
          title: "Booking failed",
          description: errorMessageToShow,
          variant: "destructive",
        });
        return;
      }
      
      // Fallback error handling
      toast({
        title: "Booking failed",
        description: "An unexpected error occurred while registering for the course.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/courses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/member/subscriptions"] });
      toast({
        title: "Registration successful!",
        description: "You are now registered for this course. Your QR code has been generated.",
      });
    },
  });
}
