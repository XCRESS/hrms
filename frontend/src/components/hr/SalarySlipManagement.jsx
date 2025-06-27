import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Receipt,
  Users,
  Calendar,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";
import SalarySlipForm from "./SalarySlipForm";
import SalarySlipCard from "./SalarySlipCard";
import SalarySlipFilters from "./SalarySlipFilters";
import BulkSalaryGeneration from "./BulkSalaryGeneration";

const SalarySlipManagement = () => {
  const [loading, setLoading] = useState(false);
  const [salarySlips, setSalarySlips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulkGeneration, setShowBulkGeneration] = useState(false);
  const [editingSlip, setEditingSlip] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // Filters
  const [filters, setFilters] = useState({
    employeeId: 'all',
    month: 'all',
    year: new Date().getFullYear(),
    search: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  const { toast } = useToast();
  const user = useAuth();

  // Months array
  const months = [
    { value: 'all', label: 'All Months' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Load data on component mount and filter changes
  useEffect(() => {
    loadSalarySlips();
    loadEmployees();
  }, [filters, pagination.currentPage]);

  const loadSalarySlips = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(filters.employeeId && filters.employeeId !== 'all' && { employeeId: filters.employeeId }),
        ...(filters.month && filters.month !== 'all' && { month: filters.month }),
        ...(filters.year && { year: filters.year }),
        ...(filters.search && { search: filters.search })
      };

      const response = await apiClient.getAllSalarySlips(params);
      if (response.success) {
        setSalarySlips(response.data.salarySlips);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load salary slips",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await apiClient.getEmployees();
      if (response.employees) {
        setEmployees(response.employees);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  const handleCreateNew = (employeeId = '') => {
    setSelectedEmployeeId(employeeId);
    setEditingSlip(null);
    setShowForm(true);
  };

  const handleEdit = (slip) => {
    setEditingSlip(slip);
    setSelectedEmployeeId('');
    setShowForm(true);
  };

  const handleDelete = async (slip) => {
    if (!window.confirm('Are you sure you want to delete this salary slip?')) {
      return;
    }

    try {
      await apiClient.deleteSalarySlip(slip.employeeId, slip.month, slip.year);
      toast({
        title: "Success",
        description: "Salary slip deleted successfully"
      });
      loadSalarySlips();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete salary slip",
        variant: "destructive"
      });
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const handleFormBack = () => {
    setShowForm(false);
    setEditingSlip(null);
    setSelectedEmployeeId('');
    loadSalarySlips();
  };

  const handleBulkGenerationBack = () => {
    setShowBulkGeneration(false);
    loadSalarySlips();
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : employeeId;
  };

  const getMonthName = (monthNumber) => {
    const month = months.find(m => m.value === monthNumber);
    return month ? month.label : monthNumber;
  };

  // Show form component
  if (showForm) {
    return (
      <SalarySlipForm
        employeeId={selectedEmployeeId}
        editData={editingSlip}
        onBack={handleFormBack}
      />
    );
  }

  // Show bulk generation component
  if (showBulkGeneration) {
    return (
      <BulkSalaryGeneration
        employees={employees || []}
        onBack={handleBulkGenerationBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Salary Slip Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage and generate salary slips for employees
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowBulkGeneration(true)}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Bulk Generate
            </Button>
            <Button
              onClick={() => handleCreateNew()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Slips</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {pagination.totalItems}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">This Month</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {salarySlips.filter(slip => slip.month === new Date().getMonth() + 1).length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Employees</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {employees.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <SalarySlipFilters
          filters={filters}
          employees={employees}
          months={months}
          onFilterChange={handleFilterChange}
        />

        {/* Salary Slips Grid */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Salary Slips
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : salarySlips.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400 text-lg">No salary slips found</p>
                <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
                  Create your first salary slip to get started
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {salarySlips.map((slip) => {
                    const employeeData = employees.find(emp => emp.employeeId === slip.employeeId);
                    return (
                      <SalarySlipCard
                        key={`${slip.employeeId}-${slip.month}-${slip.year}`}
                        slip={slip}
                        employeeName={getEmployeeName(slip.employeeId)}
                        monthName={getMonthName(slip.month)}
                        employeeData={employeeData}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200 dark:border-slate-600">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                      {pagination.totalItems} results
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="dark:border-slate-600 dark:hover:bg-slate-600"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalarySlipManagement; 