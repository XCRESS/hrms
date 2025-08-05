import React, { useState } from 'react';
import { X, Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle, Play, CheckCheck } from 'lucide-react';
import apiClient from '@/service/apiClient';

const RequestDetailModal = ({ request, isOpen, onClose, onUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [helpResponse, setHelpResponse] = useState('');

  if (!isOpen || !request) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleStatusUpdate = async (status) => {
    if (!request._id && !request.id) {
      console.error('Request ID is missing');
      return;
    }

    setIsProcessing(true);
    try {
      let response;
      const requestId = request._id || request.id;

      switch (request.type) {
        case 'leave':
          response = await apiClient.updateLeaveStatus(requestId, status);
          break;
        case 'help':
          response = await apiClient.updateHelpInquiry(requestId, { 
            status,
            response: helpResponse || undefined
          });
          break;
        case 'regularization':
          response = await apiClient.reviewRegularization(requestId, status, reviewComment);
          break;
        default:
          throw new Error('Unknown request type');
      }

      if (response.success) {
        onUpdate();
        onClose();
      } else {
        console.error('Failed to update request:', response);
        alert('Failed to update request status');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Error updating request status');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: AlertCircle },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: XCircle },
      'in-progress': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: Play },
      resolved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCheck }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderRequestDetails = () => {
    switch (request.type) {
      case 'leave':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Leave Type</label>
                <p className="text-neutral-900 dark:text-neutral-100 capitalize">{request.leaveType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Leave Date</label>
                <p className="text-neutral-900 dark:text-neutral-100">{formatDate(request.leaveDate)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Reason</label>
              <p className="text-neutral-900 dark:text-neutral-100 mt-1">{request.leaveReason}</p>
            </div>
          </div>
        );
      
      case 'help':
        const getPriorityBadge = (priority) => {
          const priorityConfig = {
            low: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' },
            medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' },
            high: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
          };
          const config = priorityConfig[priority] || priorityConfig.medium;
          return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
              {priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'}
            </span>
          );
        };

        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Subject</label>
              <p className="text-neutral-900 dark:text-neutral-100">{request.subject}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Category</label>
                <p className="text-neutral-900 dark:text-neutral-100 capitalize">{request.category || 'General'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Priority</label>
                <div className="mt-1">{getPriorityBadge(request.priority)}</div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Description</label>
              <p className="text-neutral-900 dark:text-neutral-100 mt-1 whitespace-pre-wrap">{request.description}</p>
            </div>
            {request.response && (
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Previous Response</label>
                <div className="mt-1 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{request.response}</p>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'regularization':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Date</label>
                <p className="text-neutral-900 dark:text-neutral-100">{formatDate(request.date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Type</label>
                <p className="text-neutral-900 dark:text-neutral-100 capitalize">{request.type || 'Missing Checkout'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Reason</label>
              <p className="text-neutral-900 dark:text-neutral-100 mt-1">{request.reason}</p>
            </div>
          </div>
        );
      
      default:
        return <p className="text-neutral-500">No additional details available.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
              {React.cloneElement(request.icon, { className: "w-5 h-5" })}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {request.title}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Request Details & Review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Employee Info */}
          <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-neutral-500" />
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{request.employee}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Employee</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Submitted</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDateTime(request.date || request.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Status</span>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {/* Request Details */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Request Details</span>
            </div>
            {renderRequestDetails()}
          </div>

          {/* Response/Comment Field */}
          {(request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress')) && (
            <div className="mb-6">
              {request.type === 'help' ? (
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Response Message {request.type === 'help' && '(Required for resolution)'}
                  </label>
                  <textarea
                    value={helpResponse}
                    onChange={(e) => setHelpResponse(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    rows="4"
                    placeholder="Provide a detailed response to help the employee..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Review Comment (Optional)
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                    rows="3"
                    placeholder="Add a comment for this review..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress')) && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/50">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            {request.type === 'help' ? (
              // Help request buttons
              <>
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleStatusUpdate('in-progress')}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Start Working'}
                  </button>
                )}
                <button
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={isProcessing || !helpResponse.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!helpResponse.trim() ? 'Response message is required' : ''}
                >
                  <CheckCheck className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Resolve'}
                </button>
              </>
            ) : (
              // Leave and regularization request buttons
              <>
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Approve'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetailModal;