import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { projectApi } from '@/lib/project-api';

export function useProjects() {
  const { activeProfile } = useAuth();
  const queryClient = useQueryClient();

  // The active company ID, if the user is using an organization profile
  const companyId = activeProfile?.type === 'organization' ? activeProfile.id : undefined;

  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    // Using a consistent query key pattern that invalidates if activeProfile changes
    queryKey: ['projects', companyId],
    queryFn: async () => {
      try {
        const response = await projectApi.getProjects(companyId);
        return response.data;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to load projects';
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    },
    // Only run the query when activeProfile is authenticated and loaded
    enabled: !!activeProfile, 
  });

  return {
    projects,
    isLoading,
    error: error?.message || null,
    refetch,
    // Provide an alias specifically to meet backwards compatibility if other files expect it
    loadProjects: refetch
  };
}