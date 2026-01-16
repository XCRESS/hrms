import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, GlobalSettings, DepartmentSettings, EffectiveSettings, DepartmentStats } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get global settings
 */
export const useGlobalSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings.global(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<GlobalSettings>>(API_ENDPOINTS.SETTINGS.GLOBAL);
      return data.data;
    },
  });
};

/**
 * Get department settings
 */
export const useDepartmentSettings = (department: string) => {
  return useQuery({
    queryKey: queryKeys.settings.department(department),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<DepartmentSettings>>(
        API_ENDPOINTS.SETTINGS.DEPARTMENT(department)
      );
      return data.data;
    },
    enabled: !!department,
  });
};

/**
 * Get effective settings (global + department overrides)
 */
export const useEffectiveSettings = (department?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.settings.effective(department),
    queryFn: async () => {
      const params = department ? { department } : {};
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SETTINGS.EFFECTIVE, params);
      const { data } = await axiosInstance.get<ApiResponse<EffectiveSettings>>(endpoint);
      return data.data;
    },
    enabled: options?.enabled ?? true,
  });
};

/**
 * Get list of departments
 */
export const useDepartments = () => {
  return useQuery({
    queryKey: queryKeys.settings.departments(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<string[]>>(API_ENDPOINTS.SETTINGS.DEPARTMENTS);
      return data.data || [];
    },
  });
};

/**
 * Get department statistics
 */
export const useDepartmentStats = () => {
  return useQuery({
    queryKey: queryKeys.settings.departmentStats(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<DepartmentStats[]>>(API_ENDPOINTS.SETTINGS.DEPARTMENT_STATS);
      return data.data || [];
    },
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update global settings
 */
export const useUpdateGlobalSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: Partial<GlobalSettings>) => {
      const { data } = await axiosInstance.put<ApiResponse<GlobalSettings>>(
        API_ENDPOINTS.SETTINGS.GLOBAL,
        settingsData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });
};

/**
 * Update department settings
 */
export const useUpdateDepartmentSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ department, settingsData }: { department: string; settingsData: Partial<DepartmentSettings> }) => {
      const { data } = await axiosInstance.put<ApiResponse<DepartmentSettings>>(
        API_ENDPOINTS.SETTINGS.DEPARTMENT(department),
        settingsData
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });
};

/**
 * Add new department
 */
export const useAddDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentData: { name: string; description?: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>(API_ENDPOINTS.SETTINGS.ADD_DEPARTMENT, departmentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departmentStats() });
    },
  });
};

/**
 * Rename department
 */
export const useRenameDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string; newName: string }) => {
      const { data } = await axiosInstance.put<ApiResponse>(
        API_ENDPOINTS.SETTINGS.RENAME_DEPARTMENT(oldName),
        { newName }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};

/**
 * Delete department
 */
export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(API_ENDPOINTS.SETTINGS.DELETE_DEPARTMENT(name));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
    },
  });
};

/**
 * Get available employees for a department
 */
export const useAvailableEmployees = (departmentName?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...queryKeys.settings.departments(), 'employees', departmentName],
    queryFn: async () => {
      if (!departmentName) return null;
      const { data } = await axiosInstance.get<ApiResponse>(
        `/settings/departments/${encodeURIComponent(departmentName)}/employees`
      );
      return data.data;
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!departmentName,
  });
};

/**
 * Assign employee to department
 */
export const useAssignEmployeeToDepartment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentName, employeeId }: { departmentName: string; employeeId: string }) => {
      const { data } = await axiosInstance.post<ApiResponse>(
        `/settings/departments/${encodeURIComponent(departmentName)}/employees`,
        { employeeId }
      );
      return data;
    },
    onSuccess: () => {
      // Invalidate department queries and employee queries
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.departments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all() });
    },
  });
};
