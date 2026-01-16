import { useEffect, useMemo } from 'react';
import { useEmployeeDocuments } from './queries';
import useAuth from './authjwt';

// Interface for document with profile picture
interface Document {
  documentType: string;
  url?: string;
  [key: string]: unknown;
}

// Interface for profile picture result
interface ProfilePicture extends Document {
  documentType: 'profile_picture';
}

// Return type for the hook
interface UseProfilePictureResult {
  profilePicture: ProfilePicture | null;
  loading: boolean;
  updateProfilePicture: () => void;
  refetch: () => void;
}

const useProfilePicture = (): UseProfilePictureResult => {
  const userObject = useAuth();

  // Fetch all documents for the employee
  const { data: documents = [], isLoading: loading, refetch } = useEmployeeDocuments(userObject?.employeeId);

  // Extract profile picture from documents
  const profilePicture = useMemo((): ProfilePicture | null => {
    const doc = documents.find(doc => doc.documentType === 'profile_picture');
    return doc ? (doc as unknown as ProfilePicture) : null;
  }, [documents]);

  // Listen for profile picture updates (legacy support for window events)
  useEffect(() => {
    const handleProfilePictureUpdate = (): void => {
      refetch();
    };

    window.addEventListener('profile-picture-updated', handleProfilePictureUpdate);

    return () => {
      window.removeEventListener('profile-picture-updated', handleProfilePictureUpdate);
    };
  }, [refetch]);

  // Legacy update function (React Query handles this automatically now)
  const updateProfilePicture = (): void => {
    refetch();
  };

  return {
    profilePicture,
    loading,
    updateProfilePicture,
    refetch
  };
};

export default useProfilePicture;
