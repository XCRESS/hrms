import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get notification status
 */
export const useNotificationStatus = () => {
  return useQuery({
    queryKey: queryKeys.notifications.status(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ subscribed: boolean }>>(
        API_ENDPOINTS.NOTIFICATIONS.STATUS
      );
      return data.data;
    },
  });
};

/**
 * Get VAPID public key for push notifications
 */
export const useVapidKey = () => {
  return useQuery({
    queryKey: queryKeys.notifications.vapidKey(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ publicKey: string }>>(
        API_ENDPOINTS.NOTIFICATIONS.VAPID_KEY
      );
      return data.data;
    },
    staleTime: Infinity, // VAPID key doesn't change
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Subscribe to push notifications
 */
export const useSubscribeNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      const { data } = await axiosInstance.post<ApiResponse>(
        API_ENDPOINTS.NOTIFICATIONS.SUBSCRIBE,
        { subscription }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.status() });
    },
  });
};

/**
 * Unsubscribe from push notifications
 */
export const useUnsubscribeNotifications = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (endpoint: string) => {
      const { data } = await axiosInstance.post<ApiResponse>(API_ENDPOINTS.NOTIFICATIONS.UNSUBSCRIBE, {
        endpoint,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.status() });
    },
  });
};

/**
 * Test notification (Admin/HR only).
 * `type` must be one of: hr, all, milestone, holiday — matching testNotificationSchema.
 */
export type NotificationTestType = 'hr' | 'all' | 'milestone' | 'holiday';

/**
 * The test route returns `details` at the top level of the envelope,
 * alongside success/message - not nested under `data`.
 */
export interface TestNotificationResponse extends ApiResponse {
  details?: {
    emailReady?: boolean;
    pushReady?: boolean;
  };
}

export const useTestNotification = () => {
  return useMutation({
    mutationFn: async (type: NotificationTestType) => {
      const { data } = await axiosInstance.post<TestNotificationResponse>(
        API_ENDPOINTS.NOTIFICATIONS.TEST,
        { type }
      );
      return data;
    },
  });
};
