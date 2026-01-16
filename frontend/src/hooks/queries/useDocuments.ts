import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import { queryKeys } from '@/lib/queryKeys';
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import type { ApiResponse, Document, DocumentType } from '@/types';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get documents for a specific employee
 * @param employeeId - The employee ID to fetch documents for
 * @param optionsOrEnabled - Either a boolean (legacy) or options object { enabled?: boolean }
 */
export const useEmployeeDocuments = (
  employeeId: string | undefined,
  optionsOrEnabled?: boolean | { enabled?: boolean }
) => {
  // Handle both legacy boolean and new options object patterns
  const enabled = typeof optionsOrEnabled === 'boolean'
    ? optionsOrEnabled
    : (optionsOrEnabled?.enabled ?? true);

  return useQuery({
    queryKey: queryKeys.documents.byEmployee(employeeId || ''),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<{ documents: Document[] }>>(
        API_ENDPOINTS.DOCUMENTS.GET_BY_EMPLOYEE(employeeId!)
      );
      return data.data?.documents || [];
    },
    enabled: !!employeeId && enabled,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Upload a document
 */
export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      documentType,
      file,
    }: {
      employeeId: string;
      documentType: DocumentType;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('employeeId', employeeId);
      formData.append('documentType', documentType);

      const { data } = await axiosInstance.post<ApiResponse<{ document: Document }>>(
        API_ENDPOINTS.DOCUMENTS.UPLOAD,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return data.data?.document;
    },
    onSuccess: (_uploadedDocument, variables) => {
      // Invalidate employee documents query
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byEmployee(variables.employeeId),
      });

      // If profile picture, dispatch event for other components
      if (variables.documentType === 'profile_picture') {
        window.dispatchEvent(new Event('profile-picture-updated'));
      }
    },
  });
};

/**
 * Delete a document
 */
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, employeeId: _employeeId }: { documentId: string; employeeId: string }) => {
      const { data } = await axiosInstance.delete<ApiResponse>(API_ENDPOINTS.DOCUMENTS.DELETE(documentId));
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate employee documents query
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.byEmployee(variables.employeeId),
      });
    },
  });
};
