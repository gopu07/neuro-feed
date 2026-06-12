import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { useToast } from './use-toast';

export const useUserProfile = () => {
  return useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await api.get('/api/user/profile');
      return response.data;
    },
    retry: 1, // Don't aggressively retry user profile if they might be unauthorized
  });
};

export const useUpdateUserPreferences = () => {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ skillLevel, domains }: { skillLevel: string; domains: string[] }) => {
      const response = await api.put('/api/user/preferences', {
        skill_level: skillLevel,
        domains,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: error.response?.data?.detail || error.message || "Something went wrong",
      });
    },
  });
};

export const useUserXpHistory = () => {
  return useQuery({
    queryKey: ['userXpHistory'],
    queryFn: async () => {
      const response = await api.get('/api/user/xp-history');
      return response.data;
    },
  });
};

