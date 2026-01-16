import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../lib/axios';
import { queryKeys } from '../../lib/queryKeys';
import type {
  ApiResponse,
  TetrisLeaderboardEntry,
  TetrisLeaderboardParams,
  SaveTetrisScoreData,
  SaveTetrisScoreResponse,
} from '../../types';

// ============================================================================
// API FUNCTIONS
// ============================================================================

const getTetrisLeaderboard = async (
  params: TetrisLeaderboardParams = { limit: 10, period: 'all-time' }
): Promise<{ leaderboard: TetrisLeaderboardEntry[] }> => {
  const queryString = new URLSearchParams(
    params as Record<string, string>
  ).toString();
  const { data } = await axiosInstance.get<
    ApiResponse<{ leaderboard: TetrisLeaderboardEntry[] }>
  >(`/tetris/leaderboard?${queryString}`);
  return data.data || { leaderboard: [] };
};

const saveTetrisScore = async (
  scoreData: SaveTetrisScoreData
): Promise<SaveTetrisScoreResponse> => {
  const { data } = await axiosInstance.post<
    ApiResponse<SaveTetrisScoreResponse>
  >('/tetris/scores', scoreData);
  return data.data as SaveTetrisScoreResponse;
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch Tetris leaderboard
 * @param params - Leaderboard query parameters (limit, period)
 * @returns Query result with leaderboard data
 */
export const useTetrisLeaderboard = (
  params: TetrisLeaderboardParams = { limit: 5, period: 'all-time' }
) => {
  return useQuery({
    queryKey: queryKeys.giftGame.leaderboard(params),
    queryFn: () => getTetrisLeaderboard(params),
  });
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Save a Tetris score
 * @returns Mutation function to save a score
 */
export const useSaveTetrisScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveTetrisScore,
    onSuccess: () => {
      // Invalidate leaderboard queries to refresh rankings
      queryClient.invalidateQueries({
        queryKey: queryKeys.giftGame.all(),
      });
    },
  });
};
