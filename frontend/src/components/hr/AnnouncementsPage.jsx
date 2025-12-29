import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import notificationService from '../../service/notificationService';
import { PlusCircle, Edit3, Trash2, AlertTriangle, CheckCircle, XCircle, MessageSquare, Users, CalendarDays, Eye, EyeOff } from 'lucide-react';

const targetAudienceOptions = ["all", "employees", "hr", "admin"];
const statusOptions = ["draft", "published"];

const AnnouncementsPage = () => {
  const userObject = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [showModal, setShowModal] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);

  const canManageAnnouncements = userObject && (userObject.role === 'admin' || userObject.role === 'hr');

  const resetMessages = () => {
    setError(null);
    setMessage({ type: '', content: '' });
  };

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    resetMessages();
    try {
      const params = canManageAnnouncements ? {} : {}; 
      const response = await apiClient.getAnnouncements(params);
      setAnnouncements(response.announcements || []);
    } catch (err) {
      setError(err.data?.message || err.message || 'Failed to fetch announcements.');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [canManageAnnouncements]);

  useEffect(() => {
    if (userObject) { 
        fetchAnnouncements();
    }
  }, [fetchAnnouncements, userObject]);

  if (!userObject) return <div>Loading user data...</div>;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentAnnouncement(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    resetMessages();
    setIsEditing(false);
    setCurrentAnnouncement({ title: '', content: '', targetAudience: 'all', status: 'published' });
    setShowModal(true);
  };

  const openEditModal = (announcement) => {
    resetMessages();
    setIsEditing(true);
    setCurrentAnnouncement({ ...announcement });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentAnnouncement(null);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!currentAnnouncement || !currentAnnouncement.title || !currentAnnouncement.content) {
      setMessage({ type: 'error', content: 'Title and Content are required.' });
      return;
    }
    setLoading(true);
    resetMessages();
    
    const { author, authorName, ...payload } = currentAnnouncement;

    try {
      let result;
      if (isEditing) {
        result = await apiClient.updateAnnouncement(currentAnnouncement._id, payload);
        setMessage({ type: 'success', content: 'Announcement updated successfully!' });
      } else {
        result = await apiClient.createAnnouncement(payload);
        setMessage({ type: 'success', content: 'Announcement created successfully!' });
      }
      
      // Send PWA notification if announcement is published
      if (payload.status === 'published') {
        try {
          const announcementData = result.announcement || currentAnnouncement;
          await notificationService.sendAnnouncementNotification(announcementData);
        } catch (notifyError) {
          console.error('Failed to send PWA notification:', notifyError);
          // Don't show error to user as the main operation succeeded
        }
      }
      
      fetchAnnouncements();
      closeModal();
    } catch (err) {
      setMessage({ type: 'error', content: err.data?.message || err.message || (isEditing ? 'Failed to update announcement.' : 'Failed to create announcement.') });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (announcement) => {
    resetMessages();
    setAnnouncementToDelete(announcement);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setAnnouncementToDelete(null);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    setLoading(true);
    resetMessages();
    try {
      await apiClient.deleteAnnouncement(announcementToDelete._id);
      setMessage({ type: 'success', content: 'Announcement deleted successfully!' });
      fetchAnnouncements();
      closeDeleteConfirm();
    } catch (err) {
      setMessage({ type: 'error', content: err.data?.message || err.message || 'Failed to delete announcement.' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 md:p-6 bg-white dark:bg-slate-900 rounded-xl shadow-xl text-slate-900 dark:text-slate-50">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">Announcements</h2>
        {canManageAnnouncements && (
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors shadow hover:shadow-md"
          >
            <PlusCircle size={20} className="mr-2" /> Create Announcement
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200 rounded-md flex items-center">
          <AlertTriangle size={20} className="mr-2" /> {error}
        </div>
      )}
      {message.content && (
        <div className={`mb-4 p-3 rounded-md flex items-center text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-200' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
          {message.content}
        </div>
      )}

      {loading && announcements.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-10">Loading announcements...</p>}
      {!loading && announcements.length === 0 && !error && (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold">No Announcements Yet</h3>
          <p className="text-sm">Check back later for updates or create one if you are an administrator.</p>
        </div>
      )}

      {announcements.length > 0 && (
        <div className="space-y-6">
          {announcements.map(ann => (
            <div key={ann._id} className="bg-slate-50 dark:bg-slate-800 p-5 rounded-lg shadow-lg relative">
              <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-2">{ann.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 whitespace-pre-wrap">{ann.content}</p>
              <div className="text-xs text-slate-500 dark:text-slate-500 space-y-1 md:space-y-0 md:flex md:items-center md:space-x-4 mb-3">
                <span className="flex items-center"><CalendarDays size={14} className="mr-1.5 opacity-70" /> Published: {new Date(ann.createdAt).toLocaleDateString()} by {ann.authorName || (ann.author?.name) || 'System'}</span>
                <span className="flex items-center capitalize"><Users size={14} className="mr-1.5 opacity-70" /> Audience: {ann.targetAudience}</span>
                {canManageAnnouncements && (
                    <span className={`flex items-center capitalize ${ann.status === 'published' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {ann.status === 'published' ? <Eye size={14} className="mr-1.5 opacity-70" /> : <EyeOff size={14} className="mr-1.5 opacity-70" />}
                        Status: {ann.status}
                    </span>
                )}
              </div>
              {canManageAnnouncements && (
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button onClick={() => openEditModal(ann)} title="Edit" className="p-1.5 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => openDeleteConfirm(ann)} title="Delete" className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all my-8">
            <h3 className="text-xl font-semibold mb-5 text-slate-800 dark:text-slate-100">{isEditing ? 'Edit Announcement' : 'Create New Announcement'}</h3>
            {message.content && message.type === 'error' && !showDeleteConfirm && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200 rounded-md flex items-center text-sm">
                    <AlertTriangle size={18} className="mr-2 flex-shrink-0" /> {message.content}
                </div>
            )}
            <form onSubmit={handleSaveAnnouncement} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input type="text" name="title" id="title" value={currentAnnouncement?.title || ''} onChange={handleInputChange} required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100" />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                <textarea name="content" id="content" value={currentAnnouncement?.content || ''} onChange={handleInputChange} required rows="6"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"></textarea>
              </div>
              <div>
                <label htmlFor="targetAudience" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Audience</label>
                <select name="targetAudience" id="targetAudience" value={currentAnnouncement?.targetAudience || 'all'} onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                  {targetAudienceOptions.map(opt => <option key={opt} value={opt} className="capitalize">{opt}</option>)}
                </select>
              </div>
              {canManageAnnouncements && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select name="status" id="status" value={currentAnnouncement?.status || 'published'} onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100">
                      {statusOptions.map(opt => <option key={opt} value={opt} className="capitalize">{opt}</option>)}
                    </select>
                  </div>
              )}
              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 dark:disabled:bg-cyan-700/50 rounded-md shadow-sm transition-colors">
                  {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Announcement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && announcementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all">
            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">Confirm Deletion</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to delete the announcement "<strong>{announcementToDelete.title}</strong>"?
            </p>
             {message.content && message.type === 'error' && (
                <div className="mb-3 p-3 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-200 rounded-md flex items-center text-sm">
                    <AlertTriangle size={18} className="mr-2 flex-shrink-0" /> {message.content}
                </div>
            )}
            <div className="flex justify-end space-x-3">
              <button onClick={closeDeleteConfirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-600 hover:bg-slate-200 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
              <button onClick={confirmDeleteAnnouncement} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-700/50 rounded-md shadow-sm transition-colors">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage; 