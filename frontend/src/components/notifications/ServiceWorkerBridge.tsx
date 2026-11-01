import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { usePushSync } from '@/hooks/queries/useNotifications';
import { SW_MESSAGE_EVENT, type SwMessage } from '@/services/pushClient';

/** Routes service-worker messages into the SPA. Render once, inside the router. */
export default function ServiceWorkerBridge() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  usePushSync();

  useEffect(() => {
    const onMessage = (event: Event) => {
      const message = (event as CustomEvent<SwMessage>).detail;
      if (message?.type === 'NAVIGATE') navigate(message.url);
      if (message?.type === 'PUSH_RECEIVED') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
      }
    };
    window.addEventListener(SW_MESSAGE_EVENT, onMessage);
    return () => window.removeEventListener(SW_MESSAGE_EVENT, onMessage);
  }, [navigate, queryClient]);

  return null;
}
