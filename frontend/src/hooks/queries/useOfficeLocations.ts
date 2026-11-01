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
export const useOfficeLocations = (options?: OfficeLocationQueryParams & { enabled?: boolean }) => {
  const { enabled, ...params } = options || {};
  return useQuery({
    queryKey: queryKeys.officeLocations.list(params),
    queryFn: async () => {
      // Backend returns { success, data: { locations } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.OFFICE_LOCATIONS.BASE, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ locations: OfficeLocation[] }>>(endpoint);
      return data.data?.locations || [];
    },
    enabled: enabled ?? true,
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

export interface GeofenceCheck {
  enforced: boolean;
  canRequestWFH: boolean;
  officesConfigured: boolean;
  inside: boolean;
  accuracyTooLow: boolean;
  maxAccuracy: number;
  office: { id: string; name: string; radius: number } | null;
  distance: number | null;
  tolerance: number | null;
}

/** Same rule check-in applies, evaluated server-side for a fix. */
export const useGeofenceCheck = (fix: { latitude: number; longitude: number; accuracy: number } | undefined) => {
  // ~10m grid: GPS jitter between polls shouldn't cost a request each time.
  const lat = fix ? Number(fix.latitude.toFixed(4)) : 0;
  const lng = fix ? Number(fix.longitude.toFixed(4)) : 0;
  const accuracy = fix ? Math.round(fix.accuracy / 5) * 5 : 0;
  return useQuery({
    queryKey: queryKeys.officeLocations.geofenceCheck(lat, lng, accuracy),
    queryFn: async () => {
      const { data } = await axiosInstance.post<ApiResponse<GeofenceCheck>>(
        API_ENDPOINTS.OFFICE_LOCATIONS.GEOFENCE_CHECK,
        { latitude: fix?.latitude, longitude: fix?.longitude, accuracy: fix?.accuracy }
      );
      return data.data;
    },
    enabled: !!fix,
    staleTime: 60_000,
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
    mutationFn: async ({ locationId, updates }: { locationId: string; updates: UpdateOfficeLocationDto }) => {
      // Backend returns { success, data: { location } } via formatResponse
      const { data } = await axiosInstance.put<ApiResponse<{ location: OfficeLocation }>>(
        API_ENDPOINTS.OFFICE_LOCATIONS.UPDATE(locationId),
        updates
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
