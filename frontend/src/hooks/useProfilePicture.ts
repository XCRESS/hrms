import { useEffect, useMemo } from 'react';
import { useEmployeeDocuments, useProfile } from './queries';
import useAuth from './authjwt';

/**
 * Result of the profile picture hook.
 *
 * `imageUrl` comes from the employee profile, which resolves the employee
 * server-side and therefore works for admin/HR accounts whose JWT may not
 * carry an `employeeId`. The documents query is only consulted to resolve the
 * underlying document id needed to delete the picture.
 */
interface UseProfilePictureResult {
  imageUrl: string | null;
  documentId: string | null;
  employeeId: string | null;
  loading: boolean;
  refetch: () => void;
}

const useProfilePicture = (): UseProfilePictureResult => {
  const userObject = useAuth();
  const { data: employee, isLoading: profileLoading, refetch: refetchProfile } = useProfile();

  // Prefer the employee id resolved by the profile endpoint over the JWT claim,
  // which is absent on some admin tokens.
  const employeeId = employee?.employeeId || userObject?.employeeId || null;

  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useEmployeeDocuments(employeeId || undefined);

  const profilePictureDoc = useMemo(
    () => documents.find((doc) => doc.documentType === 'profile_picture') || null,
    [documents]
  );

  // The profile record is the source of truth for display; fall back to the
  // document record so a freshly uploaded picture shows before the profile
  // query settles.
  const imageUrl = employee?.profilePicture || profilePictureDoc?.s3Url || null;

  const refetch = (): void => {
    refetchProfile();
    refetchDocuments();
  };

  // Legacy support: some components still signal updates via a window event.
  useEffect(() => {
    const handleProfilePictureUpdate = (): void => {
      refetchProfile();
      refetchDocuments();
    };

    window.addEventListener('profile-picture-updated', handleProfilePictureUpdate);

    return () => {
      window.removeEventListener('profile-picture-updated', handleProfilePictureUpdate);
    };
  }, [refetchProfile, refetchDocuments]);

  return {
    imageUrl,
    documentId: profilePictureDoc?._id || null,
    employeeId,
    loading: profileLoading || documentsLoading,
    refetch,
  };
};

export default useProfilePicture;
