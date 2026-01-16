import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import type { SalarySlipFilters as FilterState, EmployeeReference, MonthOption } from "../../../types";

interface SalarySlipFiltersProps {
  filters: FilterState;
  employees: EmployeeReference[];
  months: MonthOption[];
  onFilterChange: (key: keyof FilterState, value: string | number) => void;
}

const SalarySlipFilters: React.FC<SalarySlipFiltersProps> = ({
  filters,
  employees,
  months,
  onFilterChange
}) => {
  return (
    <Card className="border-0 shadow-md bg-white dark:bg-slate-700">
      <CardHeader className="border-b border-slate-200 dark:border-slate-600">
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee Filter */}
          <div className="space-y-2">
            <Label htmlFor="filterEmployee" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Employee
            </Label>
            <Select
              value={filters.employeeId}
              onValueChange={(value: string) => onFilterChange('employeeId', value)}
            >
              <SelectTrigger className="w-full dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-600">
                <SelectItem value="all" className="dark:text-slate-100 dark:focus:bg-slate-700">
                  All Employees
                </SelectItem>
                {employees.map(emp => (
                  <SelectItem
                    key={emp.employeeId}
                    value={emp.employeeId}
                    className="dark:text-slate-100 dark:focus:bg-slate-700"
                  >
                    <span className="block truncate max-w-xs md:max-w-sm lg:max-w-md font-medium">
                      {emp.fullName || (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : '')}
                    </span>
                    <span className="block text-xs text-slate-500 truncate max-w-xs md:max-w-sm lg:max-w-md">
                      {emp.employeeId}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Filter */}
          <div className="space-y-2">
            <Label htmlFor="filterMonth" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Month
            </Label>
            <Select
              value={filters.month.toString()}
              onValueChange={(value: string) => onFilterChange('month', value)}
            >
              <SelectTrigger className="w-full dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
                <SelectValue placeholder="All Months" />
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

          {/* Year Filter */}
          <div className="space-y-2">
            <Label htmlFor="filterYear" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Year
            </Label>
            <Select
              value={filters.year.toString()}
              onValueChange={(value: string) => onFilterChange('year', parseInt(value, 10))}
            >
              <SelectTrigger className="w-full dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100">
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

          {/* Search Filter */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 h-4 w-4" />
              <Input
                id="search"
                placeholder="Search by employee name or ID..."
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('search', e.target.value)}
                className="pl-10 dark:border-slate-600 dark:bg-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalarySlipFilters;
