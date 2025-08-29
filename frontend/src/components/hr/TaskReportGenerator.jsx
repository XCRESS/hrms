import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import apiClient from '../../service/apiClient';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { ArrowLeft, FileSpreadsheet, Calendar, Users, Download, Sparkles } from 'lucide-react';

const TaskReportGenerator = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getEmployees();
      if (res.employees) {
        setEmployees(res.employees);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setError("Failed to load employees. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter employees based on search term and exclude inactive employees
  const filteredEmployees = employees
    .filter(emp => emp.isActive !== false)
    .filter(emp =>
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Handle employee selection
  const handleEmployeeSelection = (employee) => {
    setSelectedEmployees(prev => {
      const isAlreadySelected = prev.find(emp => emp.employeeId === employee.employeeId);
      if (isAlreadySelected) {
        return prev.filter(emp => emp.employeeId !== employee.employeeId);
      } else {
        return [...prev, employee];
      }
    });
  };

  // Select all filtered employees
  const handleSelectAll = () => {
    setSelectedEmployees(filteredEmployees);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedEmployees([]);
  };

  // Validate form
  const isFormValid = () => {
    return selectedEmployees.length > 0 && dateRange.startDate && dateRange.endDate;
  };

  // Clean task data by removing [Pre-lunch] and [Post-lunch] text
  const cleanTasks = (tasks) => {
    return tasks.map(task => {
      return task
        .replace(/\[Pre-lunch\]/gi, '')
        .replace(/\[Post-lunch\]/gi, '')
        .trim();
    }).filter(task => task.length > 0); // Remove empty tasks after cleaning
  };

  // Generate AI Summary Report
  const generateAIReport = async () => {
    if (!isFormValid()) {
      setError("Please select at least one employee and specify date range.");
      return;
    }

    setIsGeneratingAI(true);
    setError(null);

    try {
      const reportData = [];
      let serialNumber = 1;

      // Fetch task reports for each selected employee
      for (const employee of selectedEmployees) {
        try {
          const params = {
            employeeId: employee.employeeId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 1000
          };

          const res = await apiClient.getTaskReports(params);
          
          if (res.success && res.data.reports && res.data.reports.length > 0) {
            const allTasks = res.data.reports
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .flatMap(report => cleanTasks(report.tasks));

            if (allTasks.length > 0) {
              // Convert bullet points to AI summary
              const bulletPoints = allTasks.map(task => `• ${task}`).join('\n');
              
              try {
                const aiResponse = await apiClient.post('/chat', {
                  message: `Please rewrite this as a single paragraph without bullet points:\n\n${bulletPoints}\n\nResponse format: Write as one continuous paragraph, do not use bullet points.`,
                  conversation_id: null
                });
                
                const summary = aiResponse.data?.response;
                if (!summary) {
                  throw new Error('AI response is empty or invalid');
                }
                
                const singlePara = summary.split('\n\n')[0].trim();
                
                reportData.push({
                  'S.No.': serialNumber++,
                  'Employee Name': employee.fullName,
                  'Summary Report': singlePara
                });
              } catch (aiError) {
                console.error('AI conversion failed:', aiError);
                // Don't add data if AI fails - let error show
                throw aiError;
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch reports for ${employee.fullName}:`, err);
        }
      }

      if (reportData.length === 0) {
        setError("No task reports found for the selected employees and date range.");
        return;
      }

      // Create Excel workbook with AI summaries
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // S.No.
        { wch: 25 }, // Employee Name
        { wch: 60 }  // Summary Report
      ];
      ws['!cols'] = columnWidths;

      // Style the header row
      const headerCells = ['A1', 'B1', 'C1'];
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "AI Task Reports");

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `AI_Task_Reports_${dateRange.startDate}_to_${dateRange.endDate}_${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(wb, filename);

      // Show success message
      setError(null);
      
    } catch (err) {
      console.error("Error generating AI report:", err);
      setError("Failed to generate AI report. Please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Generate Excel report
  const generateReport = async () => {
    if (!isFormValid()) {
      setError("Please select at least one employee and specify date range.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Prepare data for Excel
      const reportData = [];
      let serialNumber = 1;

      // Fetch task reports for each selected employee
      for (const employee of selectedEmployees) {
        try {
          const params = {
            employeeId: employee.employeeId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 1000 // Get all reports in date range
          };

          const res = await apiClient.getTaskReports(params);
          
          if (res.success && res.data.reports && res.data.reports.length > 0) {
            // Combine all tasks for this employee
            const allTasks = res.data.reports
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .flatMap(report => cleanTasks(report.tasks));

            if (allTasks.length > 0) {
              // Format tasks as bullet points
              const summaryReport = allTasks.map(task => `• ${task}`).join('\n');
              
              reportData.push({
                'S.No.': serialNumber++,
                'Employee Name': employee.fullName,
                'Summary Report': summaryReport
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch reports for ${employee.fullName}:`, err);
          // Continue with other employees even if one fails
        }
      }

      if (reportData.length === 0) {
        setError("No task reports found for the selected employees and date range.");
        return;
      }

      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(reportData);

      // Set column widths
      const columnWidths = [
        { wch: 8 },  // S.No.
        { wch: 25 }, // Employee Name
        { wch: 60 }  // Summary Report
      ];
      ws['!cols'] = columnWidths;

      // Style the header row
      const headerCells = ['A1', 'B1', 'C1'];
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            fill: { bgColor: { indexed: 64 }, fgColor: { rgb: "FFFFFF" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      });

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Task Reports");

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const filename = `Task_Reports_${dateRange.startDate}_to_${dateRange.endDate}_${dateStr}.xlsx`;

      // Write and download the file
      XLSX.writeFile(wb, filename);

      // Show success message
      setError(null);
      
    } catch (err) {
      console.error("Error generating report:", err);
      setError("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/task-reports')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Generate Task Reports
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Create Excel reports for employee task summaries
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Selection */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Select Employees
                </h2>
              </div>

              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                  placeholder="Search employees by name, ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isLoading}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={selectedEmployees.length === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Selected Count */}
              {selectedEmployees.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedEmployees.length} employee{selectedEmployees.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Employee List */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                    <span className="ml-2 text-slate-600 dark:text-slate-400">Loading employees...</span>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No employees found matching your search.
                  </p>
                ) : (
                  filteredEmployees.map(employee => {
                    const isSelected = selectedEmployees.find(emp => emp.employeeId === employee.employeeId);
                    return (
                      <div
                        key={employee.employeeId}
                        onClick={() => handleEmployeeSelection(employee)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {employee.fullName}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {employee.employeeId} • {employee.department}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Date Range and Generate */}
          <div className="space-y-6">
            {/* Date Range Selection */}
            <Card className="p-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Date Range
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full"
                    min={dateRange.startDate}
                  />
                </div>
              </div>
            </Card>

            {/* Generate Report */}
            <Card className="p-6 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Generate Report
                </h2>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  <p className="mb-2">Report will include:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Serial number</li>
                    <li>Employee names</li>
                    <li>Task summaries in bullet format</li>
                    <li>Cleaned to remove [Pre-lunch]/[Post-lunch] text labels</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={generateAIReport}
                    disabled={!isFormValid() || isGeneratingAI}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating AI Report...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        AI Generate Report
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={generateReport}
                    disabled={!isFormValid() || isGenerating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4" />
                        Generate Excel Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TaskReportGenerator;