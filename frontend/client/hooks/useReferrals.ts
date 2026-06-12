import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'sonner';

export const useMyReferrals = () => {
  return useQuery({
    queryKey: ['referrals', 'my'],
    queryFn: async () => {
      const response = await api.get('/api/referrals/my');
      return response.data;
    },
  });
};

export const useClaimReferralCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/api/referrals/claim', null, {
        params: { code }
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success(data.message || 'Referral code claimed successfully! +50 XP!');
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to claim referral code';
      toast.error(msg);
    }
  });
};
