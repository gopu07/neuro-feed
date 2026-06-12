import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export const useExploreTrending = () => {
  return useQuery({
    queryKey: ['explore', 'trending'],
    queryFn: async () => {
      const response = await api.get('/api/explore/trending');
      return response.data;
    },
  });
};

export const useExploreSearch = (q: string) => {
  return useQuery({
    queryKey: ['explore', 'search', q],
    queryFn: async () => {
      const response = await api.get('/api/explore/search', { params: { q } });
      return response.data;
    },
    enabled: q.length >= 2,
  });
};
