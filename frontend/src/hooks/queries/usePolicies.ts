import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, Policy, CreatePolicyDto, UpdatePolicyDto, PolicyQueryParams, PolicyStatus } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

interface PoliciesResponse {
  policies: Policy[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Get all policies with optional filtering
 */
export const usePolicies = (params?: PolicyQueryParams) => {
  return useQuery({
    queryKey: queryKeys.policies.list(params),
    queryFn: async () => {
      // Backend returns { success, data: { policies, pagination } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.POLICIES.BASE, (params || {}) as Record<string, string | number | boolean | null | undefined>);
      const { data } = await axiosInstance.get<ApiResponse<PoliciesResponse>>(endpoint);
      return data.data || { policies: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 10 } };
    },
  });
};

/**
 * Get active policies only - accessible to all authenticated users
 */
export const useActivePolicies = () => {
  return useQuery({
    queryKey: queryKeys.policies.active(),
    queryFn: async () => {
      // Use the dedicated /policies/active endpoint which is accessible to all authenticated users
      // Backend returns { success, data: Policy[] } - array directly in data field
      const { data } = await axiosInstance.get<ApiResponse<Policy[]>>(API_ENDPOINTS.POLICIES.GET_ACTIVE);
      return data.data || [];
    },
  });
};

/**
 * Get single policy by ID
 */
export const usePolicy = (id: string) => {
  return useQuery({
    queryKey: queryKeys.policies.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<Policy>>(API_ENDPOINTS.POLICIES.GET_BY_ID(id));
      return data.data;
    },
    enabled: !!id,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new policy (Admin/HR)
 */
export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyData: CreatePolicyDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Policy>>(
        API_ENDPOINTS.POLICIES.CREATE,
        policyData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all() });
    },
  });
};

/**
 * Update policy (Admin/HR)
 */
export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdatePolicyDto & { id: string }) => {
      const { data } = await axiosInstance.put<ApiResponse<Policy>>(
        API_ENDPOINTS.POLICIES.UPDATE(id),
        updateData
      );
      return data.data;
    },
    onSuccess: (updatedPolicy) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all() });

      if (updatedPolicy) {
        queryClient.setQueryData(queryKeys.policies.detail(updatedPolicy._id), updatedPolicy);
      }
    },
  });
};

/**
 * Update policy status (Admin/HR)
 */
export const useUpdatePolicyStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, status }: { policyId: string; status: PolicyStatus }) => {
      const { data } = await axiosInstance.put<ApiResponse<Policy>>(
        API_ENDPOINTS.POLICIES.UPDATE_STATUS(policyId),
        { status }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all() });
    },
  });
};

/**
 * Delete policy (Admin/HR) - Soft delete
 */
export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(API_ENDPOINTS.POLICIES.DELETE(policyId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all() });
    },
  });
};

/**
 * Permanently delete policy (Admin/HR) - Hard delete from database
 */
export const usePermanentDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(`${API_ENDPOINTS.POLICIES.DELETE(policyId)}/permanent`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.policies.all() });
    },
  });
};
