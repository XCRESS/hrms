import React, { useState, useEffect } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import { useToast } from '../ui/toast';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';

const ProfilePicture = () => {
  const { toast } = useToast();
  const userObject = useAuth();
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userObject?.employeeId) {
      fetchProfilePicture();
    }
  }, [userObject]);

  const fetchProfilePicture = async () => {
    try {
      const response = await apiClient.get(`/documents/employee/${encodeURIComponent(userObject.employeeId)}`);
      const profilePic = response.documents.find(doc => doc.documentType === 'profile_picture');
      setProfilePicture(profilePic?.s3Url || null);
    } catch (error) {
      console.error('Failed to fetch profile picture:', error);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !userObject?.employeeId) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('employeeId', userObject.employeeId);
      formData.append('documentType', 'profile_picture');

      const response = await apiClient.post('/documents/upload', formData);

      setProfilePicture(response.document.s3Url);

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="relative">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-200 dark:border-slate-600">
          {profilePicture ? (
            <img 
              src={profilePicture} 
              alt="Profile" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : (
            <User className="w-12 h-12 text-slate-400" />
          )}
        </div>
        
        <label className="absolute bottom-0 right-0 bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg">
          <Camera className="w-4 h-4" />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {uploading && (
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-600 border-t-transparent"></div>
          <span>Uploading...</span>
        </div>
      )}

      <div className="text-center">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {userObject?.name || 'Employee'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {userObject?.email}
        </p>
      </div>
    </div>
  );
};

export default ProfilePicture;