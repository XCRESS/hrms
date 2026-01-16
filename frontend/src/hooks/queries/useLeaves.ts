import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, Leave, LeaveRequestDto, LeaveStatus } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get my leaves (Employee)
 */
export const useMyLeaves = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.leaves.myLeaves(),
    queryFn: async () => {
      // Backend returns { success, leaves: Leave[] }
      const { data } = await axiosInstance.get<{ success: boolean; leaves: Leave[] }>(API_ENDPOINTS.LEAVES.MY_LEAVES);
      return data.leaves || [];
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get all leaves (Admin/HR)
 */
export const useAllLeaves = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.leaves.allLeaves(),
    queryFn: async () => {
      // Backend returns { success, leaves: Leave[] }
      const { data } = await axiosInstance.get<{ success: boolean; leaves: Leave[] }>(API_ENDPOINTS.LEAVES.ALL_LEAVES);
      return data.leaves || [];
    },
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Request leave
 */
export const useRequestLeave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaveData: LeaveRequestDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Leave>>(API_ENDPOINTS.LEAVES.REQUEST, leaveData);
      return data.data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async (leaveData) => {
      const myLeavesKey = queryKeys.leaves.myLeaves();

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: myLeavesKey });

      // Snapshot previous value for rollback
      const previousLeaves = queryClient.getQueryData(myLeavesKey);

      // Optimistically add new leave
      queryClient.setQueryData(myLeavesKey, (old: Leave[] = []) => [
        {
          _id: 'optimistic-' + Date.now(),
          userId: 'current-user',
          employeeId: 'current-employee',
          ...leaveData,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Leave,
        ...old,
      ]);

      return { previousLeaves, myLeavesKey };
    },
    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousLeaves) {
        queryClient.setQueryData(context.myLeavesKey, context.previousLeaves);
      }
    },
    // Refetch to ensure consistency
    onSettled: () => {
      // Invalidate leave queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });

      // Invalidate dashboard (shows pending leaves count)
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};

/**
 * Update leave status (Admin/HR)
 */
export const useUpdateLeaveStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leaveId, status }: { leaveId: string; status: LeaveStatus }) => {
      const { data } = await axiosInstance.put<ApiResponse<Leave>>(
        API_ENDPOINTS.LEAVES.UPDATE_STATUS(leaveId),
        { status }
      );
      return data.data;
    },
    onSuccess: () => {
      // Invalidate all leave queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leaves.all() });

      // Invalidate attendance (approved leaves affect attendance)
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });

      // Invalidate dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
};
