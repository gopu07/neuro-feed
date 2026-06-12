import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export const useDailyChallenge = () => {
  return useQuery({
    queryKey: ['dailyChallenge'],
    queryFn: async () => {
      const response = await api.get('/api/daily-challenge/today');
      return response.data;
    },
  });
};

export const useCompleteDailyChallenge = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/daily-challenge/complete`);
      return response.data;
    },
  });
};
