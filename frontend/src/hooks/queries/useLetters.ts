import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS, buildEndpointWithQuery } from '@/lib/apiEndpoints';
import type { ApiResponse } from '@/types';
import type {
  CreateLetterInput,
  Letter,
  LetterDoc,
  LetterFields,
  LetterList,
  LetterListParams,
  LetterTemplate,
  LetterTemplateInput,
  LetterTemplateSummary,
  Letterhead,
  LetterheadInput,
  MyLetter,
} from '@/types/letters';

const unwrap = <T,>(response: { data: ApiResponse<T> }): T => response.data.data as T;

export const useLetterFields = () =>
  useQuery({
    queryKey: queryKeys.letters.fields(),
    queryFn: async () => unwrap<LetterFields>(await axiosInstance.get(API_ENDPOINTS.LETTERS.FIELDS)),
    staleTime: Infinity,
  });

export const useLetterTemplates = (all = false) =>
  useQuery({
    queryKey: queryKeys.letters.templates(all),
    queryFn: async () =>
      unwrap<LetterTemplateSummary[]>(await axiosInstance.get(buildEndpointWithQuery(API_ENDPOINTS.LETTERS.TEMPLATES, { all: all ? '1' : undefined }))),
  });

export const useLetterTemplate = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.letters.template(id ?? ''),
    queryFn: async () => unwrap<LetterTemplate>(await axiosInstance.get(API_ENDPOINTS.LETTERS.TEMPLATE(id!))),
    enabled: Boolean(id),
  });

export const useSaveLetterTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: LetterTemplateInput }) => {
      if (!id) return unwrap<LetterTemplate>(await axiosInstance.post(API_ENDPOINTS.LETTERS.TEMPLATES, input));
      const { kind: _kind, ...update } = input;
      return unwrap<LetterTemplate>(await axiosInstance.put(API_ENDPOINTS.LETTERS.TEMPLATE(id), update));
    },
    onSuccess: (template) => {
      queryClient.setQueryData(queryKeys.letters.template(template._id), template);
      queryClient.invalidateQueries({ queryKey: ['letters', 'templates'] });
    },
  });
};

export const useArchiveLetterTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap<LetterTemplateSummary>(await axiosInstance.delete(API_ENDPOINTS.LETTERS.TEMPLATE(id))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['letters', 'templates'] }),
  });
};

export const useLetterhead = (companyId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.letters.letterhead(companyId ?? ''),
    queryFn: async () => unwrap<Letterhead | null>(await axiosInstance.get(API_ENDPOINTS.LETTERS.LETTERHEAD(companyId!))),
    enabled: Boolean(companyId),
  });

export const useSaveLetterhead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, pdf, data }: LetterheadInput) => {
      const form = new FormData();
      if (pdf) form.append('pdf', pdf);
      form.append('data', JSON.stringify(data));
      return unwrap<Letterhead>(await axiosInstance.put(API_ENDPOINTS.LETTERS.LETTERHEAD(companyId), form));
    },
    onSuccess: (letterhead, { companyId }) => queryClient.setQueryData(queryKeys.letters.letterhead(companyId), letterhead),
  });
};

export const useImportDocx = () =>
  useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('docx', file);
      return unwrap<{ html: string; messages: string[] }>(await axiosInstance.post(API_ENDPOINTS.LETTERS.IMPORT_DOCX, form));
    },
  });

export const useLetters = (params: LetterListParams) =>
  useQuery({
    queryKey: queryKeys.letters.list(params),
    queryFn: async () => unwrap<LetterList>(await axiosInstance.get(buildEndpointWithQuery(API_ENDPOINTS.LETTERS.BASE, { ...params }))),
  });

export const useLetter = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.letters.detail(id ?? ''),
    queryFn: async () => unwrap<Letter>(await axiosInstance.get(API_ENDPOINTS.LETTERS.LETTER(id!))),
    enabled: Boolean(id),
  });

