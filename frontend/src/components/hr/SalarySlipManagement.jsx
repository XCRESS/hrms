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
  DollarSign
} from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";
import SalarySlipForm from "./SalarySlipForm";

const SalarySlipManagement = () => {
  const [loading, setLoading] = useState(false);
  const [salarySlips, setSalarySlips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
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
  }, [filters]);

  const loadSalarySlips = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(filters.employeeId && filters.employeeId !== 'all' && { employeeId: filters.employeeId }),
        ...(filters.month && filters.month !== 'all' && { month: filters.month }),
        ...(filters.year && { year: filters.year })
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

  const handleDownloadPDF = (slip) => {
    const employee = employees.find(emp => emp.employeeId === slip.employeeId) || slip.employee;
    const month = months.find(m => m.value === slip.month)?.label || slip.month;
    
    // Create a new window for PDF
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${employee?.fullName || employee?.firstName + ' ' + employee?.lastName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .employee-info { margin-bottom: 20px; }
          .salary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .salary-table th, .salary-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .salary-table th { background-color: #f0f0f0; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .net-salary { font-size: 18px; font-weight: bold; margin: 20px 0; }
          .amount-words { margin-top: 20px; padding: 10px; background-color: #f9f9f9; border: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SALARY SLIP</h1>
          <h3>${month} ${slip.year}</h3>
        </div>
        
        <div class="employee-info">
          <p><strong>Employee ID:</strong> ${employee?.employeeId}</p>
          <p><strong>Employee Name:</strong> ${employee?.fullName || employee?.firstName + ' ' + employee?.lastName}</p>
          <p><strong>Department:</strong> ${employee?.department}</p>
          <p><strong>Position:</strong> ${employee?.position}</p>
        </div>

        <table class="salary-table">
          <thead>
            <tr>
              <th colspan="2">EARNINGS</th>
              <th colspan="2">DEDUCTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic Salary</td>
              <td>₹${slip.earnings.basic.toLocaleString()}</td>
              <td>Income Tax</td>
              <td>₹${slip.deductions.incomeTax.toLocaleString()}</td>
            </tr>
            <tr>
              <td>HRA</td>
              <td>₹${slip.earnings.hra.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Conveyance</td>
              <td>₹${slip.earnings.conveyance.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Medical Allowance</td>
              <td>₹${slip.earnings.medical.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>LTA</td>
              <td>₹${slip.earnings.lta.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Special Allowance</td>
              <td>₹${slip.earnings.specialAllowance.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Mobile Allowance</td>
              <td>₹${slip.earnings.mobileAllowance.toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td><strong>Gross Salary</strong></td>
              <td><strong>₹${slip.grossSalary.toLocaleString()}</strong></td>
              <td><strong>Total Deductions</strong></td>
              <td><strong>₹${slip.totalDeductions.toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="net-salary">
          <strong>Net Salary: ₹${slip.netSalary.toLocaleString()}</strong>
        </div>

        <div class="amount-words">
          <strong>Amount in Words:</strong> ${slip.netSalaryInWords}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    return employee ? employee.fullName : employeeId;
  };

  const getMonthName = (monthNumber) => {
    return months.find(m => m.value === monthNumber)?.label || monthNumber;
  };

  // Check authorization - follow codebase pattern
  if (!user) {
    return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading user data...</div>;
  }

  if (user.role !== 'hr' && user.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Not authorized to view this page.</div>;
  }

  if (showForm) {
    return (
      <SalarySlipForm
        employeeId={selectedEmployeeId}
        editData={editingSlip}
        onBack={() => {
          setShowForm(false);
          setEditingSlip(null);
          setSelectedEmployeeId('');
          loadSalarySlips();
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Salary Slip Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage employee salary slips
          </p>
        </div>
        <Button onClick={() => handleCreateNew()} className="flex items-center gap-2">
          <Plus size={16} />
          Create New Salary Slip
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="filterEmployee">Employee</Label>
              <Select
                value={filters.employeeId}
                onValueChange={(value) => handleFilterChange('employeeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId} - {emp.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filterMonth">Month</Label>
              <Select
                value={filters.month.toString()}
                onValueChange={(value) => handleFilterChange('month', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filterYear">Year</Label>
              <Select
                value={filters.year.toString()}
                onValueChange={(value) => handleFilterChange('year', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="search"
                  placeholder="Search by employee..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Slips List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={20} />
            Salary Slips ({pagination.totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading salary slips...</div>
          ) : salarySlips.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No salary slips found. Create your first salary slip!
            </div>
          ) : (
            <div className="space-y-4">
              {salarySlips.map((slip) => (
                <div
                  key={`${slip.employeeId}-${slip.month}-${slip.year}`}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">
                          {getEmployeeName(slip.employeeId)}
                        </h3>
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-sm">
                          {slip.employeeId}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {getMonthName(slip.month)} {slip.year}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign size={14} />
                          Net: ₹{slip.netSalary.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(slip)}
                        className="flex items-center gap-1"
                      >
                        <Download size={14} />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(slip)}
                        className="flex items-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(slip)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        Gross Salary
                      </p>
                      <p className="text-lg font-semibold">
                        ₹{slip.grossSalary.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        Total Deductions
                      </p>
                      <p className="text-lg font-semibold">
                        ₹{slip.totalDeductions.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                      <p className="text-blue-600 dark:text-blue-400 font-medium">
                        Net Salary
                      </p>
                      <p className="text-lg font-semibold">
                        ₹{slip.netSalary.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={pagination.currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalarySlipManagement; 