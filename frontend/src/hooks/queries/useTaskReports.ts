import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, TaskReport, TaskReportsResponse, TaskReportQueryParams } from '@/types';

// Type for creating/submitting a task report
interface CreateTaskReportDto {
  tasks: string[];
  date?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all task reports (Admin/HR)
 * Returns full data structure with reports and pagination
 */
const fetchTaskReports = async (params?: TaskReportQueryParams): Promise<TaskReportsResponse> => {
  const endpoint = buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.ALL_REPORTS, params);
  const { data } = await axiosInstance.get<ApiResponse<TaskReportsResponse>>(endpoint);
  return data.data || { reports: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } };
};

export const useTaskReports = (params?: TaskReportQueryParams) => {
  return useQuery({
    queryKey: queryKeys.taskReports.list(params),
    queryFn: () => fetchTaskReports(params),
  });
};

/** Imperative, cache-backed fetch for one-off exports that loop over many employees. */
export const useFetchTaskReports = () => {
  const queryClient = useQueryClient();
  return (params: TaskReportQueryParams) =>
    queryClient.fetchQuery({
      queryKey: queryKeys.taskReports.list(params),
      queryFn: () => fetchTaskReports(params),
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
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.TASK_REPORTS.MY_REPORTS, params);
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
