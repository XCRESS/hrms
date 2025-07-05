import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  HelpCircle, 
  Clock, 
  Key, 
  Plus, 
  Filter,
  Search,
  RefreshCw,
  FileText,
  User,
  Clock4
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
import LeaveRequestModal from "../LeaveRequestModal";
import HelpDeskModal from "../HelpDeskModal";
import RegularizationModal from "../dashboard/RegularizationModal";

const RequestsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  
  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRegularizationModal, setShowRegularizationModal] = useState(false);

  const user = useAuth();
  const { toast } = useToast();
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';

  const tabs = [
    { id: 'all', label: 'All Requests', icon: FileText },
    { id: 'leave', label: 'Leave Requests', icon: Calendar },
    { id: 'help', label: 'Help Desk', icon: HelpCircle },
    { id: 'regularization', label: 'Regularization', icon: Clock }
  ];

  const loadRequests = async () => {
    setLoading(true);
    try {
      const allRequests = [];

      // Load leave requests
      if (activeTab === 'all' || activeTab === 'leave') {
        try {
          const leaveResponse = isAdminOrHR 
            ? await apiClient.getAllLeaves() 
            : await apiClient.getMyLeaves();
          const leaves = leaveResponse.leaves || leaveResponse.data?.leaves || leaveResponse.data || [];
          const formattedLeaves = leaves.map(leave => ({
            ...leave,
            type: 'leave',
            title: `${leave.leaveType} Leave`,
            description: leave.leaveReason || leave.reason || '',
            date: new Date(leave.leaveDate || leave.date),
            createdAt: new Date(leave.createdAt || leave.requestDate || Date.now()),
            status: leave.status || 'pending'
          }));
          allRequests.push(...formattedLeaves);
        } catch (error) {
          console.error('Failed to load leave requests:', error);
        }
      }

      // Load help requests
      if (activeTab === 'all' || activeTab === 'help') {
        try {
          const helpResponse = isAdminOrHR 
            ? await apiClient.getAllInquiries() 
            : await apiClient.getMyInquiries();
          const helpRequests = helpResponse.inquiries || helpResponse.data?.inquiries || helpResponse.data || [];
          const formattedHelp = helpRequests.map(help => ({
            ...help,
            type: 'help',
            title: help.subject || help.title || 'Help Request',
            description: help.description || help.message || '',
            date: new Date(help.createdAt || Date.now()),
            createdAt: new Date(help.createdAt || Date.now()),
            status: help.status || 'pending'
          }));
          allRequests.push(...formattedHelp);
        } catch (error) {
          console.error('Failed to load help requests:', error);
        }
      }

      // Load regularization requests
      if (activeTab === 'all' || activeTab === 'regularization') {
        try {
          const regResponse = isAdminOrHR 
            ? await apiClient.getAllRegularizations() 
            : await apiClient.getMyRegularizations();
          const regRequests = regResponse.regs || regResponse.data?.regs || regResponse.data || [];
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
              status: reg.status || 'pending'
            };
          });
          allRequests.push(...formattedReg);
        } catch (error) {
          console.error('Failed to load regularization requests:', error);
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
    loadRequests();
  }, [activeTab]);

  const filteredRequests = requests.filter(request => {
    const matchesTab = activeTab === 'all' || request.type === activeTab;
    return matchesTab;
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

  const handleNewRequest = (type) => {
    switch (type) {
      case 'leave':
        setShowLeaveModal(true);
        break;
      case 'help':
        setShowHelpModal(true);
        break;
      case 'regularization':
        setShowRegularizationModal(true);
        break;
      default:
        break;
    }
  };

  const handleRequestSubmit = async (data, type) => {
    try {
      switch (type) {
        case 'leave':
          await apiClient.requestLeave(data);
          setShowLeaveModal(false);
          break;
        case 'help':
          const helpData = {
            subject: data.title,
            description: data.message,
            category: data.category,
            priority: data.priority
          };
          await apiClient.submitHelpInquiry(helpData);
          setShowHelpModal(false);
          break;
        case 'regularization':
          await apiClient.requestRegularization(data);
          setShowRegularizationModal(false);
          break;
      }
      
      toast({
        variant: "success",
        title: "Request Submitted",
        description: `Your ${type} request has been submitted successfully.`
      });
      
      loadRequests(); // Refresh the list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || `Failed to submit ${type} request.`
      });
    }
  };

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
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                  My Requests
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  View and manage all your requests in one place
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleNewRequest('leave')}
                className="bg-slate-600 hover:bg-slate-700 text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                New Leave
              </Button>
              <Button
                onClick={() => handleNewRequest('help')}
                className="bg-slate-600 hover:bg-slate-700 text-white"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Request
              </Button>
              <Button
                onClick={() => handleNewRequest('regularization')}
                className="bg-slate-600 hover:bg-slate-700 text-white"
              >
                <Clock className="h-4 w-4 mr-2" />
                Regularization
              </Button>
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


        {/* Requests Grid */}
        <div>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  No requests found
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Start by creating your first request using the buttons above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRequests.map((request) => {
                const Icon = getTypeIcon(request.type);
                return (
                  <Card key={`${request.type}-${request._id}`} className="border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-800">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            request.type === 'leave' ? 'bg-slate-100 dark:bg-slate-700' :
                            request.type === 'help' ? 'bg-slate-100 dark:bg-slate-700' :
                            request.type === 'regularization' ? 'bg-slate-100 dark:bg-slate-700' :
                            'bg-slate-100 dark:bg-slate-700'
                          }`}>
                            <Icon className={`h-4 w-4 ${
                              request.type === 'leave' ? 'text-slate-600 dark:text-slate-400' :
                              request.type === 'help' ? 'text-slate-600 dark:text-slate-400' :
                              request.type === 'regularization' ? 'text-slate-600 dark:text-slate-400' :
                              'text-slate-600 dark:text-slate-400'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-slate-700 dark:text-slate-100 mb-1 text-sm">
                              {request.title}
                            </h3>
                            <Badge className={`${getStatusColor(request.status)} text-xs`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                          {request.description}
                        </p>
                        
                        <div className="flex flex-col gap-2 text-xs text-slate-400 dark:text-slate-500">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(request.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock4 className="h-3 w-3" />
                              {formatTime(request.createdAt)}
                            </span>
                          </div>
                          {isAdminOrHR && request.user && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {request.user.name || request.user.email}
                            </span>
                          )}
                        </div>
                        
                        {request.reviewComment && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 p-2 bg-slate-50 dark:bg-slate-700 rounded">
                            {request.reviewComment}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <LeaveRequestModal 
        isOpen={showLeaveModal} 
        onClose={() => setShowLeaveModal(false)}
        onSubmit={(data) => handleRequestSubmit(data, 'leave')}
        isLoading={false}
      />
      
      <HelpDeskModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onSubmit={(data) => handleRequestSubmit(data, 'help')}
        isLoading={false}
      />
      
      <RegularizationModal 
        isOpen={showRegularizationModal} 
        onClose={() => setShowRegularizationModal(false)}
        onSuccess={() => {
          toast({
            variant: "success",
            title: "Regularization Request Submitted",
            description: "Your attendance regularization request has been submitted."
          });
          loadRequests();
        }}
      />
    </div>
  );
};

export default RequestsPage;