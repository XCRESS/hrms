import { useState, useEffect } from 'react';
import apiClient from '@/service/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TaskReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.getEmployees();
      if (res.employees) {
        setEmployees(res.employees);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchReports = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { ...filters, page, limit: pagination.limit };
      // Clean up empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) {
          delete params[key];
        }
      });

      const res = await apiClient.getTaskReports(params);
      if (res.success) {
        setReports(res.data.reports);
        setPagination(res.data.pagination);
      } else {
        throw new Error(res.message || "Failed to fetch reports");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchReports(1);
  }, []); // Initial fetch

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    fetchReports(1); // Reset to page 1 on new search
  };
  
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
        fetchReports(newPage);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4 sm:p-6 bg-white dark:bg-neutral-800 rounded-xl shadow-xl">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">Employee Task Reports</h1>
      
      {/* Filter Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600">
        <Select onValueChange={(value) => handleFilterChange('employeeId', value === "all" ? '' : value)} value={filters.employeeId || undefined}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by Employee" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.fullName}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Input type="date" placeholder="Start Date" onChange={(e) => handleFilterChange('startDate', e.target.value)} className="w-full"/>
        <Input type="date" placeholder="End Date" onChange={(e) => handleFilterChange('endDate', e.target.value)} className="w-full"/>
        
        <Button onClick={handleSearch} className="w-full">Search</Button>
      </div>

      {/* Reports Table */}
      <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600 overflow-x-auto">
          {isLoading ? (
            <p className="p-4 text-center">Loading reports...</p>
          ) : error ? (
            <p className="p-4 text-center text-red-500">{error}</p>
          ) : (
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tasks</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                {reports.length > 0 ? reports.map(report => (
                  <tr key={report._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{report.employee.firstName} {report.employee.lastName}</div>
                        <div className="text-sm text-neutral-500">{report.employee.employeeId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-300">{formatDate(report.date)}</td>
                    <td className="px-6 py-4">
                      <ul className="list-disc list-inside space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
                        {report.tasks.map((task, index) => <li key={index}>{task}</li>)}
                      </ul>
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan="3" className="text-center py-10 text-neutral-500">No reports found for the selected criteria.</td>
                    </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 gap-4">
          <span className="text-sm text-neutral-600 dark:text-neutral-400 text-center sm:text-left">
              Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2 justify-center sm:justify-end">
              <Button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1 || isLoading}>Previous</Button>
              <Button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages || isLoading}>Next</Button>
          </div>
      </div>
    </div>
  );
};

export default TaskReportsPage; 