import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Users, 
  FileText, 
  Calculator,
  ArrowRight,
  Building,
  TrendingUp
} from "lucide-react";
import SalaryStructureManagement from '../hr/SalaryStructureManagement';
import SalarySlipManagement from '../hr/SalarySlipManagement';
import BackButton from '../ui/BackButton';

const SalaryHub = () => {
  const [activeSection, setActiveSection] = useState('overview');

  // Overview section with navigation cards
  const OverviewSection = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Salary Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive salary and payroll management system
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Employees</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Building className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active Structures</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">--</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">This Month's Slips</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">--</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Salary Structure */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-700 cursor-pointer group"
              onClick={() => setActiveSection('structure')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl mb-3 text-slate-900 dark:text-slate-100">
              Salary Structure
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Define and manage employee salary components including basic pay, allowances, and benefits.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Create salary structures
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Manage allowances
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Calculate gross salary
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Slip Generation */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-700 cursor-pointer group"
              onClick={() => setActiveSection('slips')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl mb-3 text-slate-900 dark:text-slate-100">
              Salary Slip Generation
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Generate, manage, and distribute monthly salary slips with tax calculations and deductions.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Generate monthly slips
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Auto tax calculation
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                PDF generation
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Integration */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-700 cursor-pointer group opacity-75"
              onClick={() => setActiveSection('payroll')}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-xl mb-3 text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Payroll Integration
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">
                Coming Soon
              </span>
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Automated payroll processing with Razorpay X integration for seamless salary disbursement.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Bank transfers
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Bulk payments
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Payment tracking
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Payroll placeholder section
  const PayrollSection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          onClick={() => setActiveSection('overview')}
          className="dark:border-slate-600 dark:hover:bg-slate-700"
        >
          ← Back to Overview
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Payroll Integration
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Automated payroll processing with Razorpay X
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
        <CardContent className="p-12 text-center">
          <div className="p-6 bg-purple-100 dark:bg-purple-900/30 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <CreditCard className="h-12 w-12 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Payroll Integration Coming Soon
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
            We're working on integrating Razorpay X for automated payroll processing. This will enable direct bank transfers, 
            bulk salary payments, and comprehensive payment tracking for your organization.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Automated bank transfers
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Bulk payment processing
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Payment status tracking
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Compliance reporting
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render current section
  const renderContent = () => {
    switch (activeSection) {
      case 'structure':
        return <SalaryStructureManagement />;
      case 'slips':
        return <SalarySlipManagement />;
      case 'payroll':
        return <PayrollSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {activeSection === 'overview' && (
          <div className="mb-6">
            <BackButton label="Back" variant="ghost" className="w-auto" />
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default SalaryHub;