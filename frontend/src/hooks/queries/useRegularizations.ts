import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, RegularizationRequest, RegularizationRequestDto, RegularizationStatus } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all regularization requests (Admin/HR)
 */
export const useRegularizationRequests = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.regularizations.allRequests(),
    queryFn: async () => {
      // Backend returns { success, regs: RegularizationRequest[] }
      const { data } = await axiosInstance.get<{ success: boolean; regs: RegularizationRequest[] }>(
        API_ENDPOINTS.REGULARIZATIONS.ALL_REGULARIZATIONS
      );
      return data.regs || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get my regularization requests (Employee)
 */
export const useMyRegularizations = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.regularizations.my(),
    queryFn: async () => {
      // Backend returns { success, regs: RegularizationRequest[] }
      const { data } = await axiosInstance.get<{ success: boolean; regs: RegularizationRequest[] }>(
        API_ENDPOINTS.REGULARIZATIONS.MY_REGULARIZATIONS
      );
      return data.regs || [];
    },
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Request regularization
 */
export const useRequestRegularization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (regularizationData: RegularizationRequestDto) => {
      const { data } = await axiosInstance.post<ApiResponse<RegularizationRequest>>(
        API_ENDPOINTS.REGULARIZATIONS.REQUEST,
        regularizationData
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate regularization queries
      queryClient.invalidateQueries({ queryKey: queryKeys.regularizations.all() });

      // Invalidate dashboard (shows pending regularizations count)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Review regularization request (Admin/HR)
 */
export const useReviewRegularization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: RegularizationStatus }) => {
      const { data } = await axiosInstance.put<ApiResponse<RegularizationRequest>>(
        API_ENDPOINTS.REGULARIZATIONS.REVIEW(requestId),
        { status }
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all regularization queries
      queryClient.invalidateQueries({ queryKey: queryKeys.regularizations.all() });

      // Invalidate attendance (approved regularizations affect attendance)
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });

      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
