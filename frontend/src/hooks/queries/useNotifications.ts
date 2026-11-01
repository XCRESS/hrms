import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import { tokenStorage } from '@/lib/tokenStorage';
import type { ApiResponse } from '@/types';
import { disablePush, enablePush, getPushState, syncPush } from '@/services/pushClient';

export interface InboxNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
}

interface InboxPayload {
  items: InboxNotification[];
  unread: number;
  nextCursor: string | null;
}

const setAppBadge = (count: number): void => {
  if (!('setAppBadge' in navigator)) return;
  void (count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {});
};

export const useNotificationInbox = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.notifications.inbox(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<InboxPayload>>(API_ENDPOINTS.NOTIFICATIONS.INBOX, {
        params: { limit: 30 },
      });
      return data.data ?? { items: [], unread: 0, nextCursor: null };
    },
    enabled,
  });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: queryKeys.notifications.unread(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ unread: number }>>(
        API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT
      );
      const unread = data.data?.unread ?? 0;
      setAppBadge(unread);
      return unread;
    },
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[] } | { all: true }) => {
      const { data } = await axiosInstance.post<ApiResponse<{ unread: number }>>(
        API_ENDPOINTS.NOTIFICATIONS.MARK_READ,
        input
      );
      return data.data?.unread ?? 0;
    },
    onSuccess: (unread) => {
      setAppBadge(unread);
      queryClient.setQueryData(queryKeys.notifications.unread(), unread);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.inbox() });
    },
  });
};

export const usePushState = () =>
  useQuery({
    queryKey: queryKeys.notifications.pushState(),
    queryFn: getPushState,
    staleTime: Infinity,
    refetchOnWindowFocus: true,
  });

/** Re-links this device to whoever is signed in. Runs once per session. */
export const usePushSync = () =>
  useQuery({
    queryKey: queryKeys.notifications.pushSync(),
    queryFn: syncPush,
    enabled: Boolean(tokenStorage.get()),
    staleTime: Infinity,
    retry: false,
  });

export const useEnablePush = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enablePush,
    onSuccess: (state) => queryClient.setQueryData(queryKeys.notifications.pushState(), state),
  });
};

export const useDisablePush = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disablePush,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications.pushState() }),
  });
};

export interface NotificationStatus {
  initialized: boolean;
  emailReady: boolean;
  pushReady: boolean;
  myDevices: number;
}

export const useNotificationStatus = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.notifications.status(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<NotificationStatus>>(API_ENDPOINTS.NOTIFICATIONS.STATUS);
      return data.data;
    },
    enabled,
  });

/** `self` pushes to the caller's own devices; the rest are HR-only broadcast tests. */
export type NotificationTestType = 'self' | 'hr' | 'all' | 'milestone' | 'holiday' | 'nudges';

export const useTestNotification = () =>
  useMutation({
    mutationFn: async (type: NotificationTestType) => {
      const { data } = await axiosInstance.post<ApiResponse<{ devices?: number }>>(
        API_ENDPOINTS.NOTIFICATIONS.TEST,
        { type }
      );
      return data;
    },
  });
