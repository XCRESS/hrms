import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  DollarSign, 
  Download, 
  Edit, 
  Trash2,
  User,
  Building,
  CheckCircle,
  XCircle
} from "lucide-react";
import { downloadSalarySlipPDF } from "../../utils/pdfGenerator";
import { formatIndianNumber } from "../../utils/indianNumber";

const SalarySlipCard = ({ slip, employeeName, monthName, onEdit, onDelete, onPublish, employeeData }) => {
  const handleDownloadPDF = () => {
    downloadSalarySlipPDF(slip, employeeName, monthName, employeeData);
  };

  const handlePublishToggle = () => {
    const newStatus = slip.status === 'finalized' ? 'draft' : 'finalized';
    onPublish(slip, newStatus);
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white dark:bg-slate-600">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                {employeeName}
              </h3>
              <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-sm">
                {slip.employeeId}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {monthName} {slip.year}
              </span>
              {slip.employee?.department && (
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {slip.employee.department}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadPDF}
              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
              title="Download PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(slip)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePublishToggle}
              className={`h-8 w-8 p-0 ${
                slip.status === 'finalized' 
                  ? 'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300' 
                  : 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
              }`}
              title={slip.status === 'finalized' ? 'Unpublish' : 'Publish'}
            >
              {slip.status === 'finalized' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(slip)}
              className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Salary Information */}
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <p className="text-green-700 dark:text-green-400 font-medium text-sm">
              Gross Salary
            </p>
            <p className="text-xl font-bold text-green-800 dark:text-green-300">
              ₹{formatIndianNumber(slip.grossSalary)}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <p className="text-red-700 dark:text-red-400 font-medium text-sm">
                Deductions
              </p>
              <p className="text-lg font-semibold text-red-800 dark:text-red-300">
                ₹{formatIndianNumber(slip.totalDeductions)}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-blue-700 dark:text-blue-400 font-medium text-sm">
                Net Salary
              </p>
              <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                ₹{formatIndianNumber(slip.netSalary)}
              </p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-500">
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              slip.status === 'finalized' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}>
              {slip.status === 'finalized' ? 'Published' : 'Draft'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tax Regime: {slip.taxRegime?.toUpperCase() || 'NEW'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalarySlipCard; 