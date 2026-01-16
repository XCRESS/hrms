import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, WFHRequest, CreateWFHRequestDto, WFHRequestQueryParams, WFHStatus } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all WFH requests (Admin/HR)
 */
export const useWFHRequests = (params?: WFHRequestQueryParams) => {
  return useQuery({
    queryKey: queryKeys.wfh.list(params),
    queryFn: async () => {
      // Backend returns { success, data: { requests } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.WFH.BASE, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ requests: WFHRequest[] }>>(endpoint);
      return data.data?.requests || [];
    },
  });
};

/**
 * Get my WFH requests (Employee)
 */
export const useMyWFHRequests = () => {
  return useQuery({
    queryKey: queryKeys.wfh.my(),
    queryFn: async () => {
      // Backend returns { success, data: { requests } } via formatResponse
      const { data } = await axiosInstance.get<ApiResponse<{ requests: WFHRequest[] }>>(API_ENDPOINTS.WFH.MY);
      return data.data?.requests || [];
    },
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Request WFH
 */
export const useRequestWFH = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wfhData: CreateWFHRequestDto) => {
      const { data } = await axiosInstance.post<ApiResponse<WFHRequest>>(API_ENDPOINTS.WFH.BASE, wfhData);
      return data.data;
    },
    onSuccess: () => {
      // Invalidate WFH queries
      queryClient.invalidateQueries({ queryKey: queryKeys.wfh.all() });

      // Invalidate dashboard (shows pending WFH count)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Update WFH request status (Admin/HR)
 */
export const useUpdateWFHStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status, reviewComment }: { requestId: string; status: WFHStatus; reviewComment?: string }) => {
      const { data } = await axiosInstance.patch<ApiResponse<WFHRequest>>(
        API_ENDPOINTS.WFH.REVIEW(requestId),
        { status, reviewComment }
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all WFH queries
      queryClient.invalidateQueries({ queryKey: queryKeys.wfh.all() });

      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
