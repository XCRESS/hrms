import React, { useState, useEffect } from 'react';
import { FileText, User, Shield, GraduationCap, Plus, Eye, X, Upload } from 'lucide-react';
import { useToast } from '../ui/toast';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';

const MyDocuments = () => {
  const userObject = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const documentTypes = [
    { key: 'profile_picture', label: 'Profile Photo', icon: User, accept: 'image/*' },
    { key: 'aadhaar', label: 'Aadhaar Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'pan', label: 'PAN Card', icon: Shield, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '10th_marksheet', label: '10th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: '12th_marksheet', label: '12th Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
    { key: 'college_marksheet', label: 'College Certificate', icon: GraduationCap, accept: '.pdf,.jpg,.jpeg,.png' },
  ];

  useEffect(() => {
    if (userObject?.employeeId) {
      fetchDocuments();
    }
  }, [userObject]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/documents/employee/${encodeURIComponent(userObject.employeeId)}`);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType, file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('employeeId', userObject.employeeId);
      formData.append('documentType', docType);

      const response = await apiClient.post('/documents/upload', formData);
      
      // Update documents list
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.documentType !== docType);
        return [...filtered, response.document];
      });

      toast({
        title: "Success",
        description: "Document uploaded successfully",
        variant: "default"
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (documentId) => {
    try {
      await apiClient.delete(`/documents/${documentId}`);
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
      
      toast({
        title: "Success",
        description: "Document deleted successfully",
        variant: "default"
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const getDocumentForType = (docType) => {
    return documents.find(doc => doc.documentType === docType);
  };

  const isImage = (fileName) => {
    return /\.(jpg|jpeg|png|gif)$/i.test(fileName);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Simple Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Documents
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload and manage your personal documents
            </p>
          </div>
        </div>
      </div>

      {/* Document Grid */}
      <div className="px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {documentTypes.map((docType) => {
          const IconComponent = docType.icon;
          const existingDoc = getDocumentForType(docType.key);

          return (
            <div key={docType.key} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow overflow-hidden min-h-[280px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                  <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">{docType.label}</h3>
              </div>

              {existingDoc ? (
                /* Document exists - show preview with actions */
                <div className="space-y-4">
                  {/* Document preview */}
                  {isImage(existingDoc.fileName) ? (
                    <div className="h-32 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                      <img
                        src={existingDoc.s3Url}
                        alt={existingDoc.fileName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400" />
                    </div>
                  )}

                  {/* File info */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={existingDoc.fileName}>
                      {existingDoc.fileName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(existingDoc.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={existingDoc.s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                    <button
                      onClick={() => handleFileDelete(existingDoc._id)}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Replace option */}
                  <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                    <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <Upload className="w-4 h-4" />
                      Replace
                      <input
                        type="file"
                        accept={docType.accept}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleFileUpload(docType.key, file);
                        }}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                /* No document - show upload */
                <div className="space-y-4">
                  <div className="h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                    <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                      <div className="p-3 bg-gray-100 dark:bg-slate-700 rounded-full">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Upload Document</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, JPG, PNG</p>
                      </div>
                      <input
                        type="file"
                        accept={docType.accept}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleFileUpload(docType.key, file);
                        }}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>

        {uploading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-gray-900 dark:text-white">Uploading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDocuments;