import React, { useEffect, useState } from "react";
import { FileText, Calendar, Eye, X } from "lucide-react";
import apiClient from "../../service/apiClient";

export default function MyTaskReports() {
  const [taskReports, setTaskReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });
  const [selectedReport, setSelectedReport] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  const recordsPerPage = 10;

  const fetchTaskReports = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: recordsPerPage,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      };
      
      const response = await apiClient.getMyTaskReports(params);
      if (response.success && response.data?.reports) {
        setTaskReports(response.data.reports.map(report => ({
          ...report,
          createdAt: new Date(report.createdAt),
          submissionDate: report.date ? new Date(report.date) : new Date(report.createdAt)
        })));
        
        setTotalRecords(response.data.total || response.data.reports.length);
        setTotalPages(Math.ceil((response.data.total || response.data.reports.length) / recordsPerPage));
      }
    } catch (err) {
      console.error("Failed to fetch task reports:", err);
      setTaskReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskReports(currentPage);
  }, [currentPage, dateRange]);

  const formatDate = (date) => new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  }).format(date);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleViewTasks = (report) => {
    setSelectedReport(report);
    setShowTaskModal(true);
  };

  const closeModal = () => {
    setShowTaskModal(false);
    setSelectedReport(null);
  };

  return (
    <div className="max-w-5xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300">My Task Reports</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">View your submitted daily task reports</p>
          </div>
        </div>
        
        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center space-x-2 text-gray-500 dark:text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span>Loading task reports...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl">
              <thead>
                <tr className="bg-purple-50 dark:bg-slate-700 text-purple-700 dark:text-purple-300">
                  <th className="p-4 text-left font-semibold">Submission Date</th>
                  <th className="p-4 text-left font-semibold">Tasks Completed</th>
                </tr>
              </thead>
              <tbody>
                {taskReports.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">No task reports found</p>
                      <p className="text-sm">No reports submitted for the selected date range</p>
                    </td>
                  </tr>
                ) : taskReports.map((report, index) => (
                  <tr key={report._id || index} className="border-b border-gray-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <span className="font-medium">{formatDate(report.submissionDate)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {report.tasks?.length || 0} tasks completed
                        </span>
                        <button 
                          onClick={() => handleViewTasks(report)}
                          className="px-3 py-1 bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-600/30 transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {taskReports.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">No task reports found</p>
                <p className="text-sm">No reports submitted for the selected date range</p>
              </div>
            ) : taskReports.map((report, index) => (
              <div key={report._id || index} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(report.submissionDate)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {report.tasks?.length || 0} tasks completed
                  </span>
                  <button 
                    onClick={() => handleViewTasks(report)}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-600/30 transition-colors flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-0">
                Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, totalRecords)} of {totalRecords} reports
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Task Details Modal */}
      {showTaskModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Tasks for {formatDate(selectedReport.submissionDate)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedReport.tasks?.length || 0} tasks completed
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedReport.tasks && selectedReport.tasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedReport.tasks.map((task, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                          {task}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p>No tasks recorded for this report</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 