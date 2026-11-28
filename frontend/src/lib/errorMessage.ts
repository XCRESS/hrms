/**
 * User-facing message from a thrown value. lib/axios rejects with a plain
 * `ApiError` object (not an `Error`), whose `message` is already the server's.
 */
export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; response?: { data?: { message?: unknown } } };
    const serverMessage = e.response?.data?.message;
    if (typeof serverMessage === 'string' && serverMessage) return serverMessage;
    if (typeof e.message === 'string' && e.message) return e.message;
  }
  return fallback;
};
