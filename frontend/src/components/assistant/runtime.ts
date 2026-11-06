import { useMemo } from 'react';
import { useAui, useRemoteThreadListRuntime, type AttachmentAdapter, type RemoteThreadListAdapter, type ThreadHistoryAdapter } from '@assistant-ui/react';
import { useChatRuntime } from '@assistant-ui/ai-sdk';
import { createAssistantStream } from 'assistant-stream';
import { createHrBuddyTransport } from '@/lib/assistantTransport';
import {
  createAssistantThread,
  deleteAssistantThread,
  fetchAssistantMessages,
  fetchAssistantThread,
  fetchAssistantThreads,
  generateAssistantTitle,
  updateAssistantThread,
  uploadAssistantFile,
} from '@/hooks/queries/useAssistant';
import { ATTACHMENT_ACCEPT } from './fileKinds';

const transport = createHrBuddyTransport();

/** Files upload to HR Buddy's own store on send; messages carry only the stored file's id. */
const attachments: AttachmentAdapter = {
  accept: ATTACHMENT_ACCEPT,
  add: async ({ file }) => ({
    id: crypto.randomUUID(),
    type: file.type.startsWith('image/') ? 'image' : 'document',
    name: file.name,
    contentType: file.type,
    file,
    status: { type: 'requires-action', reason: 'composer-send' },
  }),
  remove: async () => {},
  send: async (attachment) => {
    const stored = await uploadAssistantFile(attachment.file);
    return {
      ...attachment,
      status: { type: 'complete' },
      content: [{ type: 'file', data: stored.id, sourceType: 'id', mimeType: stored.mediaType, filename: stored.name }],
    };
  },
};

/** The server saves every message itself; the browser only loads history. */
function useThreadAdapters() {
  const aui = useAui();
  // assistant-ui requires a stable adapters object per mounted thread.
  const history = useMemo<ThreadHistoryAdapter>(
    () => ({
      load: async () => ({ messages: [] }),
      append: async () => {},
      withFormat: (fmt) => ({
        load: async () => {
          const { remoteId } = aui.threadListItem.getState();
          if (!remoteId) return { messages: [] };
          const { headId, messages } = await fetchAssistantMessages(remoteId);
          return { headId, messages: messages.map((row) => fmt.decode(row as unknown as Parameters<typeof fmt.decode>[0])) };
        },
        append: async () => {},
      }),
    }),
    [aui]
  );
  return useMemo(() => ({ history }), [history]);
}

const adapter: RemoteThreadListAdapter = {
  list: async () => ({
    threads: (await fetchAssistantThreads()).map((t) => ({
      status: t.archived ? 'archived' : 'regular',
      remoteId: t.id,
      title: t.title || undefined,
      custom: { updatedAt: t.updatedAt },
    })),
  }),
  initialize: async () => ({ remoteId: await createAssistantThread(), externalId: undefined }),
  rename: (remoteId, title) => updateAssistantThread(remoteId, { title }),
  archive: (remoteId) => updateAssistantThread(remoteId, { archived: true }),
  unarchive: (remoteId) => updateAssistantThread(remoteId, { archived: false }),
  delete: (remoteId) => deleteAssistantThread(remoteId),
  fetch: async (remoteId) => {
    const t = await fetchAssistantThread(remoteId);
    return { status: t.archived ? 'archived' : 'regular', remoteId: t.id, title: t.title || undefined };
  },
  generateTitle: async (remoteId) =>
    createAssistantStream(async (controller) => {
      controller.appendText(await generateAssistantTitle(remoteId));
    }),
  unstable_useAdapters: useThreadAdapters,
};

const useThreadRuntime = () => useChatRuntime({ transport, adapters: { attachments } });

export const useHrBuddyRuntime = () => useRemoteThreadListRuntime({ runtimeHook: useThreadRuntime, adapter });
