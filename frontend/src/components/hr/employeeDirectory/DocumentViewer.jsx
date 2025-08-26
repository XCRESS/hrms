import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download, Eye, User } from 'lucide-react';
import apiClient from '../../../service/apiClient';

const DocumentViewer = ({ employeeProfile, onBack }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/documents/employee/${encodeURIComponent(employeeProfile.employeeId)}`);
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentIcon = (documentType) => {
    if (documentType === 'profile_picture') {
      return <User className="w-6 h-6" />;
    }
    return <FileText className="w-6 h-6" />;
  };

  const getDocumentLabel = (documentType) => {
    const labels = {
      'aadhaar': 'Aadhaar Card',
      'pan': 'PAN Card',
      '10th_marksheet': '10th Marksheet',
      '12th_marksheet': '12th Marksheet',
      'college_marksheet': 'College Marksheet',
      'profile_picture': 'Profile Picture'
    };
    return labels[documentType] || documentType;
  };

  const isImageFile = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    return imageExtensions.some(ext => fileName.toLowerCase().includes(ext));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading documents...</div>
      </div>
    );
  }

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
              View employee documents
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-2">
              No Documents Found
            </h3>
            <p className="text-slate-400 dark:text-slate-500">
              No documents have been uploaded for this employee yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((document) => (
              <div key={document._id} className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
                {isImageFile(document.fileName) && document.documentType === 'profile_picture' ? (
                  <div className="aspect-square bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <img 
                      src={document.s3Url} 
                      alt={document.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-full items-center justify-center">
                      {getDocumentIcon(document.documentType)}
                    </div>
                  </div>
                ) : isImageFile(document.fileName) ? (
                  <div className="h-48 bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                    <img 
                      src={document.s3Url} 
                      alt={document.fileName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-full items-center justify-center">
                      {getDocumentIcon(document.documentType)}
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <div className="text-slate-400 dark:text-slate-500">
                      {getDocumentIcon(document.documentType)}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 text-cyan-700 dark:text-cyan-300">
                    {getDocumentLabel(document.documentType)}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {document.fileName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mb-4">
                    Uploaded: {new Date(document.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <a
                      href={document.s3Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </a>
                    <a
                      href={document.s3Url}
                      download
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;