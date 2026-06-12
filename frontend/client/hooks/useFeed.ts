import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { queryClient } from '../lib/queryClient';

import { useToast } from './use-toast';

export const useFeed = (offset = 0) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['feed', offset],
    queryFn: async () => {
      try {
        const response = await api.get('/api/feed', { params: { offset } });
        if (Array.isArray(response.data)) return response.data;
        if (response.data && Array.isArray(response.data.items)) return response.data.items;
        return [];
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Failed to load feed",
          description: error.response?.data?.detail || error.message || "An unexpected error occurred",
        });
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useCardInteraction = () => {
  return useMutation({
    mutationFn: async ({ cardId, action, dwellSeconds }: { cardId: string, action: string, dwellSeconds: number }) => {
      const response = await api.post(`/api/cards/${cardId}/interact`, { action, dwell_seconds: dwellSeconds });
      return response.data;
    },
  });
};

export const useCard = (id: string) => {
  return useQuery({
    queryKey: ['card', id],
    queryFn: async () => {
      const response = await api.get(`/api/cards/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCardSimplify = () => {
  return useMutation({
    mutationFn: async (cardId: string) => {
      const response = await api.post(`/api/cards/${cardId}/simplify`);
      return response.data;
    },
  });
};

export const useCardDeepDive = () => {
  return useMutation({
    mutationFn: async (cardId: string) => {
      const response = await api.post(`/api/cards/${cardId}/deepdive`);
      return response.data;
    },
  });
};

export const useCardConfidence = () => {
  return useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: number }) => {
      const response = await api.post(`/api/cards/${cardId}/confidence`, { rating });
      return response.data;
    },
  });
};

