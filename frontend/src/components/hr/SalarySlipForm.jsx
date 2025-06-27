import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Calculator, DollarSign, Receipt } from "lucide-react";
import apiClient from "../../service/apiClient";
import { useToast } from "@/components/ui/toast";
import useAuth from "../../hooks/authjwt";

const SalarySlipForm = ({ employeeId: propEmployeeId, onBack, editData = null }) => {
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(propEmployeeId || '');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [taxRegime, setTaxRegime] = useState('new');
  const [earnings, setEarnings] = useState({
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
    return Object.values(earnings).reduce((total, value) => {
      return total + (parseFloat(value) || 0);
    }, 0);
  };

  // Calculate net salary in words
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
        console.log('Loading employees...');
        const response = await apiClient.getEmployees();
        console.log('Employees response:', response);
        
        if (response.employees) {
          setEmployees(response.employees);
          console.log('Employees loaded:', response.employees.length, 'employees');
        } else {
          console.error('Failed to load employees:', response);
          toast({
            title: "Error",
            description: "Failed to load employees",
            variant: "destructive"
          });
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

    // Always load employees to populate the dropdown
    loadEmployees();
  }, [toast]);

  // Load existing salary slip data if editing
  useEffect(() => {
    if (editData) {
      setSelectedEmployee(editData.employeeId);
      setMonth(editData.month);
      setYear(editData.year);
      setTaxRegime(editData.taxRegime || 'new');
      setEarnings(editData.earnings);
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
  }, [earnings, taxRegime]);

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

  const handleEarningsChange = (field, value) => {
    setEarnings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEmployee || !earnings.basic) {
      toast({
        title: "Error",
        description: "Please select employee and enter basic salary",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.createOrUpdateSalarySlip({
        employeeId: selectedEmployee,
        month,
        year,
        earnings,
        taxRegime
      });

      if (response.success) {
        setSalarySlip(response.data);
        toast({
          title: "Success",
          description: isEditing ? "Salary slip updated successfully" : "Salary slip created successfully"
        });
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
    if (!salarySlip) return;
    
    // Create a new window for PDF
    const printWindow = window.open('', '_blank');
    const employee = employees.find(emp => emp.employeeId === selectedEmployee) || salarySlip.employee;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip</title>
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
          <h3>${months.find(m => m.value === month)?.label} ${year}</h3>
        </div>
        
        <div class="employee-info">
          <p><strong>Employee ID:</strong> ${employee?.employeeId}</p>
          <p><strong>Employee Name:</strong> ${employee?.firstName} ${employee?.lastName}</p>
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
              <td>₹${parseFloat(earnings.basic || 0).toLocaleString()}</td>
              <td>Income Tax</td>
              <td>₹${(taxCalculation?.monthlyTax || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>HRA</td>
              <td>₹${parseFloat(earnings.hra || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Conveyance</td>
              <td>₹${parseFloat(earnings.conveyance || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Medical Allowance</td>
              <td>₹${parseFloat(earnings.medical || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>LTA</td>
              <td>₹${parseFloat(earnings.lta || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Special Allowance</td>
              <td>₹${parseFloat(earnings.specialAllowance || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td>Mobile Allowance</td>
              <td>₹${parseFloat(earnings.mobileAllowance || 0).toLocaleString()}</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="total-row">
              <td><strong>Gross Salary</strong></td>
              <td><strong>₹${calculateGrossSalary().toLocaleString()}</strong></td>
              <td><strong>Total Deductions</strong></td>
              <td><strong>₹${(taxCalculation?.monthlyTax || 0).toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="net-salary">
          <strong>Net Salary: ₹${(calculateGrossSalary() - (taxCalculation?.monthlyTax || 0)).toLocaleString()}</strong>
        </div>

        <div class="amount-words">
          <strong>Amount in Words:</strong> ${convertToWords(calculateGrossSalary() - (taxCalculation?.monthlyTax || 0))}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const grossSalary = calculateGrossSalary();
  const netSalary = grossSalary - (taxCalculation?.monthlyTax || 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {isEditing ? 'Edit Salary Slip' : 'Create Salary Slip'}
        </h1>
      </div>

      {/* Employee and Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={20} />
            Employee & Period Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employee">Employee *</Label>
              <Select 
                value={selectedEmployee} 
                onValueChange={setSelectedEmployee}
                disabled={!!propEmployeeId || isEditing || employeesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    employeesLoading ? "Loading employees..." : 
                    employees.length === 0 ? "No employees found" : 
                    "Select Employee"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {employeesLoading ? (
                    <SelectItem value="loading" disabled>Loading employees...</SelectItem>
                  ) : employees.length === 0 ? (
                    <SelectItem value="empty" disabled>No employees found</SelectItem>
                  ) : (
                    employees.map(emp => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId}>
                        {emp.employeeId} - {emp.fullName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="month">Month *</Label>
              <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="year">Year *</Label>
              <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="taxRegime">Tax Regime *</Label>
              <Select value={taxRegime} onValueChange={setTaxRegime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Tax Regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New Tax Regime (Standard Deduction: ₹75,000)</SelectItem>
                  <SelectItem value="old">Old Tax Regime (Standard Deduction: ₹50,000)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Earnings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <DollarSign size={20} />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basic">Basic Salary * (₹)</Label>
                <Input
                  id="basic"
                  type="number"
                  value={earnings.basic}
                  onChange={(e) => handleEarningsChange('basic', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="hra">HRA (₹)</Label>
                <Input
                  id="hra"
                  type="number"
                  value={earnings.hra}
                  onChange={(e) => handleEarningsChange('hra', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="conveyance">Conveyance (₹)</Label>
                <Input
                  id="conveyance"
                  type="number"
                  value={earnings.conveyance}
                  onChange={(e) => handleEarningsChange('conveyance', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="medical">Medical Allowance (₹)</Label>
                <Input
                  id="medical"
                  type="number"
                  value={earnings.medical}
                  onChange={(e) => handleEarningsChange('medical', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="lta">LTA (₹)</Label>
                <Input
                  id="lta"
                  type="number"
                  value={earnings.lta}
                  onChange={(e) => handleEarningsChange('lta', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="specialAllowance">Special Allowance (₹)</Label>
                <Input
                  id="specialAllowance"
                  type="number"
                  value={earnings.specialAllowance}
                  onChange={(e) => handleEarningsChange('specialAllowance', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="mobileAllowance">Mobile Allowance (₹)</Label>
                <Input
                  id="mobileAllowance"
                  type="number"
                  value={earnings.mobileAllowance}
                  onChange={(e) => handleEarningsChange('mobileAllowance', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            
            {/* Gross Salary Display */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Gross Salary:</span>
                <span className="text-green-600">₹{grossSalary.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Calculator size={20} />
              Deductions ({taxRegime === 'new' ? 'New' : 'Old'} Tax Regime)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {taxCalculation && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <p>Annual Gross: ₹{taxCalculation.annualGross?.toLocaleString() || '0'}</p>
                <p>Standard Deduction: ₹{taxCalculation.standardDeduction?.toLocaleString() || '0'}</p>
                <p>Annual Tax: ₹{taxCalculation.annualTax?.toLocaleString() || '0'}</p>
              </div>
            )}
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Income Tax (Monthly):</span>
              <span className="text-red-600 font-semibold">
                ₹{(taxCalculation?.monthlyTax || 0).toLocaleString()}
              </span>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Deductions:</span>
                <span className="text-red-600">₹{(taxCalculation?.monthlyTax || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Salary Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-2xl font-bold">
                <span>Net Salary:</span>
                <span className="text-blue-600">₹{netSalary.toLocaleString()}</span>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Label className="text-sm font-medium">Amount in Words:</Label>
                <p className="text-sm mt-1 text-blue-700 dark:text-blue-300">
                  {convertToWords(netSalary)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={loading || !selectedEmployee || !earnings.basic}
            className="flex-1"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Salary Slip' : 'Create Salary Slip')}
          </Button>
          
          {salarySlip && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={downloadPDF}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              Download PDF
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default SalarySlipForm; 