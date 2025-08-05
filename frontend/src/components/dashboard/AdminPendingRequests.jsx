import React, { useState, useEffect } from 'react';
import { FileText, HelpCircle, Calendar, RefreshCw } from 'lucide-react';
import apiClient from '@/service/apiClient';
import { useNavigate } from 'react-router-dom';


const AdminPendingRequests = ({ onRefresh }) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      
      const [leaveResponse, helpResponse, regularizationResponse] = await Promise.all([
        apiClient.getAllLeaves().catch(() => ({ success: true, leaves: [] })),
        apiClient.getAllInquiries({ status: 'pending' }).catch(() => ({ success: true, data: { inquiries: [] } })),
        apiClient.getAllRegularizations().catch(() => ({ success: true, regs: [] }))
      ]);

      const allRequests = [];

      if (leaveResponse.success && leaveResponse.leaves) {
        const pendingLeaves = leaveResponse.leaves.filter(leave => leave.status === 'pending');
        allRequests.push(...pendingLeaves.map(leave => ({
          ...leave,
          type: 'leave',
          icon: <Calendar className="w-5 h-5 text-blue-500" />,
          title: `${leave.leaveType} Leave Request`,
          description: leave.leaveReason,
          employee: leave.employeeName || leave.employeeId || 'Unknown Employee',
          date: leave.leaveDate
        })));
      }

      if (helpResponse.success && helpResponse.data?.inquiries) {
        const pendingHelp = helpResponse.data.inquiries.filter(help => help.status === 'pending');
        allRequests.push(...pendingHelp.map(help => ({
          ...help,
          type: 'help',
          icon: <HelpCircle className="w-5 h-5 text-purple-500" />,
          title: help.subject,
          description: help.description,
          employee: help.userId?.name || 'Unknown User',
          date: help.createdAt
        })));
      }

      if (regularizationResponse.success && regularizationResponse.regs) {
        const pendingRegularizations = regularizationResponse.regs.filter(reg => reg.status === 'pending');
        allRequests.push(...pendingRegularizations.map(reg => ({
          ...reg,
          type: 'regularization',
          icon: <RefreshCw className="w-5 h-5 text-orange-500" />,
          title: 'Attendance Regularization',
          description: reg.reason || 'Missing checkout regularization request',
          employee: reg.user?.name || 'Unknown User',
          date: reg.createdAt || reg.date
        })));
      }

      // Sort by date (most recent first)
      allRequests.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRequests(allRequests.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Register refresh function globally for header refresh button
  useEffect(() => {
    window.refreshPendingRequests = fetchPendingRequests;
    
    // Cleanup on unmount
    return () => {
      delete window.refreshPendingRequests;
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200/50 dark:border-neutral-700/50 p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-1">
            Pending Requests
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Employee requests awaiting your review
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-900/20 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400 font-medium text-xs sm:text-sm">
              {requests.length} pending
            </span>
          </div>
          <button 
            onClick={fetchPendingRequests}
            className="p-1.5 sm:p-2 text-neutral-600 dark:text-neutral-300 hover:text-cyan-600 dark:hover:text-cyan-400 bg-neutral-50 dark:bg-neutral-700 rounded-lg shadow-sm hover:shadow-md border border-neutral-200 dark:border-neutral-600 transition-all duration-200 hover:scale-105"
            title="Refresh pending requests"
          >
            <RefreshCw size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 sm:pr-2">
        {requests.length > 0 ? requests.map((request, index) => (
          <div key={index} className="group border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 sm:p-4 hover:bg-gradient-to-r hover:from-neutral-50 hover:to-neutral-100 dark:hover:from-neutral-700/30 dark:hover:to-neutral-800/30 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all duration-200 hover:shadow-md">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 p-1.5 sm:p-2 bg-neutral-50 dark:bg-neutral-700 rounded-lg group-hover:bg-white dark:group-hover:bg-neutral-600 transition-colors">
                {React.cloneElement(request.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
                  <h4 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm leading-tight">
                    {request.title}
                  </h4>
                  <span className="flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-md">
                    {formatDate(request.date)}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 font-medium">
                  {request.employee}
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed ml-10 sm:ml-14">
              {request.description}
            </p>
          </div>
        )) : (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
            </div>
            <p className="text-lg font-medium mb-1">No pending requests</p>
            <p className="text-sm">All requests have been processed</p>
          </div>
        )}
      </div>
      
      {requests.length > 0 && (
        <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-center">
            <button className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors hover:underline">
              <span onClick={() => navigate("/admin/requests")}>View All Requests</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPendingRequests;