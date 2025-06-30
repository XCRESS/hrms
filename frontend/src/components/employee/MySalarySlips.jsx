import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Receipt,
  Download,
  Calendar,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";
import { downloadSalarySlipPDF } from "../../utils/pdfGenerator";

const MySalarySlips = () => {
  const [loading, setLoading] = useState(false);
  const [salarySlips, setSalarySlips] = useState([]);
  const [employeeData, setEmployeeData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12
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
    if (user) {
      loadSalarySlips();
      loadEmployeeProfile();
    }
  }, [user, pagination.currentPage, selectedYear, selectedMonth]);

  const loadEmployeeProfile = async () => {
    try {
      const response = await apiClient.getProfile();
      if (response.success && response.employee) {
        setEmployeeData(response.employee);
      }
    } catch (error) {
      console.error('Error loading employee profile:', error);
    }
  };

  const loadSalarySlips = async () => {
    if (!user?.employeeId) return;
    
    setLoading(true);
    try {
      const params = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        ...(selectedYear && { year: selectedYear }),
        ...(selectedMonth && selectedMonth !== 'all' && { month: selectedMonth })
      };

      const response = await apiClient.getEmployeeSalarySlips(user.employeeId, params);
      if (response.success) {
        setSalarySlips(response.data.salarySlips);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to load salary slips",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (slip) => {
    try {
      const employeeName = employeeData ? `${employeeData.firstName} ${employeeData.lastName}` : user?.name || 'Employee';
      const monthName = months.find(m => m.value === slip.month)?.label || `Month ${slip.month}`;
      downloadSalarySlipPDF(slip, employeeName, monthName, employeeData);
      
      toast({
        title: "Success",
        description: "PDF download initiated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF",
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

  // No need for local filtering since we're filtering on the server

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                My Salary Slips
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                View and download your salary slips
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-600">
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(value === 'all' ? 'all' : parseInt(value))}>
                  <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                    {months.map(month => (
                      <SelectItem 
                        key={month.value} 
                        value={month.value.toString()}
                        className="dark:text-slate-100 dark:focus:bg-slate-700"
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                    {[2023, 2024, 2025, 2026].map(year => (
                      <SelectItem 
                        key={year} 
                        value={year.toString()}
                        className="dark:text-slate-100 dark:focus:bg-slate-700"
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  {selectedMonth !== 'all' || selectedYear !== new Date().getFullYear() ? 'Try adjusting your filter criteria' : 'Your salary slips will appear here once they are published'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {salarySlips.map((slip) => (
                    <Card 
                      key={`${slip.employeeId}-${slip.month}-${slip.year}`}
                      className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-slate-50 dark:bg-slate-600"
                    >
                      <CardContent className="p-4">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                                {months.find(m => m.value === slip.month)?.label || `Month ${slip.month}`} {slip.year}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                slip.status === 'finalized' 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {slip.status === 'finalized' ? 'Published' : 'Draft'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Calendar className="h-4 w-4" />
                              Employee ID: {slip.employeeId}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {slip.status === 'finalized' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(slip)}
                                className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Salary Information */}
                        <div className="grid grid-cols-1 gap-3">
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                            <p className="text-green-700 dark:text-green-400 font-medium text-sm">
                              Gross Salary
                            </p>
                            <p className="text-xl font-bold text-green-800 dark:text-green-300">
                              ₹{slip.grossSalary.toLocaleString()}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <p className="text-red-700 dark:text-red-400 font-medium text-sm">
                                Deductions
                              </p>
                              <p className="text-lg font-semibold text-red-800 dark:text-red-300">
                                ₹{slip.totalDeductions.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                              <p className="text-blue-700 dark:text-blue-400 font-medium text-sm">
                                Net Salary
                              </p>
                              <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                                ₹{slip.netSalary.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-500">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Tax Regime: {slip.taxRegime?.toUpperCase() || 'NEW'}</span>
                            {slip.status !== 'finalized' && (
                              <span>Not available for download</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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

export default MySalarySlips;