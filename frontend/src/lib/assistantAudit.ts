let current: string | null = null;

export const currentAssistantThread = (): string | null => current;

/** Tags every request made during `run` with the HR Buddy thread, so the backend can audit it. */
export async function asAssistantAction<T>(threadId: string, run: () => Promise<T>): Promise<T> {
  current = threadId;
  try {
    return await run();
  } finally {
    current = null;
  }
}
