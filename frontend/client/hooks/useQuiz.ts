import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';

export const useQuizFeed = () => {
  return useQuery({
    queryKey: ['quiz', 'feed'],
    queryFn: async () => {
      const response = await api.get(`/api/quiz/feed`);
      return response.data;
    },
  });
};

export const useSubmitQuiz = () => {
  return useMutation({
    mutationFn: async ({ cardId, optionId }: { cardId: string, optionId: string }) => {
      const response = await api.post(`/api/quiz/${cardId}/answer`, { selected_option_id: optionId });
      return response.data;
    },
  });
};
