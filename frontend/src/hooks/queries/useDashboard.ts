import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, DashboardSummary, TodayAlert, ActivityFeedItem } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get admin dashboard summary
 * Includes employee counts, attendance stats, pending requests
 */
export const useAdminDashboard = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.dashboard.adminSummary(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.ADMIN);
      return data.data;
    },
    // Refresh dashboard data more frequently
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get today's alerts
 * Birthdays, anniversaries, pending requests, etc.
 */
export const useTodayAlerts = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.alerts(),
    queryFn: async () => {
      // Backend returns { success, data: { alerts: Alert[], count: number } }
      // where Alert has { id, type, employee: { id, name, employeeId, department }, message, ... }
      interface BackendAlert {
        id: string;
        type: 'birthday' | 'milestone' | 'anniversary';
        employee: {
          id: unknown;
          name: string;
          employeeId: string;
          department?: string;
        };
        message: string;
        icon?: string;
        priority?: 'low' | 'medium' | 'high';
        milestone?: string;
        monthsCompleted?: number;
      }

      const { data } = await axiosInstance.get<ApiResponse<{ alerts: BackendAlert[]; count: number }>>(API_ENDPOINTS.DASHBOARD.ALERTS);
      const backendAlerts = data.data?.alerts || [];

      // Transform backend alerts to flatten employee data for frontend compatibility
      return backendAlerts.map((alert): TodayAlert => ({
        ...alert,
        employeeId: alert.employee?.employeeId || '',
        employeeName: alert.employee?.name || '',
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get activity feed
 */
export const useActivityFeed = () => {
  return useQuery({
    queryKey: queryKeys.activity.feed(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<ActivityFeedItem[]>>(API_ENDPOINTS.ACTIVITY.BASE);
      return data.data || [];
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
  });
};
