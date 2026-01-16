import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, OfficeLocation, CreateOfficeLocationDto, UpdateOfficeLocationDto, OfficeLocationQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all office locations with optional filtering
 */
export const useOfficeLocations = (params?: OfficeLocationQueryParams) => {
  return useQuery({
    queryKey: queryKeys.officeLocations.list(params),
    queryFn: async () => {
      // Backend returns { success, data: { locations } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.OFFICE_LOCATIONS.BASE, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ locations: OfficeLocation[] }>>(endpoint);
      return data.data?.locations || [];
    },
  });
};

/**
 * Get single office location by ID
 */
export const useOfficeLocation = (id: string) => {
  return useQuery({
    queryKey: queryKeys.officeLocations.detail(id),
    queryFn: async () => {
      // Backend returns { success, data: { location } } via formatResponse
      const { data } = await axiosInstance.get<ApiResponse<{ location: OfficeLocation }>>(
        `${API_ENDPOINTS.OFFICE_LOCATIONS.BASE}/${encodeURIComponent(id)}`
      );
      return data.data?.location;
    },
    enabled: !!id,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create office location (Admin/HR)
 */
export const useCreateOfficeLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData: CreateOfficeLocationDto) => {
      // Backend returns { success, data: { location } } via formatResponse
      const { data } = await axiosInstance.post<ApiResponse<{ location: OfficeLocation }>>(
        API_ENDPOINTS.OFFICE_LOCATIONS.CREATE,
        locationData
      );
      return data.data?.location;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.officeLocations.all() });
    },
  });
};

/**
 * Update office location (Admin/HR)
 */
export const useUpdateOfficeLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateOfficeLocationDto & { id: string }) => {
      // Backend returns { success, data: { location } } via formatResponse
      const { data } = await axiosInstance.put<ApiResponse<{ location: OfficeLocation }>>(
        API_ENDPOINTS.OFFICE_LOCATIONS.UPDATE(id),
        updateData
      );
      return data.data?.location;
    },
    onSuccess: (updatedLocation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.officeLocations.all() });

      if (updatedLocation) {
        queryClient.setQueryData(
          queryKeys.officeLocations.detail(updatedLocation._id),
          updatedLocation
        );
      }
    },
  });
};

/**
 * Delete office location (Admin/HR)
 */
export const useDeleteOfficeLocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(
        API_ENDPOINTS.OFFICE_LOCATIONS.DELETE(locationId)
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.officeLocations.all() });
    },
  });
};
