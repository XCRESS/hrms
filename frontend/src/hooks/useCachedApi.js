import { useState, useEffect, useCallback } from 'react';
import { useDataCache, CACHE_KEYS } from '../contexts/DataCacheContext';
import apiClient from '../service/apiClient';

// Custom hook for cached API calls
export const useCachedApi = (cacheKey, apiCall, dependencies = [], options = {}) => {
  const { 
    getCachedData, 
    setCachedData, 
    setCacheLoading,
    invalidateCache 
  } = useDataCache();
  
  const {
    enabled = true,
    refetchOnMount = false,
    staleTime = 5 * 60 * 1000, // 5 minutes default
    refetchInterval = null
  } = options;

  const [state, setState] = useState(() => {
    const cached = getCachedData(cacheKey);
    return cached || { data: null, loading: false, error: null };
  });

  // Fetch function
  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first unless forcing refresh
    if (!force) {
      const cached = getCachedData(cacheKey);
      if (cached && !cached.loading) {
        setState(cached);
        return cached.data;
      }
    }

    // Set loading state
    setState(prev => ({ ...prev, loading: true, error: null }));
    setCacheLoading(cacheKey, true);

    try {
      const result = await apiCall();
      const newState = { data: result, loading: false, error: null };
      
      setState(newState);
      setCachedData(cacheKey, result);
      
      return result;
    } catch (error) {
      const errorState = { data: null, loading: false, error: error.message };
      setState(errorState);
      setCacheLoading(cacheKey, false);
      throw error;
    }
  }, [enabled, cacheKey, apiCall, getCachedData, setCachedData, setCacheLoading]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Invalidate and refetch
  const invalidateAndRefetch = useCallback(() => {
    invalidateCache(cacheKey);
    return fetchData(true);
  }, [invalidateCache, cacheKey, fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData(refetchOnMount);
    }
  }, [fetchData, enabled, refetchOnMount, ...dependencies]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(() => {
        fetchData();
      }, refetchInterval);
      
      return () => clearInterval(interval);
    }
  }, [refetchInterval, enabled, fetchData]);

  return {
    ...state,
    refetch,
    invalidateAndRefetch,
    isStale: state.timestamp && Date.now() - state.timestamp > staleTime
  };
};

// Specific hooks for common API calls
export const useDashboardData = (userId, isAdmin) => {
  const { getCachedData, useCachedApi } = useDataCache();
  
  // Multi-key cache strategy for dashboard
  const cacheKeys = {
    attendance: CACHE_KEYS.DASHBOARD_ATTENDANCE,
    leaveRequests: CACHE_KEYS.DASHBOARD_LEAVE_REQUESTS,
    helpInquiries: CACHE_KEYS.DASHBOARD_HELP_INQUIRIES,
    regularizations: CACHE_KEYS.DASHBOARD_REGULARIZATIONS,
    announcements: CACHE_KEYS.DASHBOARD_ANNOUNCEMENTS,
    holidays: CACHE_KEYS.DASHBOARD_HOLIDAYS,
    ...(isAdmin && { adminSummary: CACHE_KEYS.DASHBOARD_ADMIN_SUMMARY })
  };

  const getCachedDashboardData = useCallback(() => {
    const dashboardData = {};
    Object.entries(cacheKeys).forEach(([key, cacheKey]) => {
      const cached = getCachedData(cacheKey);
      if (cached) {
        dashboardData[key] = cached.data;
      }
    });
    return dashboardData;
  }, [getCachedData, cacheKeys]);

  return {
    cacheKeys,
    getCachedDashboardData
  };
};

// Hook for employee attendance with month-based caching
export const useEmployeeAttendance = (employeeId, selectedMonth) => {
  const monthKey = selectedMonth.toISOString().slice(0, 7); // YYYY-MM format
  const cacheKey = CACHE_KEYS.EMPLOYEE_ATTENDANCE(employeeId, monthKey);
  
  return useCachedApi(
    cacheKey,
    async () => {
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];
      
      const response = await apiClient.getEmployeeAttendanceWithAbsents({
        employeeId,
        startDate,
        endDate
      });
      
      return response.success ? response.data : null;
    },
    [employeeId, monthKey],
    { refetchOnMount: false }
  );
};

export default useCachedApi;