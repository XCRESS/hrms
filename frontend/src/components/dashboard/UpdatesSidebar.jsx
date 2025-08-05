import React, { useState, useEffect } from "react";
import { Bell, Calendar, FileText, Shield } from "lucide-react";
import apiClient from "../../service/apiClient";
import PolicyModal from "../ui/PolicyModal";

const UpdatesSidebar = ({ 
  announcements, 
  holidays, 
  username,
  initialActiveTab = "policies",
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Load active policies
  useEffect(() => {
    loadActivePolicies();
  }, []);

  // Update activeTab when initialActiveTab prop changes
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  const loadActivePolicies = async () => {
    setPoliciesLoading(true);
    try {
      const response = await apiClient.getActivePolicies({ limit: 5 });
      if (response.success) {
        setPolicies(response.data || []);
      }
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setPoliciesLoading(false);
    }
  };

  const handlePolicyClick = (policyId) => {
    setSelectedPolicyId(policyId);
    setShowPolicyModal(true);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'Low': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      'Medium': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'High': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    };
    return colors[priority] || colors['Medium'];
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl h-full flex flex-col overflow-hidden min-w-80">
      <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-center sticky top-0 bg-white dark:bg-neutral-800 z-10">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-neutral-100">Updates</h2>
        <div className="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 rounded-full h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm">
          {policies.length}
        </div>
      </div>
      
      <div className="p-2 sm:p-3 sticky top-16 bg-white dark:bg-neutral-800 z-10 shadow-sm">
        <div className="flex rounded-lg bg-gray-100 dark:bg-neutral-700 p-1">
          {[
            {id: 'policies', label: 'Policies'}, 
            {id: 'holidays', label: 'Holidays'}, 
            {id: 'announcements', label: 'Announcements'}
          ].map(tab => (
            <button 
              key={tab.id}
              className={`flex-1 px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 rounded-md ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-neutral-600 text-cyan-600 dark:text-cyan-400 shadow-sm' 
                  : 'text-gray-600 dark:text-neutral-300 hover:text-gray-800 dark:hover:text-neutral-100 hover:bg-white/50 dark:hover:bg-neutral-600/50'
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 sm:p-4">
          {activeTab === 'policies' && (
            <div className="space-y-3 sm:space-y-4">
              {policiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
                  <span className="ml-2 text-xs text-gray-500 dark:text-neutral-400">Loading policies...</span>
                </div>
              ) : policies.length > 0 ? (
                policies.map((policy, index) => (
                  <div 
                    key={policy._id || `policy-${index}`} 
                    className="p-2.5 sm:p-3.5 hover:bg-gray-100/70 dark:hover:bg-neutral-700/60 rounded-lg transition-colors duration-200 cursor-pointer shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-neutral-700"
                    onClick={() => handlePolicyClick(policy._id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-start gap-2">
                        <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <h4 className="font-semibold text-gray-700 dark:text-neutral-100 text-xs sm:text-sm leading-snug">{policy.title}</h4>
                      </div>
                      <span className={`ml-2 flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium ${getPriorityColor(policy.priority)}`}>
                        {policy.priority}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-600 dark:text-neutral-400 mb-2 leading-relaxed line-clamp-2">
                      {policy.content.substring(0, 100)}...
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {policy.category}
                        </span>
                        {policy.acknowledgmentRequired && (
                          <Shield className="h-3 w-3 text-orange-500" title="Acknowledgment Required" />
                        )}
                      </div>
                      <button className="text-cyan-600 dark:text-cyan-400 text-[10px] sm:text-xs hover:underline font-semibold">Read policy</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-neutral-400">No policies available</div>
              )}
            </div>
          )}
          
          {activeTab === 'holidays' && (
            <div className="space-y-2.5 sm:space-y-3.5">
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const upcomingHolidays = holidays.filter(holiday => {
                  const holidayDate = new Date(holiday.date);
                  holidayDate.setHours(0, 0, 0, 0);
                  return holidayDate >= today;
                });
                
                return upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday, index) => (
                    <div key={holiday.id || `holiday-${index}`} className="p-2.5 sm:p-3.5 flex justify-between items-center hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-slate-100 text-xs sm:text-sm">{holiday.name}</h4>
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">{holiday.date}</p>
                      </div>
                      <div className="bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 p-2 sm:p-2.5 rounded-full shadow-sm">
                        <Calendar size={16} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-slate-400">No upcoming holidays</div>
                );
              })()}
            </div>
          )}
          
          {activeTab === 'announcements' && (
            <div className="space-y-3 sm:space-y-4">
              {announcements && announcements.length > 0 ? (
                announcements.map((announcement, index) => (
                  <div key={announcement.id || `announcement-${index}`} className="p-2.5 sm:p-3.5 hover:bg-gray-100/70 dark:hover:bg-slate-700/60 rounded-lg transition-colors duration-200 shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
                    <div className="flex items-start gap-2 sm:gap-3.5">
                      <div className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-semibold shadow-sm">
                        <Bell size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-gray-700 dark:text-slate-100 text-xs sm:text-sm leading-snug">{announcement.title}</h4>
                          {announcement.priority && (
                            <span className={`ml-2 flex-shrink-0 text-[10px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full font-medium ${getPriorityColor(announcement.priority)}`}>
                              {announcement.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 mb-2 leading-relaxed line-clamp-3">
                          {announcement.content}
                        </p>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                            {new Date(announcement.createdAt || announcement.date).toLocaleDateString()}
                          </p>
                          {announcement.author && (
                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400">
                              by {announcement.author}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-slate-400">No announcements</div>
              )}
            </div>
          )}
        </div>
      </div>
      

      {/* Policy Modal */}
      <PolicyModal
        policyId={selectedPolicyId}
        isOpen={showPolicyModal}
        onClose={() => {
          setShowPolicyModal(false);
          setSelectedPolicyId(null);
        }}
      />
    </div>
  );
};

export default UpdatesSidebar; 