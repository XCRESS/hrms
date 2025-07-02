import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  HelpCircle, 
  Clock, 
  Key, 
  Filter,
  Search,
  RefreshCw,
  FileText,
  User,
  Clock4,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import apiClient from "../../service/apiClient";
import { useToast } from "../ui/toast";
import useAuth from "../../hooks/authjwt";
import BackButton from "../ui/BackButton";

const AdminRequestsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  
  // Edit states for different request types
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const user = useAuth();
  const { toast } = useToast();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const tabs = [
    { id: 'all', label: 'All Requests', icon: FileText },
    { id: 'leave', label: 'Leave Requests', icon: Calendar },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
    { id: 'regularization', label: 'Regularization', icon: Clock },
    { id: 'password', label: 'Password Resets', icon: Key }
  ];

  const loadRequests = async () => {
    if (!isAdminOrHR) return;
    
    setLoading(true);
    try {
      const allRequests = [];
      let usersData = [];

      // Load users data for reference
      try {
        const usersResponse = await apiClient.getAllUsers();
        usersData = usersResponse.users || [];
        setUsers(usersData);
      } catch (error) {
        console.error('Failed to load users:', error);
      }

      // Load leave requests
      if (activeTab === 'all' || activeTab === 'leave') {
        try {
          const leaveResponse = await apiClient.getAllLeaves();
          const leaves = leaveResponse.leaves || [];
          const formattedLeaves = leaves.map(leave => {
            const userInfo = usersData.find(u => u.employeeId === leave.employeeId);
            return {
              ...leave,
              type: 'leave',
              title: `${leave.leaveType} Leave`,
              description: leave.leaveReason || leave.reason || '',
              date: new Date(leave.leaveDate || leave.date),
              createdAt: new Date(leave.createdAt || leave.requestDate || Date.now()),
              status: leave.status || 'pending',
              user: userInfo ? { name: userInfo.name, email: userInfo.email } : null
            };
          });
          allRequests.push(...formattedLeaves);
        } catch (error) {
          console.error('Failed to load leave requests:', error);
        }
      }

      // Load help requests
      if (activeTab === 'all' || activeTab === 'help') {
        try {
          const helpResponse = await apiClient.getAllInquiries();
          const helpRequests = helpResponse.data?.inquiries || helpResponse.inquiries || [];
          const formattedHelp = helpRequests.map(help => ({
            ...help,
            type: 'help',
            title: help.subject || help.title || 'Help Request',
            description: help.description || help.message || '',
            date: new Date(help.createdAt || Date.now()),
            createdAt: new Date(help.createdAt || Date.now()),
            status: help.status || 'pending',
            user: help.userId ? { name: help.userId.name, email: help.userId.email } : null
          }));
          allRequests.push(...formattedHelp);
        } catch (error) {
          console.error('Failed to load help requests:', error);
        }
      }

      // Load regularization requests
      if (activeTab === 'all' || activeTab === 'regularization') {
        try {
          const regResponse = await apiClient.getAllRegularizations();
          const regRequests = regResponse.regs || [];
          const formattedReg = regRequests.map(reg => {
            let timeInfo = '';
            if (reg.requestedCheckIn) {
              timeInfo += `Check-in: ${new Date(reg.requestedCheckIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            }
            if (reg.requestedCheckOut) {
              timeInfo += timeInfo ? ` | Check-out: ${new Date(reg.requestedCheckOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : `Check-out: ${new Date(reg.requestedCheckOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            }
            if (!timeInfo && reg.reason) {
              timeInfo = reg.reason;
            } else if (timeInfo && reg.reason) {
              timeInfo += ` - ${reg.reason}`;
            }
            
            return {
              ...reg,
              type: 'regularization',
              title: 'Attendance Regularization',
              description: timeInfo || 'No details provided',
              date: new Date(reg.date),
              createdAt: new Date(reg.createdAt || Date.now()),
              status: reg.status || 'pending',
              user: reg.user ? { name: reg.user.name, email: reg.user.email } : null
            };
          });
          allRequests.push(...formattedReg);
        } catch (error) {
          console.error('Failed to load regularization requests:', error);
        }
      }

      // Load password reset requests
      if (activeTab === 'all' || activeTab === 'password') {
        try {
          const passwordResponse = await apiClient.getAllPasswordResetRequests();
          const passwordRequests = passwordResponse.requests || [];
          const formattedPassword = passwordRequests.map(pwd => ({
            ...pwd,
            type: 'password',
            title: 'Password Reset Request',
            description: `User: ${pwd.email || 'Unknown'}`,
            date: new Date(pwd.createdAt || Date.now()),
            createdAt: new Date(pwd.createdAt || Date.now()),
            status: pwd.status || 'pending',
            user: { name: pwd.name, email: pwd.email }
          }));
          allRequests.push(...formattedPassword);
        } catch (error) {
          console.error('Failed to load password reset requests:', error);
        }
      }

      // Sort by most recent first
      allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(allRequests);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load requests. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrHR) {
      loadRequests();
    }
  }, [activeTab, isAdminOrHR]);

  const filteredRequests = requests.filter(request => {
    const matchesTab = activeTab === 'all' || request.type === activeTab;
    const matchesEmployee = employeeFilter === 'all' || 
      (request.user?.name && request.user.name.toLowerCase().includes(employeeFilter.toLowerCase())) ||
      (request.user?.email && request.user.email.toLowerCase().includes(employeeFilter.toLowerCase()));
    return matchesTab && matchesEmployee;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'leave': return Calendar;
      case 'help': return HelpCircle;
      case 'regularization': return Clock;
      case 'password': return Key;
      default: return FileText;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle editing states
  const handleEdit = (id, field, value) => {
    setEditing(editing => ({
      ...editing,
      [id]: { ...editing[id], [field]: value }
    }));
  };

  const handleStartEdit = (request) => {
    setEditing(e => ({ 
      ...e, 
      [request._id]: { 
        status: request.status, 
        response: request.response || request.reviewComment || "" 
      } 
    }));
  };

  const handleCancelEdit = (id) => {
    setEditing(e => { 
      const copy = { ...e }; 
      delete copy[id]; 
      return copy; 
    });
  };

  const handleSave = async (request) => {
    setSaving(s => ({ ...s, [request._id]: true }));
    try {
      const editData = editing[request._id] || {};
      
      if (request.type === 'leave') {
        await apiClient.updateLeaveStatus(request._id, editData.status);
      } else if (request.type === 'help') {
        await apiClient.updateHelpInquiry(request._id, { 
          status: editData.status, 
          response: editData.response 
        });
      } else if (request.type === 'regularization') {
        await apiClient.reviewRegularization(request._id, editData.status, editData.response);
      }
      
      toast({
        variant: "success",
        title: "Request Updated",
        description: "The request has been updated successfully."
      });
      
      handleCancelEdit(request._id);
      loadRequests();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update request."
      });
    } finally {
      setSaving(s => ({ ...s, [request._id]: false }));
    }
  };

  const handlePasswordAction = async (requestId, action) => {
    setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: true }));
    try {
      if (action === 'approve') {
        await apiClient.approvePasswordResetRequest(requestId);
        toast({
          variant: "success",
          title: "Request Approved",
          description: "Password reset request has been approved."
        });
      } else if (action === 'reject') {
        await apiClient.rejectPasswordResetRequest(requestId, 'Rejected by administrator.');
        toast({
          variant: "success",
          title: "Request Rejected",
          description: "Password reset request has been rejected."
        });
      }
      loadRequests();
    } catch (error) {
      toast({
        variant: "destructive",
        title: `${action} Failed`,
        description: error.message || `Failed to ${action} request.`
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`${requestId}_${action}`]: false }));
    }
  };

  if (!isAdminOrHR) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <BackButton label="Back to Dashboard" variant="ghost" />
          <div className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">Access Denied</h2>
            <p className="text-slate-500 dark:text-slate-400">You don't have permission to view this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <BackButton label="Back" variant="ghost" className="w-auto" />
            
            <Button
              onClick={loadRequests}
              variant="outline"
              disabled={loading}
              className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                Manage Requests
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Review and manage all employee requests
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    isActive
                      ? 'border-slate-500 text-slate-600 dark:text-slate-300'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Employee Filter */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <User className="h-4 w-4 text-slate-500" />
              <Input
                placeholder="Filter by employee name or email..."
                value={employeeFilter === 'all' ? '' : employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value || 'all')}
                className="max-w-sm border-slate-200 dark:border-slate-700"
              />
              {employeeFilter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmployeeFilter('all')}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>


        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
              <p className="text-slate-500 dark:text-slate-400">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  No requests found
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  No requests to review at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const Icon = getTypeIcon(request.type);
              const isEditing = !!editing[request._id];
              
              return (
                <Card key={`${request.type}-${request._id}`} className="border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                            <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-100 mb-1">
                              {request.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                              {request.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(request.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock4 className="h-3 w-3" />
                                {formatTime(request.createdAt)}
                              </span>
                              {request.user && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {request.user.name || request.user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:items-end gap-2">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      {/* Action buttons and editing interface */}
                      {request.type === 'password' ? (
                        request.status === 'pending' && (
                          <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <Button
                              onClick={() => handlePasswordAction(request._id, 'approve')}
                              disabled={actionLoading[`${request._id}_approve`]}
                              className="bg-slate-600 hover:bg-slate-700 text-white"
                              size="sm"
                            >
                              {actionLoading[`${request._id}_approve`] ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              onClick={() => handlePasswordAction(request._id, 'reject')}
                              disabled={actionLoading[`${request._id}_reject`]}
                              className="bg-slate-500 hover:bg-slate-600 text-white"
                              size="sm"
                            >
                              {actionLoading[`${request._id}_reject`] ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </div>
                        )
                      ) : (
                        <>
                          {isEditing ? (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Select 
                                  value={editing[request._id]?.status || request.status} 
                                  onValueChange={(value) => handleEdit(request._id, "status", value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {request.type === 'leave' ? (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </>
                                    ) : request.type === 'help' ? (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in-progress">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                      </>
                                    ) : (
                                      <>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                                
                                {(request.type === 'help' || request.type === 'regularization') && (
                                  <Input
                                    placeholder="Response/Comment"
                                    value={editing[request._id]?.response || ""}
                                    onChange={(e) => handleEdit(request._id, "response", e.target.value)}
                                  />
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleSave(request)}
                                  disabled={saving[request._id]}
                                  className="bg-slate-600 hover:bg-slate-700 text-white"
                                  size="sm"
                                >
                                  {saving[request._id] ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  onClick={() => handleCancelEdit(request._id)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            request.status === 'pending' && (
                              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                <Button
                                  onClick={() => handleStartEdit(request)}
                                  className="bg-slate-600 hover:bg-slate-700 text-white"
                                  size="sm"
                                >
                                  Review Request
                                </Button>
                              </div>
                            )
                          )}
                          
                          {(request.response || request.reviewComment) && !isEditing && (
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                <span className="font-medium">Response:</span> {request.response || request.reviewComment}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequestsPage;