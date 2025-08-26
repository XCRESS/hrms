import React, { useState } from 'react';
import { ArrowLeft, Upload, FileText, Trash2 } from 'lucide-react';
import { useToast } from '../../ui/toast';
import apiClient from '../../../service/apiClient';
import BackButton from '../../ui/BackButton';

const DocumentUpload = ({ employeeProfile, onBack }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState({});
  const [uploading, setUploading] = useState({});

  const documentTypes = [
    { key: 'aadhaar', label: 'Aadhaar Card' },
    { key: 'pan', label: 'PAN Card' },
    { key: '10th_marksheet', label: '10th Marksheet' },
    { key: '12th_marksheet', label: '12th Marksheet' },
    { key: 'college_marksheet', label: 'College Marksheet' },
    { key: 'profile_picture', label: 'Profile Picture' }
  ];

  React.useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await apiClient.get(`/documents/employee/${encodeURIComponent(employeeProfile.employeeId)}`);
      const docsMap = {};
      response.documents.forEach(doc => {
        docsMap[doc.documentType] = doc;
      });
      setDocuments(docsMap);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('employeeId', employeeProfile.employeeId);
      formData.append('documentType', documentType);

      const response = await apiClient.post('/documents/upload', formData);

      setDocuments(prev => ({
        ...prev,
        [documentType]: response.document
      }));

      toast({
        title: "Success",
        description: "Document uploaded successfully",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleDelete = async (documentType, documentId) => {
    try {
      await apiClient.delete(`/documents/${documentId}`);
      setDocuments(prev => {
        const newDocs = { ...prev };
        delete newDocs[documentType];
        return newDocs;
      });

      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
              Documents - {employeeProfile.firstName} {employeeProfile.lastName}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Upload and manage employee documents
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documentTypes.map(({ key, label }) => (
            <div key={key} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">{label}</h3>
                <FileText className="w-6 h-6 text-slate-500" />
              </div>

              {documents[key] ? (
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ {documents[key].fileName}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Uploaded: {new Date(documents[key].createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={documents[key].s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm text-center transition-colors"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(key, documents[key]._id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-center">
                    <label className="inline-block px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors text-sm">
                      Replace Document
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={(e) => handleFileUpload(key, e.target.files[0])}
                        className="hidden"
                        disabled={uploading[key]}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No document uploaded
                    </p>
                  </div>

                  <label className="block w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg cursor-pointer transition-colors text-center text-sm">
                    {uploading[key] ? 'Uploading...' : 'Upload Document'}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif"
                      onChange={(e) => handleFileUpload(key, e.target.files[0])}
                      className="hidden"
                      disabled={uploading[key]}
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;