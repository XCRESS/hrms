import { useState, useEffect } from 'react';
import apiClient from '../service/apiClient';
import useAuth from './authjwt';

const useProfilePicture = () => {
  const userObject = useAuth();
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfilePicture = async () => {
    if (!userObject?.employeeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get(`/documents/employee/${encodeURIComponent(userObject.employeeId)}`);
      const profilePic = response.documents?.find(doc => doc.documentType === 'profile_picture');
      setProfilePicture(profilePic || null);
    } catch (error) {
      console.error('Failed to fetch profile picture:', error);
      setProfilePicture(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfilePicture();
  }, [userObject?.employeeId]);

  useEffect(() => {
    const handleProfilePictureUpdate = () => {
      fetchProfilePicture();
    };

    window.addEventListener('profile-picture-updated', handleProfilePictureUpdate);
    
    return () => {
      window.removeEventListener('profile-picture-updated', handleProfilePictureUpdate);
    };
  }, [userObject?.employeeId]);

  const updateProfilePicture = (newProfilePic) => {
    setProfilePicture(newProfilePic);
  };

  return {
    profilePicture,
    loading,
    updateProfilePicture,
    refetch: fetchProfilePicture
  };
};

export default useProfilePicture;