import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse, SalaryStructure, SalarySlip, SalarySlipStatus, SalaryStructureQueryParams, SalarySlipQueryParams, SalaryStatistics, TaxCalculation } from '@/types';

// ============================================================================
// SALARY STRUCTURES
// ============================================================================

/**
 * Get all salary structures (Admin/HR)
 */
export const useSalaryStructures = (params?: SalaryStructureQueryParams) => {
  return useQuery({
    queryKey: queryKeys.salaryStructures.list(params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SALARY_STRUCTURES.GET_ALL, params || {});
      const { data } = await axiosInstance.get<ApiResponse<SalaryStructure[]>>(endpoint);
      return data.data || [];
    },
  });
};

/**
 * Get salary structure by employee ID
 */
export const useSalaryStructure = (employeeId: string) => {
  return useQuery({
    queryKey: queryKeys.salaryStructures.byEmployee(employeeId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<SalaryStructure>>(
        API_ENDPOINTS.SALARY_STRUCTURES.GET_BY_EMPLOYEE(employeeId)
      );
      return data.data;
    },
    enabled: !!employeeId,
  });
};

/**
 * Get salary statistics
 */
export const useSalaryStatistics = () => {
  return useQuery({
    queryKey: queryKeys.salaryStructures.statistics(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<SalaryStatistics>>(API_ENDPOINTS.SALARY_STRUCTURES.STATISTICS);
      return data.data;
    },
  });
};

/**
 * Create or update salary structure
 */
export const useCreateOrUpdateSalaryStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (structureData: Partial<SalaryStructure>) => {
      const { data } = await axiosInstance.post<ApiResponse<SalaryStructure>>(
        API_ENDPOINTS.SALARY_STRUCTURES.CREATE_OR_UPDATE,
        structureData
      );
      return data.data;
    },
    onSuccess: (updatedStructure) => {
      // Invalidate salary structure lists
      queryClient.invalidateQueries({ queryKey: queryKeys.salaryStructures.all() });

      // Update specific structure in cache
      if (updatedStructure?.employeeId) {
        queryClient.setQueryData(
          queryKeys.salaryStructures.byEmployee(updatedStructure.employeeId),
          updatedStructure
        );
      }

      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: queryKeys.salaryStructures.statistics() });
    },
  });
};

/**
 * Delete salary structure
 */
export const useDeleteSalaryStructure = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { data } = await axiosInstance.delete<ApiResponse>(
        API_ENDPOINTS.SALARY_STRUCTURES.DELETE(employeeId)
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salaryStructures.all() });
    },
  });
};

// ============================================================================
// SALARY SLIPS
// ============================================================================

/**
 * Get all salary slips (Admin/HR)
 */
export const useSalarySlips = (params?: SalarySlipQueryParams) => {
  return useQuery({
    queryKey: queryKeys.salarySlips.list(params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SALARY_SLIPS.GET_ALL, params || {});
      const { data } = await axiosInstance.get<ApiResponse<SalarySlip[]>>(endpoint);
      return data.data || [];
    },
  });
};

/**
 * Get salary slips for specific employee
 */
export const useEmployeeSalarySlips = (employeeId: string, params?: SalarySlipQueryParams) => {
  return useQuery({
    queryKey: queryKeys.salarySlips.byEmployee(employeeId, params),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(
        API_ENDPOINTS.SALARY_SLIPS.GET_EMPLOYEE_SLIPS(employeeId),
        params || {}
      );
      const { data } = await axiosInstance.get<ApiResponse<SalarySlip[]>>(endpoint);
      return data.data || [];
    },
    enabled: !!employeeId,
  });
};

/**
 * Get specific salary slip
 */
export const useSalarySlip = (employeeId: string, month: number, year: number) => {
  return useQuery({
    queryKey: queryKeys.salarySlips.byEmployeeMonthYear(employeeId, month, year),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<SalarySlip>>(
        API_ENDPOINTS.SALARY_SLIPS.GET_BY_EMPLOYEE_MONTH_YEAR(employeeId, month, year)
      );
      return data.data;
    },
    enabled: !!employeeId && !!month && !!year,
  });
};

/**
 * Get tax calculation
 */
export const useTaxCalculation = (grossSalary: number, taxRegime: 'old' | 'new' = 'new') => {
  return useQuery({
    queryKey: queryKeys.salarySlips.taxCalculation(grossSalary, taxRegime),
    queryFn: async () => {
      const endpoint = buildEndpointWithQuery(API_ENDPOINTS.SALARY_SLIPS.TAX_CALCULATION, {
        grossSalary,
        taxRegime,
      });
      const { data } = await axiosInstance.get<ApiResponse<TaxCalculation>>(endpoint);
      return data.data;
    },
    enabled: grossSalary > 0,
  });
};

/**
 * Create or update salary slip
 */
export const useCreateOrUpdateSalarySlip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slipData: Partial<SalarySlip>) => {
      const { data } = await axiosInstance.post<ApiResponse<SalarySlip>>(
        API_ENDPOINTS.SALARY_SLIPS.CREATE_OR_UPDATE,
        slipData
      );
      return data.data;
    },
    onSuccess: (updatedSlip) => {
      // Invalidate salary slip lists
      queryClient.invalidateQueries({ queryKey: queryKeys.salarySlips.all() });

      // Update specific slip in cache
      if (updatedSlip?.employeeId && updatedSlip.month && updatedSlip.year) {
        queryClient.setQueryData(
          queryKeys.salarySlips.byEmployeeMonthYear(updatedSlip.employeeId, updatedSlip.month, updatedSlip.year),
          updatedSlip
        );
      }
    },
  });
};

/**
 * Update salary slip status (draft/published)
 */
export const useUpdateSalarySlipStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      month,
      year,
      status,
    }: {
      employeeId: string;
      month: number;
      year: number;
      status: SalarySlipStatus;
    }) => {
      const { data } = await axiosInstance.put<ApiResponse<SalarySlip>>(
        `${API_ENDPOINTS.SALARY_SLIPS.BASE}/${encodeURIComponent(employeeId)}/${month}/${year}/status`,
        { status }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salarySlips.all() });
    },
  });
};

/**
 * Bulk update salary slip status
 */
export const useBulkUpdateSalarySlipStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      salarySlips,
      status,
    }: {
      salarySlips: Array<{ employeeId: string; month: number; year: number }>;
      status: SalarySlipStatus;
    }) => {
      const { data } = await axiosInstance.put<ApiResponse>(
        `${API_ENDPOINTS.SALARY_SLIPS.BASE}/bulk/status`,
        { salarySlips, status }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salarySlips.all() });
    },
  });
};

/**
 * Delete salary slip
 */
export const useDeleteSalarySlip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, month, year }: { employeeId: string; month: number; year: number }) => {
      const { data } = await axiosInstance.delete<ApiResponse>(
        API_ENDPOINTS.SALARY_SLIPS.DELETE(employeeId, month, year)
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salarySlips.all() });
    },
  });
};
