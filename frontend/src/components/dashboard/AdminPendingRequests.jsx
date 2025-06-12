import { useState, useEffect } from 'react';
import { FileText, HelpCircle, Calendar } from 'lucide-react';
import apiClient from '@/service/apiClient';

const AdminPendingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true);
      
      const [leaveResponse, helpResponse] = await Promise.all([
        apiClient.getAllLeaves().catch(() => ({ success: true, leaves: [] })),
        apiClient.getAllInquiries({ status: 'pending' }).catch(() => ({ success: true, data: { inquiries: [] } }))
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
          employee: leave.employeeId
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
          employee: help.userId?.name || 'Unknown User'
        })));
      }

      setRequests(allRequests.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoading(false);
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
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          Pending Requests
        </h3>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {requests.length} pending
        </span>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {requests.length > 0 ? requests.map((request, index) => (
          <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              {request.icon}
              <div className="flex-1">
                <h4 className="font-medium text-neutral-800 dark:text-neutral-100">
                  {request.title}
                </h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {request.employee}
                </p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
              {request.description}
            </p>
          </div>
        )) : (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending requests found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPendingRequests;