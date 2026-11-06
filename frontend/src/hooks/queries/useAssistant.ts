import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse } from '@/types';

export interface AssistantThreadSummary {
  id: string;
  title: string;
  archived: boolean;
  updatedAt: string;
}

export interface StoredAssistantMessage {
  id: string;
  parent_id: string | null;
  format: string;
  content: { role: 'user' | 'assistant'; parts: unknown[]; metadata?: unknown };
}

export interface AssistantReceipt {
  at: string;
  summary: string;
  link?: string | null;
  committedFields: Record<string, unknown>;
}

export interface AssistantEmailInput {
  to: string[];
  subject: string;
  body: string;
  table?: { columns: { key: string; label: string }[]; rows: Record<string, string | number | null>[] } | null;
}

const getThreads = async () => {
  const { data } = await axiosInstance.get<ApiResponse<{ threads: AssistantThreadSummary[] }>>(API_ENDPOINTS.ASSISTANT.THREADS);
  return data.data?.threads ?? [];
};

// Plain functions for assistant-ui's thread-list adapter, which needs promises rather than hooks.
export const fetchAssistantThreads = () => queryClient.fetchQuery({ queryKey: queryKeys.assistant.threads(), queryFn: getThreads });

export const fetchAssistantThread = (id: string) =>
  queryClient.fetchQuery({
    queryKey: queryKeys.assistant.thread(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<Omit<AssistantThreadSummary, 'updatedAt'>>>(API_ENDPOINTS.ASSISTANT.THREAD(id));
      return data.data!;
    },
  });

export const fetchAssistantMessages = (id: string) =>
  queryClient.fetchQuery({
    queryKey: queryKeys.assistant.messages(id),
    staleTime: 0,
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ headId: string | null; messages: StoredAssistantMessage[] }>>(
        API_ENDPOINTS.ASSISTANT.MESSAGES(id)
      );
      return data.data ?? { headId: null, messages: [] };
    },
  });

export const createAssistantThread = async (): Promise<string> => {
  const { data } = await axiosInstance.post<ApiResponse<{ id: string }>>(API_ENDPOINTS.ASSISTANT.THREADS);
  await queryClient.invalidateQueries({ queryKey: queryKeys.assistant.threads() });
  return data.data!.id;
};

export const updateAssistantThread = async (id: string, patch: { title?: string; archived?: boolean }) => {
  await axiosInstance.patch(API_ENDPOINTS.ASSISTANT.THREAD(id), patch);
  await queryClient.invalidateQueries({ queryKey: queryKeys.assistant.all() });
};

export const deleteAssistantThread = async (id: string) => {
  await axiosInstance.delete(API_ENDPOINTS.ASSISTANT.THREAD(id));
  await queryClient.invalidateQueries({ queryKey: queryKeys.assistant.all() });
};

export const generateAssistantTitle = async (id: string): Promise<string> => {
  const { data } = await axiosInstance.post<ApiResponse<{ title: string }>>(API_ENDPOINTS.ASSISTANT.TITLE(id));
  await queryClient.invalidateQueries({ queryKey: queryKeys.assistant.threads() });
  return data.data?.title ?? '';
};

export const useAssistantThreads = () => useQuery({ queryKey: queryKeys.assistant.threads(), queryFn: getThreads });

export const useSaveReceipt = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, ...body }: { threadId: string; messageId: string; toolCallId: string; receipt: AssistantReceipt }) => {
      await axiosInstance.post(API_ENDPOINTS.ASSISTANT.RECEIPTS(threadId), body);
    },
    onSuccess: (_data, { threadId }) => {
      client.invalidateQueries({ queryKey: queryKeys.assistant.messages(threadId) });
    },
  });
};

export const useSendAssistantEmail = () =>
  useMutation({
    mutationFn: async (input: AssistantEmailInput) => {
      const { data } = await axiosInstance.post<ApiResponse<{ sent: string[]; failed: { email: string; message: string }[] }>>(
        API_ENDPOINTS.ASSISTANT.EMAIL,
        input
      );
      return data.data ?? { sent: [], failed: [] };
    },
  });

export interface AssistantFileSummary {
  id: string;
  name: string;
  mediaType: string;
  size: number;
}

// For assistant-ui's attachment adapter, which needs a promise rather than a hook.
export const uploadAssistantFile = async (file: File): Promise<AssistantFileSummary> => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axiosInstance.post<ApiResponse<AssistantFileSummary>>(API_ENDPOINTS.ASSISTANT.FILES, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data!;
};

const saveBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export const useDownloadAssistantFile = () =>
  useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await axiosInstance.get<Blob>(API_ENDPOINTS.ASSISTANT.FILE(id), { responseType: 'blob' });
      saveBlob(data, name);
    },
  });

export interface ExportTableInput {
  format: 'xlsx' | 'pdf';
  title: string;
  subtitle?: string;
  columns: { label: string; kind?: string }[];
  rows: (string | number | null)[][];
}

export const useExportTable = () =>
  useMutation({
    mutationFn: async (input: ExportTableInput) => {
      const { data } = await axiosInstance.post<Blob>(API_ENDPOINTS.ASSISTANT.EXPORT, input, { responseType: 'blob' });
      const stem = input.title.split('·')[0]?.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'HR Buddy';
      saveBlob(data, `${stem}.${input.format}`);
    },
  });
