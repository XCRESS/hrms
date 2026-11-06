import { AssistantChatTransport } from '@assistant-ui/ai-sdk';
import type { UIMessage } from 'ai';
import { API_BASE_URL, adoptRefreshedToken, handleAuthFailure } from './axios';
import { API_ENDPOINTS } from './apiEndpoints';
import { tokenStorage } from './tokenStorage';

/** The one sanctioned non-TanStack call: a token stream doesn't fit a query or mutation. Mirrors lib/axios auth handling. */
const authFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  const token = tokenStorage.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers, credentials: 'include' });
  adoptRefreshedToken(response.headers);

  if (!response.ok) {
    const body = (await response.clone().json().catch(() => undefined)) as { message?: string; code?: string } | undefined;
    const authMessage = handleAuthFailure(response.status, body);
    throw new Error(authMessage ?? body?.message ?? `HR Buddy request failed (${response.status})`);
  }
  return response;
};

const parentOf = (messages: UIMessage[], index: number): string | null => (index > 0 ? (messages[index - 1]?.id ?? null) : null);

export const createHrBuddyTransport = () =>
  new AssistantChatTransport<UIMessage>({
    api: `${API_BASE_URL}${API_ENDPOINTS.ASSISTANT.CHAT}`,
    fetch: authFetch,
    // The server owns history: send only the thread, the branch point and the newest user message.
    prepareSendMessagesRequest: ({ id, messages, trigger, messageId }) => {
      if (trigger === 'submit-message') {
        const last = messages.length - 1;
        return { body: { threadId: id, trigger, parentId: parentOf(messages, last), message: messages[last] } };
      }
      const upTo = messageId ? messages.findIndex((m) => m.id === messageId) : messages.length;
      const lastUser = messages.slice(0, upTo === -1 ? messages.length : upTo + 1).reverse().find((m) => m.role === 'user');
      return { body: { threadId: id, trigger, parentId: lastUser?.id ?? null } };
    },
  });
