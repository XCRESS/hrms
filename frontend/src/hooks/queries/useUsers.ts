import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, User, CreateUserDto, UpdateUserDto, UserRole } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all users (Admin only)
 */
export const useUsers = () => {
  return useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: async () => {
      // Backend returns { users: User[] } directly (no ApiResponse wrapper)
      const { data } = await axiosInstance.get<{ users: User[] }>(API_ENDPOINTS.USERS.GET_ALL);
      return data.users || [];
    },
  });
};

/**
 * Get single user by ID
 */
export const useUser = (id: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<User>>(API_ENDPOINTS.USERS.GET_BY_ID(id));
      return data.data;
    },
    enabled: !!id,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new user (Admin only)
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserDto) => {
      const { data } = await axiosInstance.post<ApiResponse<User>>(API_ENDPOINTS.USERS.CREATE, userData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
};

/**
 * Update user (Admin only)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateUserDto & { id: string }) => {
      const { data } = await axiosInstance.put<ApiResponse<User>>(
        API_ENDPOINTS.USERS.UPDATE(id),
        updateData
      );
      return data.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });

      if (updatedUser) {
        queryClient.setQueryData(queryKeys.users.detail(updatedUser._id), updatedUser);
      }
    },
  });
};

/**
 * Update user role (Admin only)
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data } = await axiosInstance.put<ApiResponse<User>>(
        API_ENDPOINTS.USERS.UPDATE_ROLE(userId),
        { role }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
};

/**
 * Delete user (Admin only)
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(API_ENDPOINTS.USERS.DELETE(userId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
    },
  });
};
