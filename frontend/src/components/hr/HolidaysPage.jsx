import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../../service/apiClient';
import useAuth from '../../hooks/authjwt';
import notificationService from '../../service/notificationService';
import { PlusCircle, Edit3, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'; // Using lucide-react for icons

const HolidaysPage = () => {
  const user = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // For fetch errors
  const [message, setMessage] = useState({ type: '', content: '' }); // For CUD operation messages {type: 'success'/'error', content: '...'}

  const [showModal, setShowModal] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState(null); // Stores holiday data for add/edit
  const [isEditing, setIsEditing] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);

  const canManageHolidays = user && (user.role === 'admin' || user.role === 'hr');

  const resetMessages = () => {
    setError(null);
    setMessage({ type: '', content: '' });
  }

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    resetMessages();
    try {
      const response = await apiClient.getHolidays();
      setHolidays(response.holidays || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch holidays.');
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentHoliday(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Format date to YYYY-MM-DD for date input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const openAddModal = () => {
    resetMessages();
    setIsEditing(false);
    setCurrentHoliday({ title: '', date: '', description: '', isOptional: false });
    setShowModal(true);
  };

  const openEditModal = (holiday) => {
    resetMessages();
    setIsEditing(true);
    setCurrentHoliday({ ...holiday, date: formatDateForInput(holiday.date) });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentHoliday(null);
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!currentHoliday || !currentHoliday.title || !currentHoliday.date) {
      setMessage({ type: 'error', content: 'Title and Date are required.' });
      return;
    }
    setLoading(true);
    resetMessages();

    const payload = {
        ...currentHoliday,
        date: new Date(currentHoliday.date).toISOString() // Ensure date is in ISO format for backend
    };

    try {
      let result;
      if (isEditing) {
        result = await apiClient.updateHoliday(currentHoliday._id, payload);
        setMessage({ type: 'success', content: 'Holiday updated successfully!' });
      } else {
        result = await apiClient.createHoliday(payload);
        setMessage({ type: 'success', content: 'Holiday added successfully!' });
      }
      
      // Send PWA notification for holiday creation/update
      try {
        const holidayData = result.holiday || currentHoliday;
        await notificationService.sendHolidayNotification(holidayData);
      } catch (notifyError) {
        console.error('Failed to send PWA notification:', notifyError);
        // Don't show error to user as the main operation succeeded
      }
      
      fetchHolidays();
      closeModal();
    } catch (err) {
      setMessage({ type: 'error', content: err.data?.message || err.message || (isEditing ? 'Failed to update holiday.' : 'Failed to add holiday.') });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (holiday) => {
    resetMessages();
    setHolidayToDelete(holiday);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setHolidayToDelete(null);
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    setLoading(true);
    resetMessages();
    try {
      await apiClient.deleteHoliday(holidayToDelete._id);
      setMessage({ type: 'success', content: 'Holiday deleted successfully!' });
      fetchHolidays();
      closeDeleteConfirm();
    } catch (err) {
      setMessage({ type: 'error', content: err.message || 'Failed to delete holiday.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && holidays.length === 0 && !error && !message.content) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading holidays...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 md:p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl text-slate-900 dark:text-slate-50">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Holiday Management</h2>
        {canManageHolidays && (
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors shadow hover:shadow-md"
          >
            <PlusCircle size={18} className="mr-2" /> Add Holiday
          </button>
        )}
      </div>

      {/* Messages & Errors Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex items-center">
          <AlertTriangle size={20} className="mr-2" /> {error}
        </div>
      )}
      {message.content && (
        <div className={`mb-4 p-3 rounded-md flex items-center ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <XCircle size={20} className="mr-2" />}
          {message.content}
        </div>
      )}
      
      {loading && <div className="text-center text-slate-500 dark:text-slate-400 py-4">Refreshing data...</div>}

      <div className="w-full">
        <table className="w-full text-xs sm:text-sm divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Description</th>
              {canManageHolidays && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {holidays.length === 0 && !loading ? (
              <tr>
                <td colSpan={canManageHolidays ? 5 : 4} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  No holidays found.
                </td>
              </tr>
            ) : (
              holidays.map(holiday => (
                <tr key={holiday._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{holiday.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{new Date(holiday.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${holiday.isOptional ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100'}`}>
                      {holiday.isOptional ? 'Optional' : 'Public'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">{holiday.description || '-'}</td>
                  {canManageHolidays && (
                    <td className="px-4 py-3 whitespace-nowrap space-x-2">
                      <button onClick={() => openEditModal(holiday)} className="text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => openDeleteConfirm(holiday)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all my-8">
            <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">{isEditing ? 'Edit Holiday' : 'Add New Holiday'}</h3>
            <form onSubmit={handleSaveHoliday} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                <input type="text" name="title" id="title" value={currentHoliday?.title || ''} onChange={handleInputChange} required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50" />
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date</label>
                <input type="date" name="date" id="date" value={currentHoliday?.date || ''} onChange={handleInputChange} required
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50" />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                <textarea name="description" id="description" value={currentHoliday?.description || ''} onChange={handleInputChange} rows="3"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"></textarea>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="isOptional" id="isOptional" checked={currentHoliday?.isOptional || false} onChange={handleInputChange}
                  className="h-4 w-4 text-cyan-600 border-slate-300 dark:border-slate-600 rounded focus:ring-cyan-500 bg-white dark:bg-slate-700" />
                <label htmlFor="isOptional" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">Optional Holiday</label>
              </div>
              {message.content && message.type === 'error' && !showDeleteConfirm && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex items-center text-sm">
                    <AlertTriangle size={18} className="mr-2 flex-shrink-0" /> {message.content}
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md shadow-sm transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 dark:disabled:bg-cyan-800 rounded-md shadow-sm transition-colors">
                  {loading ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Holiday')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all">
            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-slate-100">Confirm Deletion</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to delete the holiday "<strong>{holidayToDelete.title}</strong>" on {new Date(holidayToDelete.date).toLocaleDateString()}?
            </p>
            {message.content && message.type === 'error' && (
                <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex items-center text-sm">
                    <AlertTriangle size={18} className="mr-2 flex-shrink-0" /> {message.content}
                </div>
            )}
            <div className="flex justify-end space-x-3">
              <button onClick={closeDeleteConfirm} disabled={loading} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md shadow-sm transition-colors">Cancel</button>
              <button onClick={confirmDeleteHoliday} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 dark:disabled:bg-red-800 rounded-md shadow-sm transition-colors">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysPage; 