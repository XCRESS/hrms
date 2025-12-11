import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, User, Shield, GraduationCap, Plus, Eye, X, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../ui/toast';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';

const DocumentsPage = () => {
  const navigate = useNavigate();
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
      
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.documentType !== docType);
        return [...filtered, response.document];
      });

      // If it's a profile picture, notify all components to refresh
      if (docType === 'profile_picture') {
        window.dispatchEvent(new Event('profile-picture-updated'));
      }

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
      const documentToDelete = documents.find(doc => doc._id === documentId);
      await apiClient.delete(`/documents/${documentId}`);
      setDocuments(prev => prev.filter(doc => doc._id !== documentId));
      
      // If it's a profile picture, notify all components to refresh
      if (documentToDelete?.documentType === 'profile_picture') {
        window.dispatchEvent(new Event('profile-picture-updated'));
      }
      
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
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Documents
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Upload and manage your documents
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {documentTypes.map((docType) => {
            const IconComponent = docType.icon;
            const existingDoc = getDocumentForType(docType.key);

            return (
              <div key={docType.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <IconComponent className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">{docType.label}</h3>
                </div>

                {existingDoc ? (
                  <div className="space-y-3">
                    {isImage(existingDoc.fileName) ? (
                      <div className="h-24 bg-slate-50 dark:bg-slate-800 rounded overflow-hidden">
                        <img
                          src={existingDoc.s3Url}
                          alt={existingDoc.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-24 bg-slate-50 dark:bg-slate-800 rounded flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-slate-900 dark:text-slate-100 truncate" title={existingDoc.fileName}>
                        {existingDoc.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(existingDoc.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={existingDoc.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </a>
                      <button
                        onClick={() => handleFileDelete(existingDoc._id)}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <label className="cursor-pointer flex items-center justify-center gap-1 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors border-t border-slate-200 dark:border-slate-700 pt-2">
                      <Upload className="w-3 h-3" />
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
                ) : (
                  <label className="cursor-pointer">
                    <div className="h-24 border border-dashed border-slate-300 dark:border-slate-600 rounded flex items-center justify-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                      <div className="text-center">
                        <Plus className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">Upload</p>
                      </div>
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
                )}
              </div>
            );
          })}
        </div>

        {uploading && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3 shadow-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 dark:border-slate-100 border-t-transparent"></div>
              <span className="text-sm text-slate-900 dark:text-slate-100">Uploading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;