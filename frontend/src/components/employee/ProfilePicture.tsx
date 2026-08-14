import { User } from 'lucide-react';
import FileUpload from '../ui/FileUpload';
import useAuth from '../../hooks/authjwt';
import useProfilePicture from '../../hooks/useProfilePicture';

const ProfilePicture = () => {
  const userObject = useAuth();
  const { imageUrl, documentId, employeeId, refetch } = useProfilePicture();

  const handleProfilePictureChange = () => {
    refetch(); // Refresh the profile picture data
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="text-center mb-6">
        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-200 dark:border-slate-600 mb-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <User className="w-12 h-12 text-slate-400" />
          )}
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {userObject?.name || 'Employee'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {userObject?.email}
        </p>
      </div>

      {employeeId && (
        <FileUpload
          employeeId={employeeId}
          documentType="profile_picture"
          currentFile={
            imageUrl && documentId
              ? { _id: documentId, fileName: 'profile-picture', s3Url: imageUrl, createdAt: '' }
              : null
          }
          onFileChange={handleProfilePictureChange}
          accept="image/*"
          maxSize="5MB"
        />
      )}
    </div>
  );
};

export default ProfilePicture;
