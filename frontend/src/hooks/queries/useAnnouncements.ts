import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, Announcement, CreateAnnouncementDto, UpdateAnnouncementDto, AnnouncementQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all announcements with optional filtering
 */
export const useAnnouncements = (params?: AnnouncementQueryParams) => {
  return useQuery({
    queryKey: queryKeys.announcements.list(params),
    queryFn: async () => {
      // Backend returns { success, announcements } directly
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.ANNOUNCEMENTS.BASE, params || {});
      const { data } = await axiosInstance.get<{ success: boolean; announcements: Announcement[] }>(endpoint);
      return data.announcements || [];
    },
  });
};

/**
 * Get single announcement by ID
 */
export const useAnnouncement = (id: string) => {
  return useQuery({
    queryKey: queryKeys.announcements.detail(id),
    queryFn: async () => {
      // Backend returns { success, announcement } directly
      const { data } = await axiosInstance.get<{ success: boolean; announcement: Announcement }>(
        API_ENDPOINTS.ANNOUNCEMENTS.GET_BY_ID(id)
      );
      return data.announcement;
    },
    enabled: !!id,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new announcement
 */
export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementData: CreateAnnouncementDto) => {
      const { data } = await axiosInstance.post<ApiResponse<Announcement>>(
        API_ENDPOINTS.ANNOUNCEMENTS.CREATE,
        announcementData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
    },
  });
};

/**
 * Update announcement
 */
export const useUpdateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateAnnouncementDto & { id: string }) => {
      const { data } = await axiosInstance.put<ApiResponse<Announcement>>(
        API_ENDPOINTS.ANNOUNCEMENTS.UPDATE(id),
        updateData
      );
      return data.data;
    },
    onSuccess: (updatedAnnouncement) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });

      if (updatedAnnouncement) {
        queryClient.setQueryData(
          queryKeys.announcements.detail(updatedAnnouncement._id),
          updatedAnnouncement
        );
      }
    },
  });
};

/**
 * Delete announcement
 */
export const useDeleteAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcementId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(
        API_ENDPOINTS.ANNOUNCEMENTS.DELETE(announcementId)
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all() });
    },
  });
};
