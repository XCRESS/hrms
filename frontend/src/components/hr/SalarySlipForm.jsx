import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Download, 
  Calculator, 
  DollarSign, 
  Receipt, 
  Save,
  User,
  Building,
  CreditCard
} from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";
import { downloadSalarySlipPDF } from "../../utils/pdfGenerator";

const SalarySlipForm = ({ employeeId: propEmployeeId, onBack, editData = null }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(propEmployeeId || '');
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [taxRegime, setTaxRegime] = useState('new');
  const [activeTab, setActiveTab] = useState('employee');
  
  // Salary structure state
  const [salaryStructure, setSalaryStructure] = useState({
    basic: '',
    hra: '',
    conveyance: '',
    medical: '',
    lta: '',
    specialAllowance: '',
    mobileAllowance: ''
  });
  
  const [taxCalculation, setTaxCalculation] = useState(null);
  const [salarySlip, setSalarySlip] = useState(null);
  const [isEditing, setIsEditing] = useState(!!editData);

  const { toast } = useToast();
  const user = useAuth();

  // Months array for dropdown
  const months = [
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

  // Calculate gross salary
  const calculateGrossSalary = () => {
    return Object.values(salaryStructure).reduce((total, value) => {
      return total + (parseFloat(value) || 0);
    }, 0);
  };

  // Convert amount to words
  const convertToWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertThreeDigit(num) {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        num = 0;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    }

    if (amount === 0) return 'Zero Rupees Only';
    
    let rupees = Math.floor(amount);
    let result = '';
    
    if (rupees >= 10000000) {
      result += convertThreeDigit(Math.floor(rupees / 10000000)) + 'Crore ';
      rupees %= 10000000;
    }
    if (rupees >= 100000) {
      result += convertThreeDigit(Math.floor(rupees / 100000)) + 'Lakh ';
      rupees %= 100000;
    }
    if (rupees >= 1000) {
      result += convertThreeDigit(Math.floor(rupees / 1000)) + 'Thousand ';
      rupees %= 1000;
    }
    if (rupees > 0) {
      result += convertThreeDigit(rupees);
    }
    
    result += 'Rupees Only';
    return result.trim();
  };

  // Load employees on component mount
  useEffect(() => {
    const loadEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const response = await apiClient.getEmployees();
        if (response.employees) {
          setEmployees(response.employees);
        }
      } catch (error) {
        console.error('Error loading employees:', error);
        toast({
          title: "Error",
          description: "Failed to load employees",
          variant: "destructive"
        });
      } finally {
        setEmployeesLoading(false);
      }
    };

    loadEmployees();
  }, [toast]);

  // Load employee details and salary structure when employee is selected
  useEffect(() => {
    if (selectedEmployee) {
      loadEmployeeDetails(selectedEmployee);
      loadSalaryStructure(selectedEmployee);
    }
  }, [selectedEmployee]);

  // Load existing salary slip data if editing
  useEffect(() => {
    if (editData) {
      setSelectedEmployee(editData.employeeId);
      setMonth(editData.month);
      setYear(editData.year);
      setTaxRegime(editData.taxRegime || 'new');
      setSalaryStructure(editData.earnings);
      setIsEditing(true);
    }
  }, [editData]);

  // Calculate tax when gross salary or tax regime changes
  useEffect(() => {
    const grossSalary = calculateGrossSalary();
    if (grossSalary > 0) {
      calculateTax(grossSalary);
    } else {
      setTaxCalculation(null);
    }
  }, [salaryStructure, taxRegime]);

  const loadEmployeeDetails = async (employeeId) => {
    try {
      const employee = employees.find(emp => emp.employeeId === employeeId);
      if (employee) {
        setEmployeeDetails(employee);
      } else {
        toast({
          title: "Warning",
          description: "Employee details not found",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading employee details:', error);
      toast({
        title: "Error",
        description: "Failed to load employee details",
        variant: "destructive"
      });
    }
  };

  const loadSalaryStructure = async (employeeId) => {
    try {
      const response = await apiClient.getSalaryStructure(employeeId);
      if (response.success && response.data) {
        setSalaryStructure(response.data.earnings);
      }
    } catch (error) {
      // If no salary structure exists, keep default empty structure
      // This is expected for new employees, so we don't show an error toast
      if (error.status !== 404) {
        console.error('Error loading salary structure:', error);
        toast({
          title: "Warning",
          description: "Could not load existing salary structure. Starting with empty structure.",
          variant: "destructive"
        });
      }
      
      // Reset to default structure
      setSalaryStructure({
        basic: '',
        hra: '',
        conveyance: '',
        medical: '',
        lta: '',
        specialAllowance: '',
        mobileAllowance: ''
      });
    }
  };

  const calculateTax = async (grossSalary) => {
    try {
      const response = await apiClient.getTaxCalculation(grossSalary, taxRegime);
      if (response.success) {
        setTaxCalculation(response.data);
      }
    } catch (error) {
      console.error('Tax calculation error:', error);
      setTaxCalculation({ monthlyTax: 0 });
    }
  };

  const handleSalaryStructureChange = (field, value) => {
    setSalaryStructure(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveSalaryStructure = async () => {
    if (!selectedEmployee || !salaryStructure.basic) {
      toast({
        title: "Error",
        description: "Please select employee and enter basic salary",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.createOrUpdateSalaryStructure({
        employeeId: selectedEmployee,
        earnings: salaryStructure
      });

      if (response.success) {
        toast({
          title: "Success",
          description: "Salary structure saved successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to save salary structure",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee || !salaryStructure.basic) {
      toast({
        title: "Error",
        description: "Please select employee and enter basic salary",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // First save/update salary structure
      await apiClient.createOrUpdateSalaryStructure({
        employeeId: selectedEmployee,
        earnings: salaryStructure
      });

      // Then create/update salary slip
      const response = await apiClient.createOrUpdateSalarySlip({
        employeeId: selectedEmployee,
        month,
        year,
        earnings: salaryStructure,
        taxRegime
      });

      if (response.success) {
        setSalarySlip(response.data);
        toast({
          title: "Success",
          description: isEditing ? "Salary slip updated successfully" : "Salary slip created successfully"
        });
        setActiveTab('preview');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to save salary slip",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    try {
      if (!salarySlip) {
        toast({
          title: "Error",
          description: "No salary slip data available for download",
          variant: "destructive"
        });
        return;
      }
      
      if (!employeeDetails) {
        toast({
          title: "Error", 
          description: "Employee details not loaded",
          variant: "destructive"
        });
        return;
      }

      const employeeName = `${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim();
      const monthName = months.find(m => m.value === month)?.label || month;
      downloadSalarySlipPDF(salarySlip, employeeName, monthName, employeeDetails);
      
      toast({
        title: "Success",
        description: "PDF generation initiated"
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const grossSalary = calculateGrossSalary();
  const netSalary = grossSalary - (taxCalculation?.monthlyTax || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="self-start dark:border-slate-600 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Receipt className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? 'Edit Salary Slip' : 'Create Salary Slip'}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                {isEditing ? 'Update existing salary slip' : 'Generate a new salary slip for employee'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-0 dark:bg-slate-700">
            <TabsTrigger value="employee" className="dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm">
              <span className="hidden sm:inline">Employee & Period</span>
              <span className="sm:hidden">Employee</span>
            </TabsTrigger>
            <TabsTrigger value="salary" className="dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm">
              <span className="hidden sm:inline">Salary Structure</span>
              <span className="sm:hidden">Salary</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="dark:data-[state=active]:bg-slate-600 text-xs sm:text-sm">
              <span className="hidden sm:inline">Preview & Generate</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
          </TabsList>

          {/* Employee Selection Tab */}
          <TabsContent value="employee" className="space-y-6">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <User className="h-5 w-5" />
                  Employee Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Employee Selection - Fixed Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Select Employee</Label>
                    <Select
                      value={selectedEmployee}
                      onValueChange={setSelectedEmployee}
                      disabled={employeesLoading || isEditing}
                    >
                      <SelectTrigger className="w-full dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                        <SelectValue placeholder={employeesLoading ? "Loading employees..." : "Choose an employee"} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:border-slate-600 max-h-60 min-w-[300px]">
                        {employees.map(emp => (
                          <SelectItem 
                            key={emp.employeeId} 
                            value={emp.employeeId}
                            className="dark:text-slate-100 dark:focus:bg-slate-700 py-3"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                                  {emp.fullName || (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.employeeId)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  ID: {emp.employeeId} • {emp.department || 'No Department'}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Month</Label>
                      <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                        <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                          {months.map(m => (
                            <SelectItem 
                              key={m.value} 
                              value={m.value.toString()}
                              className="dark:text-slate-100 dark:focus:bg-slate-700"
                            >
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Year</Label>
                      <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                        <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                          <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                          {[2023, 2024, 2025, 2026].map(y => (
                            <SelectItem 
                              key={y} 
                              value={y.toString()}
                              className="dark:text-slate-100 dark:focus:bg-slate-700"
                            >
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Employee Details Display */}
                {employeeDetails && (
                  <div className="border-t border-slate-200 dark:border-slate-600 pt-6">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                      Employee Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Full Name</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {`${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim() || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Email</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.email || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Department</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.department || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Position</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.position || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Bank Name</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{employeeDetails.bankName || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-600 p-3 rounded-lg">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Joining Date</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {employeeDetails.joiningDate ? new Date(employeeDetails.joiningDate).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => setActiveTab('salary')}
                    disabled={!selectedEmployee}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                  >
                    Next: Salary Structure
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Structure Tab */}
          <TabsContent value="salary" className="space-y-6">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <DollarSign className="h-5 w-5" />
                    Salary Structure
                  </CardTitle>
                  <Button
                    onClick={saveSalaryStructure}
                    disabled={saving || !selectedEmployee || !salaryStructure.basic}
                    variant="outline"
                    className="dark:border-slate-600 dark:hover:bg-slate-600"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600 mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Structure
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Earnings</h4>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Basic Salary *</Label>
                      <Input
                        type="number"
                        placeholder="Enter basic salary"
                        value={salaryStructure.basic}
                        onChange={(e) => handleSalaryStructureChange('basic', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">HRA</Label>
                      <Input
                        type="number"
                        placeholder="House Rent Allowance"
                        value={salaryStructure.hra}
                        onChange={(e) => handleSalaryStructureChange('hra', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Conveyance Allowance</Label>
                      <Input
                        type="number"
                        placeholder="Travel allowance"
                        value={salaryStructure.conveyance}
                        onChange={(e) => handleSalaryStructureChange('conveyance', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Medical Allowance</Label>
                      <Input
                        type="number"
                        placeholder="Medical benefits"
                        value={salaryStructure.medical}
                        onChange={(e) => handleSalaryStructureChange('medical', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">LTA</Label>
                      <Input
                        type="number"
                        placeholder="Leave Travel Allowance"
                        value={salaryStructure.lta}
                        onChange={(e) => handleSalaryStructureChange('lta', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Special Allowance</Label>
                      <Input
                        type="number"
                        placeholder="Special allowance"
                        value={salaryStructure.specialAllowance}
                        onChange={(e) => handleSalaryStructureChange('specialAllowance', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Mobile Allowance</Label>
                      <Input
                        type="number"
                        placeholder="Mobile/communication allowance"
                        value={salaryStructure.mobileAllowance}
                        onChange={(e) => handleSalaryStructureChange('mobileAllowance', e.target.value)}
                        className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Tax Configuration & Summary */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tax Configuration</h4>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-300">Tax Regime</Label>
                      <Select value={taxRegime} onValueChange={setTaxRegime}>
                        <SelectTrigger className="dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                          <SelectValue placeholder="Select Tax Regime" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                          <SelectItem value="new" className="dark:text-slate-100 dark:focus:bg-slate-700">
                            New Tax Regime
                          </SelectItem>
                          <SelectItem value="old" className="dark:text-slate-100 dark:focus:bg-slate-700">
                            Old Tax Regime
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Salary Summary */}
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-600 rounded-lg space-y-3">
                      <h5 className="font-semibold text-slate-900 dark:text-slate-100">Salary Summary</h5>
                      
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Gross Salary:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          ₹{grossSalary.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">Income Tax (Monthly):</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          ₹{(taxCalculation?.monthlyTax || 0).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="border-t border-slate-300 dark:border-slate-500 pt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">Net Salary:</span>
                          <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                            ₹{netSalary.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {convertToWords(netSalary)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    onClick={() => setActiveTab('employee')}
                    variant="outline"
                    className="dark:border-slate-600 dark:hover:bg-slate-600"
                  >
                    Previous: Employee
                  </Button>
                  <Button
                    onClick={() => setActiveTab('preview')}
                    disabled={!grossSalary}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
                  >
                    Next: Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-600">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Receipt className="h-5 w-5" />
                  Salary Slip Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Salary Slip Preview */}
                  <div className="bg-slate-50 dark:bg-slate-600 p-6 rounded-lg border">
                    {employeeDetails && (
                      <>
                        <div className="text-center border-b border-slate-300 dark:border-slate-500 pb-4 mb-4">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">SALARY SLIP</h3>
                          <p className="text-slate-600 dark:text-slate-400">
                            {months.find(m => m.value === month)?.label} {year}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Employee Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-slate-600 dark:text-slate-400">Name:</span> {`${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim() || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">Employee ID:</span> {employeeDetails.employeeId || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">Department:</span> {employeeDetails.department || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">Position:</span> {employeeDetails.position || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">Email:</span> {employeeDetails.email || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Payment Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-slate-600 dark:text-slate-400">Bank:</span> {employeeDetails.bankName || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">A/C Number:</span> {employeeDetails.bankAccountNumber || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">PAN:</span> {employeeDetails.panNumber || 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">Joining Date:</span> {employeeDetails.joiningDate ? new Date(employeeDetails.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                              <p><span className="text-slate-600 dark:text-slate-400">Tax Regime:</span> {taxRegime.toUpperCase()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Earnings</h4>
                            <div className="space-y-1 text-sm">
                              {salaryStructure.basic > 0 && (
                                <div className="flex justify-between">
                                  <span>Basic Salary</span>
                                  <span>₹{parseFloat(salaryStructure.basic).toLocaleString()}</span>
                                </div>
                              )}
                              {salaryStructure.hra > 0 && (
                                <div className="flex justify-between">
                                  <span>HRA</span>
                                  <span>₹{parseFloat(salaryStructure.hra).toLocaleString()}</span>
                                </div>
                              )}
                              {salaryStructure.conveyance > 0 && (
                                <div className="flex justify-between">
                                  <span>Conveyance</span>
                                  <span>₹{parseFloat(salaryStructure.conveyance).toLocaleString()}</span>
                                </div>
                              )}
                              {salaryStructure.medical > 0 && (
                                <div className="flex justify-between">
                                  <span>Medical</span>
                                  <span>₹{parseFloat(salaryStructure.medical).toLocaleString()}</span>
                                </div>
                              )}
                              {salaryStructure.lta > 0 && (
                                <div className="flex justify-between">
                                  <span>LTA</span>
                                  <span>₹{parseFloat(salaryStructure.lta).toLocaleString()}</span>
                                </div>
                              )}
                              {salaryStructure.specialAllowance > 0 && (
                                <div className="flex justify-between">
                                  <span>Special Allowance</span>
                                  <span>₹{parseFloat(salaryStructure.specialAllowance).toLocaleString()}</span>
                                </div>
                              )}
                              {salaryStructure.mobileAllowance > 0 && (
                                <div className="flex justify-between">
                                  <span>Mobile Allowance</span>
                                  <span>₹{parseFloat(salaryStructure.mobileAllowance).toLocaleString()}</span>
                                </div>
                              )}
                              <div className="border-t border-slate-300 dark:border-slate-500 pt-1 mt-2">
                                <div className="flex justify-between font-semibold">
                                  <span>Gross Salary</span>
                                  <span>₹{grossSalary.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Deductions</h4>
                            <div className="space-y-1 text-sm">
                              {(taxCalculation?.monthlyTax || 0) > 0 && (
                                <div className="flex justify-between">
                                  <span>Income Tax (TDS)</span>
                                  <span>₹{(taxCalculation?.monthlyTax || 0).toLocaleString()}</span>
                                </div>
                              )}
                              <div className="border-t border-slate-300 dark:border-slate-500 pt-1 mt-2">
                                <div className="flex justify-between font-semibold">
                                  <span>Total Deductions</span>
                                  <span>₹{(taxCalculation?.monthlyTax || 0).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Net Salary:</span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              ₹{netSalary.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {convertToWords(netSalary)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between">
                    <Button
                      type="button"
                      onClick={() => setActiveTab('salary')}
                      variant="outline"
                      className="dark:border-slate-600 dark:hover:bg-slate-600"
                    >
                      Previous: Salary
                    </Button>
                    
                    <div className="flex gap-3">
                      {salarySlip && (
                        <Button
                          type="button"
                          onClick={downloadPDF}
                          variant="outline"
                          className="dark:border-slate-600 dark:hover:bg-slate-600"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      )}
                      
                      <Button
                        type="submit"
                        disabled={loading || !selectedEmployee || !grossSalary}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {isEditing ? 'Updating...' : 'Generating...'}
                          </>
                        ) : (
                          <>
                            <Receipt className="h-4 w-4 mr-2" />
                            {isEditing ? 'Update Salary Slip' : 'Generate Salary Slip'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SalarySlipForm; 