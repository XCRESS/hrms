import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { AccessGrant, AccessPermission, ApiResponse, MyAccess, TeamMember, UpsertAccessGrantDto } from '@/types';

/** Who the current user can act on, per permission. */
export const useMyAccess = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.access.me(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<MyAccess>>(API_ENDPOINTS.ACCESS.ME);
      return data.data ?? null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
};

/** Active employees the current user can see for one permission. */
export const useTeamMembers = (permission: AccessPermission, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.access.team(permission),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ACCESS.TEAM, { permission });
      const { data } = await axiosInstance.get<ApiResponse<{ employees: TeamMember[] }>>(endpoint);
      return data.data?.employees ?? [];
    },
    enabled: options?.enabled ?? true,
  });
};

export const useAccessGrants = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.access.grants(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ grants: AccessGrant[] }>>(API_ENDPOINTS.ACCESS.GRANTS);
      return data.data?.grants ?? [];
    },
    enabled: options?.enabled ?? true,
  });
};

const invalidateAccess = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.access.all() });
  queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
};

export const useUpsertAccessGrant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (grant: UpsertAccessGrantDto) => {
      const { data } = await axiosInstance.put<ApiResponse<unknown>>(API_ENDPOINTS.ACCESS.GRANTS, grant);
      return data;
    },
    onSuccess: () => invalidateAccess(queryClient),
  });
};

export const useDeleteAccessGrant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete<ApiResponse<null>>(API_ENDPOINTS.ACCESS.GRANT(id));
      return data;
    },
    onSuccess: () => invalidateAccess(queryClient),
  });
};

export const useSetEmployeeSupervisor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, supervisorId }: { employeeId: string; supervisorId: string | null }) => {
      const { data } = await axiosInstance.put<ApiResponse<unknown>>(
        API_ENDPOINTS.EMPLOYEES.SET_SUPERVISOR(employeeId),
        { supervisorId }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
      invalidateAccess(queryClient);
    },
  });
};
