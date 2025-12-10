import React, { useState } from 'react';
import { X, Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle, Play, CheckCheck, MapPin } from 'lucide-react';
import apiClient from '@/service/apiClient';
import { formatDate } from '@/utils/istUtils';

const RequestDetailModal = ({ request, isOpen, onClose, onUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [helpResponse, setHelpResponse] = useState('');

  if (!isOpen || !request) return null;

  // Using standardized IST utils formatDate function

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
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
        case 'password':
          if (status === 'approved') {
            response = await apiClient.approvePasswordResetRequest(requestId);
          } else if (status === 'rejected') {
            response = await apiClient.rejectPasswordResetRequest(requestId, reviewComment);
          } else {
            throw new Error('Invalid status for password reset request');
          }
          break;
      case 'wfh':
        response = await apiClient.reviewWFHRequest(requestId, status, reviewComment);
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
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Leave Type</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 capitalize mt-1">{request.leaveType}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Leave Date</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1">{formatDate(request.leaveDate, false, 'DD MMMM YYYY')}</p>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Reason</label>
              <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 leading-relaxed">{request.leaveReason}</p>
            </div>
          </div>
        );

      case 'help': {
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
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Subject</label>
              <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-medium">{request.subject}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Category</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 capitalize mt-1">{request.category || 'General'}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Priority</label>
                <div className="mt-1">{getPriorityBadge(request.priority)}</div>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Description</label>
              <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 whitespace-pre-wrap leading-relaxed">{request.description}</p>
            </div>
            {request.response && (
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Previous Response</label>
                <div className="mt-1 p-2 sm:p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap leading-relaxed">{request.response}</p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'regularization': {
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Date</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-medium">{formatDate(request.date, false, 'DD MMMM YYYY')}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Type</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 capitalize mt-1">Attendance Regularization</p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested Check-in
                </label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-mono">
                  {request.requestedCheckIn ? formatDateTime(request.requestedCheckIn) : 'Not specified'}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Requested Check-out
                </label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-mono">
                  {request.requestedCheckOut ? formatDateTime(request.requestedCheckOut) : 'Not specified'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Reason</label>
              <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 leading-relaxed">{request.reason}</p>
            </div>
          </div>
        );
      }

      case 'password': {
        // Check if token is expired
        // const isTokenExpired = request.resetTokenExpires && new Date(request.resetTokenExpires) < new Date();
        // const isRequestExpired = request.status === 'expired' || isTokenExpired;

        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Email</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-mono">{request.email}</p>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Name</label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1">{request.name || 'Not provided'}</p>
              </div>
            </div>

            {/* Token Status and Expiration */}
            {/* <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Reset Token Status</label>
              <div className="mt-1 p-2 sm:p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 font-medium">
                    Token-Based Password Reset
                  </p>
                  {isRequestExpired && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      <AlertCircle className="w-3 h-3" />
                      Expired
                    </span>
                  )}
                </div>

                {request.resetTokenExpires && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                    <p>
                      <strong>Token Expires:</strong> {formatDateTime(request.resetTokenExpires)}
                    </p>
                    {isRequestExpired ? (
                      <p className="text-red-500 dark:text-red-400 font-medium">
                        ⚠️ Token has expired and can no longer be approved
                      </p>
                    ) : request.status === 'approved' ? (
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        ✅ Token is active - User can now reset their password
                      </p>
                    ) : (
                      <p>
                        Once approved, user will receive a secure token to reset their password
                      </p>
                    )}
                  </div>
                )}

                {request.status === 'completed' && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                    ✅ Password has been successfully reset by the user
                  </p>
                )}
              </div>
            </div> */}

            {/* Reset Flow Information */}
            {/* <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Reset Process</label>
              <div className="mt-1 p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p><strong>1.</strong> User submits reset request with name and email</p>
                  <p><strong>2.</strong> Admin reviews and approves/rejects the request</p>
                  <p><strong>3.</strong> If approved, user receives secure token (valid for 24 hours)</p>
                  <p><strong>4.</strong> User uses token to set new password</p>
                </div>
              </div>
            </div> */}
          </div>
        );
      }

      case 'wfh': {
        const formatCoord = (value) => {
          if (typeof value !== 'number') return 'N/A';
          return value.toFixed(5);
        };
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Nearest Office
                </label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-mono">
                  {request.nearestOffice || 'Not detected'}
                </p>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-700/30 p-3 rounded-lg">
                <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Distance from Office
                </label>
                <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 font-mono">
                  {request.distanceFromOffice !== undefined ? `${request.distanceFromOffice} m` : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm text-neutral-600 dark:text-neutral-300">
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Latitude</label>
                <p className="mt-1 font-mono">
                  {formatCoord(request.attemptedLocation?.latitude)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Longitude</label>
                <p className="mt-1 font-mono">
                  {formatCoord(request.attemptedLocation?.longitude)}
                </p>
              </div>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Reason</label>
              <p className="text-sm sm:text-base text-neutral-900 dark:text-neutral-100 mt-1 leading-relaxed">
                {request.reason}
              </p>
            </div>
          </div>
        );
      }

      default:
        return <p className="text-neutral-500">No additional details available.</p>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden mx-2 sm:mx-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-50 dark:bg-neutral-700 rounded-lg flex-shrink-0">
              {React.cloneElement(request.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {request.title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                Request Details & Review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-700 dark:hover:bg-neutral-600 border border-neutral-200 dark:border-neutral-600 shadow-sm hover:shadow transition-all duration-200 flex-shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-180px)] sm:max-h-[calc(90vh-200px)]">
          {/* Employee Info */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm sm:text-base truncate">{request.employee}</p>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Employee</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Submitted</p>
                <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatDateTime(request.date || request.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500" />
              <span className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Status</span>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {/* Request Details */}
          <div className="mb-4 sm:mb-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-neutral-500" />
              <span className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">Request Details</span>
            </div>
            {renderRequestDetails()}
          </div>

          {/* Response/Comment Field */}
          {(() => {
            // Don't show comment field for expired password requests
            if (request.type === 'password') {
              const isTokenExpired = request.resetTokenExpires && new Date(request.resetTokenExpires) < new Date();
              const isRequestExpired = request.status === 'expired' || isTokenExpired;
              return request.status === 'pending' && !isRequestExpired;
            }
            // For other request types, keep original logic
            return request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress');
          })() && (
              <div className="mb-4 sm:mb-6">
                {request.type === 'help' ? (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                      Response Message (Required for resolution)
                    </label>
                    <textarea
                      value={helpResponse}
                      onChange={(e) => setHelpResponse(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                      rows="4"
                      placeholder="Provide a detailed response to help the employee..."
                    />
                  </div>
                )
                  // :
                  //  request.type === 'password' ? (
                  //   <div>
                  //     <label className="block text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                  //       Admin Remarks (Optional)
                  //     </label>
                  //     <textarea
                  //       value={reviewComment}
                  //       onChange={(e) => setReviewComment(e.target.value)}
                  //       className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                  //       rows="2"
                  //       placeholder="Optional remarks for this password reset decision..."
                  //     />
                  //   </div>
                  // ) 
                  : (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
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
        {(() => {
          // Check if password request is expired
          if (request.type === 'password') {
            const isTokenExpired = request.resetTokenExpires && new Date(request.resetTokenExpires) < new Date();
            const isRequestExpired = request.status === 'expired' || isTokenExpired;
            const canTakeAction = request.status === 'pending' && !isRequestExpired;
            return canTakeAction;
          }
          // For other request types, keep original logic
          return request.status === 'pending' || (request.type === 'help' && request.status === 'in-progress');
        })() && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/50">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium transition-colors disabled:opacity-50 text-sm sm:text-base order-2 sm:order-1"
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
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                      {isProcessing ? 'Processing...' : 'Start Working'}
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate('resolved')}
                    disabled={isProcessing || !helpResponse.trim()}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-3"
                    title={!helpResponse.trim() ? 'Response message is required' : ''}
                  >
                    <CheckCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    {isProcessing ? 'Processing...' : 'Resolve'}
                  </button>
                </>
              ) : (
                // Leave, regularization, and password reset request buttons
                <>
                  <button
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
                  >
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    {isProcessing ? 'Processing...' : 'Reject'}
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('approved')}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-3"
                  >
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    {isProcessing ? 'Processing...' : (request.type === 'password' ? 'Approve ' : 'Approve')}
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