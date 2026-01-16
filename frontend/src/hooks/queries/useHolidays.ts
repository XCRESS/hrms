import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, Holiday, CreateHolidayDto, UpdateHolidayDto } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all holidays
 */
export const useHolidays = () => {
  return useQuery({
    queryKey: queryKeys.holidays.all(),
    queryFn: async () => {
      // Backend returns { success, holidays } directly
      const { data } = await axiosInstance.get<{ success: boolean; holidays: Holiday[] }>(API_ENDPOINTS.HOLIDAYS.BASE);
      return data.holidays || [];
    },
  });
};

/**
 * Get single holiday by ID
 */
export const useHoliday = (id: string) => {
  return useQuery({
    queryKey: queryKeys.holidays.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<Holiday>>(
        `${API_ENDPOINTS.HOLIDAYS.BASE}/${encodeURIComponent(id)}`
      );
      return data.data;
    },
    enabled: !!id,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new holiday
 */
export const useCreateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidayData: CreateHolidayDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Holiday>>(
        API_ENDPOINTS.HOLIDAYS.CREATE,
        holidayData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all() });
    },
  });
};

/**
 * Update holiday
 */
export const useUpdateHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateHolidayDto & { id: string }) => {
      const { data } = await axiosInstance.put<ApiResponse<Holiday>>(
        API_ENDPOINTS.HOLIDAYS.UPDATE(id),
        updateData
      );
      return data.data;
    },
    onSuccess: (updatedHoliday) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all() });

      if (updatedHoliday) {
        queryClient.setQueryData(queryKeys.holidays.detail(updatedHoliday._id), updatedHoliday);
      }
    },
  });
};

/**
 * Delete holiday
 */
export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holidayId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(API_ENDPOINTS.HOLIDAYS.DELETE(holidayId));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all() });
    },
  });
};
