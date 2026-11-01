import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, FestiveFinishResult, FestiveGameKey, FestiveLeaderboard } from '@/types';

interface FestiveGameRef {
  instanceId: string;
  game: FestiveGameKey;
}

export const useFestiveLeaderboard = (instanceId: string, game: FestiveGameKey, limit = 5) => {
  return useQuery({
    throwOnError: false,
    queryKey: queryKeys.festive.leaderboard(instanceId, game, limit),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<FestiveLeaderboard>>(
        API_ENDPOINTS.FESTIVE.LEADERBOARD(instanceId, game),
        { params: { limit } }
      );
      return data.data ?? { leaderboard: [], me: null };
    },
  });
};

/** token is null for accounts without a linked employee: they can play, but nothing is saved. */
export const useStartFestiveGame = () => {
  return useMutation({
    throwOnError: false,
    mutationFn: async ({ instanceId, game }: FestiveGameRef) => {
      const { data } = await axiosInstance.post<ApiResponse<{ token: string | null }>>(
        API_ENDPOINTS.FESTIVE.START(instanceId, game)
      );
      return { token: data.data?.token ?? null };
    },
  });
};

export const useFinishFestiveGame = () => {
  const queryClient = useQueryClient();
  return useMutation({
    throwOnError: false,
    mutationFn: async ({ instanceId, game, token, result }: FestiveGameRef & { token: string; result: unknown }) => {
      const { data } = await axiosInstance.post<ApiResponse<FestiveFinishResult>>(
        API_ENDPOINTS.FESTIVE.FINISH(instanceId, game),
        { token, result }
      );
      return data.data as FestiveFinishResult;
    },
    onSuccess: (_result, { instanceId, game }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.festive.leaderboardFor(instanceId, game) });
    },
  });
};
