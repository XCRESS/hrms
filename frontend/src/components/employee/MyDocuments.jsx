import React, { useState, useEffect } from 'react';
import { FileText, Upload, Eye, Trash2, Plus } from 'lucide-react';
import { useToast } from '../ui/toast';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';

const MyDocuments = () => {
  const { toast } = useToast();
  const userObject = useAuth();
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState({});
  const [loading, setLoading] = useState(true);

  const documentTypes = [
    { key: 'aadhaar', label: 'Aadhaar Card' },
    { key: 'pan', label: 'PAN Card' },
    { key: '10th_marksheet', label: '10th Marksheet' },
    { key: '12th_marksheet', label: '12th Marksheet' },
    { key: 'college_marksheet', label: 'College Marksheet' },
  ];

  useEffect(() => {
    if (userObject?.employeeId) {
      fetchDocuments();
      // Fallback to stop loading after 10 seconds
      const timeout = setTimeout(() => {
        setLoading(false);
        console.log('Stopped loading due to timeout');
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [userObject]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('Fetching documents for employeeId:', userObject.employeeId);
      const response = await apiClient.get(`/documents/employee/${encodeURIComponent(userObject.employeeId)}`);
      console.log('Documents response:', response);
      const docsMap = {};
      response.documents.forEach(doc => {
        if (doc.documentType !== 'profile_picture') {
          docsMap[doc.documentType] = doc;
        }
      });
      console.log('Documents map:', docsMap);
      setDocuments(docsMap);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      console.error('Error details:', error.status, error.message);
      // Set empty documents on error so UI shows upload options
      setDocuments({});
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentType, file) => {
    if (!file || !userObject?.employeeId) return;

    setUploading(prev => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('employeeId', userObject.employeeId);
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
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

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

  if (loading) {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">My Documents</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-200 dark:bg-slate-700 rounded-lg h-24"></div>
          ))}
        </div>
        <div className="mt-4 text-sm text-slate-500">
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4">My Documents</h3>
      
      <div className="space-y-4">
        {documentTypes.map(({ key, label }) => (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-slate-500" />
                <h4 className="font-medium text-slate-700 dark:text-slate-300">{label}</h4>
              </div>
            </div>

            {documents[key] ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      ✓ {documents[key].fileName}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Uploaded: {new Date(documents[key].createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={documents[key].s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </a>
                    <button
                      onClick={() => handleDelete(key, documents[key]._id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors text-sm">
                  <Plus className="w-4 h-4" />
                  <span>Replace Document</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => handleFileUpload(key, e.target.files[0])}
                    className="hidden"
                    disabled={uploading[key]}
                  />
                </label>
              </div>
            ) : (
              <label className="flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-cyan-500 dark:hover:border-cyan-400 cursor-pointer transition-colors text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400">
                {uploading[key] ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-600 border-t-transparent"></div>
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    <span className="text-sm">Upload {label}</span>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => handleFileUpload(key, e.target.files[0])}
                  className="hidden"
                  disabled={uploading[key]}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Document Guidelines</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Accepted formats: PDF, JPG, JPEG, PNG, GIF</li>
          <li>• Maximum file size: 5MB</li>
          <li>• Ensure documents are clear and readable</li>
        </ul>
      </div>
    </div>
  );
};

export default MyDocuments;