import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, TaskReport, CreateTaskReportDto, TaskReportQueryParams } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all task reports (Admin/HR)
 */
export const useTaskReports = (params?: TaskReportQueryParams) => {
  return useQuery({
    queryKey: queryKeys.taskReports.list(params),
    queryFn: async () => {
      // Backend returns { success, data: { reports, pagination } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.ALL_REPORTS, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ reports: TaskReport[] }>>(endpoint);
      return data.data?.reports || [];
    },
  });
};

/**
 * Get my task reports (Employee)
 * Returns full data structure with reports and pagination
 */
export const useMyTaskReports = (params?: TaskReportQueryParams) => {
  return useQuery({
    queryKey: queryKeys.taskReports.my(params),
    queryFn: async () => {
      // Backend returns { success, data: { reports, pagination } } via formatResponse
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.MY_REPORTS, params || {});
      const { data } = await axiosInstance.get<ApiResponse<{ reports: TaskReport[]; pagination?: { total: number; totalPages: number } }>>(endpoint);
      return data.data || { reports: [], pagination: { total: 0, totalPages: 0 } };
    },
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Submit task report
 * Note: This is typically done automatically during checkout,
 * but can also be submitted/updated manually
 */
export const useSubmitTaskReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportData: CreateTaskReportDto) => {
      // Backend returns { success, data: { taskReport } } via formatResponse
      const { data } = await axiosInstance.post<ApiResponse<{ taskReport: TaskReport }>>(
        API_ENDPOINTS.TASK_REPORTS.SUBMIT,
        reportData
      );
      return data.data?.taskReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskReports.all() });

      // Invalidate attendance (task reports are linked to attendance records)
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all() });
    },
  });
};
