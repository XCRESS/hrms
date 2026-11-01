import { useMutation } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/apiEndpoints";
import type { ApiResponse } from "@/types";

export interface ChatReply {
  response: string;
  conversation_id: string;
  timestamp: string;
}

/** OpenAI with function calling can take a while; one request, no retry. */
const CHAT_TIMEOUT_MS = 60_000;

export const useSendChatMessage = () =>
  useMutation({
    mutationFn: async (input: { message: string; conversation_id?: string }) => {
      const { data } = await axiosInstance.post<ApiResponse<ChatReply>>(API_ENDPOINTS.CHAT.SEND, input, {
        timeout: CHAT_TIMEOUT_MS,
      });
      return data.data as ChatReply;
    },
  });
