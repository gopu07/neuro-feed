import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'sonner';

export const useMyGuild = () => {
  return useQuery({
    queryKey: ['guilds', 'my'],
    queryFn: async () => {
      const response = await api.get('/api/guilds/my');
      return response.data;
    },
  });
};

export const useGuildLeaderboard = () => {
  return useQuery({
    queryKey: ['guilds', 'leaderboard'],
    queryFn: async () => {
      const response = await api.get('/api/guilds/leaderboard');
      return response.data;
    },
  });
};

export const useGuildExplore = () => {
  return useQuery({
    queryKey: ['guilds', 'explore'],
    queryFn: async () => {
      const response = await api.get('/api/guilds/explore');
      return response.data;
    },
  });
};

export const useCreateGuild = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const response = await api.post('/api/guilds/create', null, {
        params: { name, description }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(`Welcome to ${data.name || 'your new Guild'}!`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to create guild';
      toast.error(msg);
    }
  });
};

export const useJoinGuild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guildId: string) => {
      const response = await api.post('/api/guilds/join', null, {
        params: { guild_id: guildId }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(`Successfully joined the guild!`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to join guild';
      toast.error(msg);
    }
  });
};

export const useLeaveGuild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/guilds/leave');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('You have left the guild.');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to leave guild';
      toast.error(msg);
    }
  });
};

export const useSendGuildMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post('/api/guilds/chat', null, {
        params: { content }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guilds', 'my'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to send message';
      toast.error(msg);
    }
  });
};
