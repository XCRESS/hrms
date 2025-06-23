import React, { useEffect, useState } from "react";
import { FileText, Calendar, Eye, X, Plus, Send, Edit, Save, Trash2, PlusCircle } from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "../ui/toast.jsx";

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
  
  // New state for task submission
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitTasks, setSubmitTasks] = useState(['']);
  const [submitDate, setSubmitDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [editTasks, setEditTasks] = useState([]);
  
  const { toast } = useToast();
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
        
        setTotalRecords(response.data.pagination?.total || response.data.reports.length);
        setTotalPages(response.data.pagination?.totalPages || Math.ceil((response.data.total || response.data.reports.length) / recordsPerPage));
      }
    } catch (err) {
      console.error("Failed to fetch task reports:", err);
      setTaskReports([]);
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to load task reports"
      });
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

  const formatDateForInput = (date) => {
    return new Date(date).toISOString().slice(0, 10);
  };

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

  // Task submission handlers
  const handleOpenSubmitModal = () => {
    setSubmitTasks(['']);
    setSubmitDate(new Date().toISOString().slice(0, 10));
    setShowSubmitModal(true);
  };

  const handleTaskChange = (index, value) => {
    const newTasks = [...submitTasks];
    newTasks[index] = value;
    setSubmitTasks(newTasks);
  };

  const handleAddTask = () => {
    setSubmitTasks([...submitTasks, '']);
  };

  const handleRemoveTask = (index) => {
    if (submitTasks.length > 1) {
      const newTasks = submitTasks.filter((_, i) => i !== index);
      setSubmitTasks(newTasks);
    }
  };

  const handleSubmitTasks = async () => {
    const nonEmptyTasks = submitTasks.map(t => t.trim()).filter(t => t !== '');
    if (nonEmptyTasks.length === 0) {
      toast({
        variant: "warning",
        title: "Validation Error",
        description: "Please enter at least one task"
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.submitTaskReport({
        tasks: nonEmptyTasks,
        date: submitDate
      });
      
      if (response.success) {
        toast({
          variant: "success",
          title: "Success",
          description: response.message || "Task report submitted successfully"
        });
        setShowSubmitModal(false);
        setSubmitTasks(['']);
        fetchTaskReports(currentPage); // Refresh the list
      }
    } catch (error) {
      toast({
        variant: "error", 
        title: "Submission Failed",
        description: error.message || "Failed to submit task report"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit functionality
  const handleEditReport = (report) => {
    setEditingReport(report._id);
    setEditTasks([...report.tasks]);
  };

  const handleEditTaskChange = (index, value) => {
    const newTasks = [...editTasks];
    newTasks[index] = value;
    setEditTasks(newTasks);
  };

  const handleAddEditTask = () => {
    setEditTasks([...editTasks, '']);
  };

  const handleRemoveEditTask = (index) => {
    if (editTasks.length > 1) {
      const newTasks = editTasks.filter((_, i) => i !== index);
      setEditTasks(newTasks);
    }
  };

  const handleSaveEdit = async (report) => {
    const nonEmptyTasks = editTasks.map(t => t.trim()).filter(t => t !== '');
    if (nonEmptyTasks.length === 0) {
      toast({
        variant: "warning",
        title: "Validation Error",
        description: "Please enter at least one task"
      });
      return;
    }

    try {
      const response = await apiClient.submitTaskReport({
        tasks: nonEmptyTasks,
        date: formatDateForInput(report.submissionDate)
      });
      
      if (response.success) {
        toast({
          variant: "success",
          title: "Success",
          description: "Task report updated successfully"
        });
        setEditingReport(null);
        fetchTaskReports(currentPage);
      }
    } catch (error) {
      toast({
        variant: "error",
        title: "Update Failed", 
        description: error.message || "Failed to update task report"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setEditTasks([]);
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-800 rounded-xl shadow-xl relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300">My Task Reports</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Submit and manage your daily task reports</p>
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

      {/* Add Task Report Button */}
      <div className="mb-6">
        <button
          onClick={handleOpenSubmitModal}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Task Report</span>
        </button>
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
                  <th className="p-4 text-left font-semibold">Date</th>
                  <th className="p-4 text-left font-semibold">Tasks</th>
                  <th className="p-4 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {taskReports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">No task reports found</p>
                      <p className="text-sm">Start by submitting your first task report</p>
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
                      {editingReport === report._id ? (
                        <div className="space-y-2">
                          {editTasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex items-center gap-2">
                              <span className="text-purple-400">•</span>
                              <input
                                type="text"
                                value={task}
                                onChange={(e) => handleEditTaskChange(taskIndex, e.target.value)}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                                placeholder={`Task ${taskIndex + 1}`}
                              />
                              {editTasks.length > 1 && (
                                <button
                                  onClick={() => handleRemoveEditTask(taskIndex)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={handleAddEditTask}
                            className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-1"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Add Task
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {report.tasks?.slice(0, 2).map((task, taskIndex) => (
                            <div key={taskIndex} className="flex items-start space-x-2 text-sm">
                              <span className="text-purple-400 mt-1">•</span>
                              <span className="text-gray-900 dark:text-gray-100">{task}</span>
                            </div>
                          ))}
                          {report.tasks?.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{report.tasks.length - 2} more tasks
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {editingReport === report._id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(report)}
                              className="px-2 py-1 bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-300 rounded text-xs font-medium hover:bg-green-200 dark:hover:bg-green-600/30 transition-colors flex items-center space-x-1"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600/30 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleViewTasks(report)}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-600/30 transition-colors flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleEditReport(report)}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-600/30 transition-colors flex items-center space-x-1"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </>
                        )}
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
                <p className="text-sm">Start by submitting your first task report</p>
              </div>
            ) : taskReports.map((report, index) => (
              <div key={report._id || index} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatDate(report.submissionDate)}</span>
                  </div>
                </div>
                
                {editingReport === report._id ? (
                  <div className="space-y-3 mb-4">
                    {editTasks.map((task, taskIndex) => (
                      <div key={taskIndex} className="flex items-center gap-2">
                        <span className="text-purple-400">•</span>
                        <input
                          type="text"
                          value={task}
                          onChange={(e) => handleEditTaskChange(taskIndex, e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-600 text-gray-900 dark:text-gray-100"
                          placeholder={`Task ${taskIndex + 1}`}
                        />
                        {editTasks.length > 1 && (
                          <button
                            onClick={() => handleRemoveEditTask(taskIndex)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleAddEditTask}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Add Task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 mb-4">
                    {report.tasks?.slice(0, 2).map((task, taskIndex) => (
                      <div key={taskIndex} className="flex items-start space-x-2 text-sm">
                        <span className="text-purple-400 mt-1">•</span>
                        <span className="text-gray-900 dark:text-gray-100">{task}</span>
                      </div>
                    ))}
                    {report.tasks?.length > 2 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{report.tasks.length - 2} more tasks
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  {editingReport === report._id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(report)}
                        className="px-3 py-1 bg-green-100 dark:bg-green-600/20 text-green-700 dark:text-green-300 rounded text-xs font-medium hover:bg-green-200 dark:hover:bg-green-600/30 transition-colors flex items-center space-x-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600/30 transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleViewTasks(report)}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 rounded text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-600/30 transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleEditReport(report)}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 rounded text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-600/30 transition-colors flex items-center space-x-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </>
                  )}
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

      {/* Floating Action Button */}
      <button
        onClick={handleOpenSubmitModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40"
        title="Submit Task Report"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Task Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 lg:p-8 w-full max-w-md m-4 transform transition-all duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Submit Task Report</h2>
              <button 
                onClick={() => setShowSubmitModal(false)} 
                className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                type="date"
                value={submitDate}
                onChange={(e) => setSubmitDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              List the tasks you completed on this date.
            </p>
            
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                {submitTasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-purple-400">•</span>
                    <input
                      type="text"
                      placeholder={`Task ${index + 1}`}
                      value={task}
                      onChange={(e) => handleTaskChange(index, e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                      required
                    />
                    {submitTasks.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTask(index)} 
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-start pt-2">
                <button 
                  type="button" 
                  onClick={handleAddTask} 
                  className="flex items-center gap-2 px-3 py-1 text-sm text-purple-600 hover:text-purple-700 border border-purple-300 hover:border-purple-400 rounded-lg transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Task
                </button>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSubmitTasks}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
                </button>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
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