export const useLetterWording = (id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.letters.wording(id ?? ''),
    queryFn: async () => unwrap<LetterDoc>(await axiosInstance.get(API_ENDPOINTS.LETTERS.WORDING(id!))),
    enabled: Boolean(id) && enabled,
    gcTime: 0,
  });

export const useMyLetters = () =>
  useQuery({
    queryKey: queryKeys.letters.mine(),
    queryFn: async () => unwrap<MyLetter[]>(await axiosInstance.get(API_ENDPOINTS.LETTERS.MINE)),
  });

const useLetterMutation = <TInput,>(request: (input: TInput) => Promise<Letter>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (letter) => {
      queryClient.setQueryData(queryKeys.letters.detail(letter._id), (previous: Letter | undefined) => ({ ...previous, ...letter }));
      queryClient.invalidateQueries({ queryKey: queryKeys.letters.lists() });
    },
  });
};

export const useCreateLetter = () =>
  useLetterMutation(async (input: CreateLetterInput) => unwrap<Letter>(await axiosInstance.post(API_ENDPOINTS.LETTERS.BASE, input)));

export const useUpdateLetter = () =>
  useLetterMutation(async ({ id, values, body }: { id: string; values?: Record<string, string>; body?: LetterDoc | null }) =>
    unwrap<Letter>(await axiosInstance.put(API_ENDPOINTS.LETTERS.LETTER(id), { values, body }))
  );

export const useIssueLetter = () =>
  useLetterMutation(async (id: string) => unwrap<Letter>(await axiosInstance.post(API_ENDPOINTS.LETTERS.ISSUE(id))));

export const useSendLetter = () =>
  useLetterMutation(async ({ id, to }: { id: string; to?: string }) => unwrap<Letter>(await axiosInstance.post(API_ENDPOINTS.LETTERS.SEND(id), { to })));

export const useVoidLetter = () =>
  useLetterMutation(async ({ id, reason }: { id: string; reason: string }) => unwrap<Letter>(await axiosInstance.post(API_ENDPOINTS.LETTERS.VOID(id), { reason })));

export const useDeleteLetter = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => axiosInstance.delete(API_ENDPOINTS.LETTERS.LETTER(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.letters.lists() }),
  });
};

export type PdfRequest =
  | { kind: 'template'; input: Pick<LetterTemplateInput, 'kind' | 'company' | 'body' | 'askFields'> }
  | { kind: 'letterhead'; companyId: string }
  | { kind: 'draft'; id: string }
  | { kind: 'issued'; id: string };

const fetchPdf = async (request: PdfRequest): Promise<Blob> => {
  const blob = { responseType: 'blob' as const };
  switch (request.kind) {
    case 'template':
      return (await axiosInstance.post<Blob>(API_ENDPOINTS.LETTERS.TEMPLATE_PREVIEW, request.input, blob)).data;
    case 'letterhead':
      return (await axiosInstance.post<Blob>(API_ENDPOINTS.LETTERS.LETTERHEAD_PREVIEW(request.companyId), undefined, blob)).data;
    case 'draft':
      return (await axiosInstance.post<Blob>(API_ENDPOINTS.LETTERS.PREVIEW(request.id), undefined, blob)).data;
    case 'issued':
      return (await axiosInstance.get<Blob>(API_ENDPOINTS.LETTERS.PDF(request.id), blob)).data;
  }
};

/** PDFs come back as Blobs; error bodies are Blobs too, so the message is read out of them. */
export const useLetterPdf = () =>
  useMutation({
    mutationFn: async (request: PdfRequest) => {
      try {
        return await fetchPdf(request);
      } catch (error) {
        const data = (error as { response?: { data?: unknown } }).response?.data;
        if (data instanceof Blob) {
          let message: string | undefined;
          try {
            message = (JSON.parse(await data.text()) as { message?: string }).message;
          } catch {
            message = undefined;
          }
          throw new Error(message ?? 'Could not create the PDF — try again');
        }
        throw error;
      }
    },
  });
