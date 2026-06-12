import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useGlobalLeaderboard = (offset = 0) => {
  return useQuery({
    queryKey: ['leaderboard', 'global', offset],
    queryFn: async () => {
      const response = await api.get('/api/leaderboard', { params: { offset } });
      return response.data;
    },
  });
};

export const useWeeklyLeaderboard = (offset = 0) => {
  return useQuery({
    queryKey: ['leaderboard', 'weekly', offset],
    queryFn: async () => {
      const response = await api.get('/api/leaderboard/weekly', { params: { offset } });
      return response.data;
    },
  });
};

export const useMyRank = () => {
  return useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: async () => {
      const response = await api.get('/api/leaderboard/me');
      return response.data;
    },
    retry: 1, // Will fail gracefully if unauth
  });
};
