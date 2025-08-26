import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfilePicture from './ProfilePicture';
import MyDocuments from './MyDocuments';

const DocumentsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-300">
              My Documents
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Upload and manage your documents
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Section */}
          <div className="lg:col-span-1">
            <ProfilePicture />
          </div>

          {/* Documents Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <MyDocuments />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;