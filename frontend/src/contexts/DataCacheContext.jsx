import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const DataCacheContext = createContext();

// Cache action types
const CACHE_ACTIONS = {
  SET_DATA: 'SET_DATA',
  INVALIDATE_DATA: 'INVALIDATE_DATA',
  CLEAR_CACHE: 'CLEAR_CACHE',
  SET_LOADING: 'SET_LOADING'
};

// Cache reducer
const cacheReducer = (state, action) => {
  switch (action.type) {
    case CACHE_ACTIONS.SET_DATA:
      return {
        ...state,
        [action.key]: {
          data: action.data,
          timestamp: Date.now(),
          loading: false,
          error: null
        }
      };
    
    case CACHE_ACTIONS.SET_LOADING:
      return {
        ...state,
        [action.key]: {
          ...state[action.key],
          loading: action.loading,
          error: action.loading ? null : state[action.key]?.error
        }
      };
    
    case CACHE_ACTIONS.INVALIDATE_DATA:
      const newState = { ...state };
      if (action.key) {
        delete newState[action.key];
      } else if (action.pattern) {
        // Clear keys matching pattern
        Object.keys(newState).forEach(key => {
          if (key.includes(action.pattern)) {
            delete newState[key];
          }
        });
      }
      return newState;
    
    case CACHE_ACTIONS.CLEAR_CACHE:
      return {};
    
    default:
      return state;
  }
};

// Cache provider component
export const DataCacheProvider = ({ children }) => {
  const [cache, dispatch] = useReducer(cacheReducer, {});

  // Check if cached data is still valid
  const isCacheValid = useCallback((key) => {
    const cached = cache[key];
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < CACHE_DURATION;
  }, [cache]);

  // Get cached data if valid
  const getCachedData = useCallback((key) => {
    if (isCacheValid(key)) {
      return cache[key];
    }
    return null;
  }, [cache, isCacheValid]);

  // Set data in cache
  const setCachedData = useCallback((key, data) => {
    dispatch({
      type: CACHE_ACTIONS.SET_DATA,
      key,
      data
    });
  }, []);

  // Set loading state
  const setCacheLoading = useCallback((key, loading) => {
    dispatch({
      type: CACHE_ACTIONS.SET_LOADING,
      key,
      loading
    });
  }, []);

  // Invalidate specific cache entry
  const invalidateCache = useCallback((key) => {
    dispatch({
      type: CACHE_ACTIONS.INVALIDATE_DATA,
      key
    });
  }, []);

  // Invalidate cache entries by pattern
  const invalidateCachePattern = useCallback((pattern) => {
    dispatch({
      type: CACHE_ACTIONS.INVALIDATE_DATA,
      pattern
    });
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    dispatch({ type: CACHE_ACTIONS.CLEAR_CACHE });
  }, []);

  // Generic cached API call hook
  const useCachedApi = useCallback(async (key, apiCall, dependencies = []) => {
    // Check cache first
    const cached = getCachedData(key);
    if (cached && !cached.loading) {
      return cached;
    }

    // Set loading state
    setCacheLoading(key, true);

    try {
      const result = await apiCall();
      setCachedData(key, result);
      return { data: result, loading: false, error: null };
    } catch (error) {
      dispatch({
        type: CACHE_ACTIONS.SET_DATA,
        key,
        data: { data: null, loading: false, error: error.message }
      });
      return { data: null, loading: false, error: error.message };
    }
  }, [getCachedData, setCachedData, setCacheLoading]);

  const value = {
    cache,
    getCachedData,
    setCachedData,
    setCacheLoading,
    invalidateCache,
    invalidateCachePattern,
    clearCache,
    useCachedApi,
    isCacheValid
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
};

// Hook to use data cache
export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

// Pre-defined cache keys for common data
export const CACHE_KEYS = {
  // Dashboard data
  DASHBOARD_ATTENDANCE: 'dashboard_attendance',
  DASHBOARD_LEAVE_REQUESTS: 'dashboard_leave_requests',
  DASHBOARD_HELP_INQUIRIES: 'dashboard_help_inquiries',
  DASHBOARD_REGULARIZATIONS: 'dashboard_regularizations',
  DASHBOARD_ANNOUNCEMENTS: 'dashboard_announcements',
  DASHBOARD_HOLIDAYS: 'dashboard_holidays',
  DASHBOARD_ADMIN_SUMMARY: 'dashboard_admin_summary',
  
  // Employee specific data
  EMPLOYEE_ATTENDANCE: (employeeId, month) => `employee_attendance_${employeeId}_${month}`,
  EMPLOYEE_PROFILE: (employeeId) => `employee_profile_${employeeId}`,
  
  // Admin data
  ADMIN_ATTENDANCE: (startDate, endDate) => `admin_attendance_${startDate}_${endDate}`,
  ADMIN_EMPLOYEES: 'admin_employees',
  
  // Task reports
  TASK_REPORTS: (employeeId) => `task_reports_${employeeId}`,
  
  // Requests
  MY_REQUESTS: (employeeId) => `my_requests_${employeeId}`,
  ADMIN_REQUESTS: 'admin_requests'
};

export default DataCacheContext;