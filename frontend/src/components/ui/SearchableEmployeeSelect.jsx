import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableEmployeeSelect = ({
  employees = [],
  value,
  onValueChange,
  placeholder = "Choose an employee",
  disabled = false,
  className = "",
  showEmployeeDetails = true,
  filterEmployees = null // Optional function to filter employees
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter employees based on search term and optional filter function
  const filteredEmployees = employees.filter(emp => {
    if (!emp) return false;
    
    // Apply optional filter function first
    if (filterEmployees && !filterEmployees(emp)) {
      return false;
    }
    
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = emp.fullName || (emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : '');
    
    return (
      (fullName.toLowerCase().includes(searchLower)) ||
      (emp.employeeId && emp.employeeId.toLowerCase().includes(searchLower)) ||
      (emp.department && emp.department.toLowerCase().includes(searchLower)) ||
      (emp.email && emp.email.toLowerCase().includes(searchLower))
    );
  });

  // Get selected employee details
  const selectedEmployee = employees.find(emp => emp.employeeId === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredEmployees.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredEmployees[highlightedIndex]) {
          handleSelect(filteredEmployees[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (employee) => {
    onValueChange(employee.employeeId);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onValueChange('');
  };

  const displayName = selectedEmployee 
    ? (selectedEmployee.fullName || `${selectedEmployee.firstName || ''} ${selectedEmployee.lastName || ''}`.trim() || selectedEmployee.employeeId)
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-left
          bg-white dark:bg-slate-600 
          border border-slate-300 dark:border-slate-600 
          rounded-md shadow-sm
          text-slate-900 dark:text-slate-100
          placeholder-slate-500 dark:placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:border-slate-400 dark:hover:border-slate-500
          transition-colors duration-200
          ${isOpen ? 'ring-2 ring-cyan-500 border-cyan-500' : ''}
        `}
      >
        <span className={`block truncate ${!selectedEmployee ? 'text-slate-500 dark:text-slate-400' : ''}`}>
          {displayName}
        </span>
        <div className="flex items-center gap-1">
          {selectedEmployee && !disabled && (
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              type="button"
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                {searchTerm ? 'No employees found matching your search' : 'No employees available'}
              </div>
            ) : (
              filteredEmployees.map((employee, index) => {
                const fullName = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.employeeId;
                const isHighlighted = index === highlightedIndex;
                const isSelected = employee.employeeId === value;

                return (
                  <button
                    key={employee.employeeId}
                    type="button"
                    onClick={() => handleSelect(employee)}
                    className={`
                      w-full px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700
                      focus:outline-none focus:bg-slate-100 dark:focus:bg-slate-700
                      ${isHighlighted ? 'bg-slate-100 dark:bg-slate-700' : ''}
                      ${isSelected ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300' : ''}
                    `}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {fullName}
                      </span>
                      {showEmployeeDetails && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>ID: {employee.employeeId}</span>
                          {employee.department && <span>• {employee.department}</span>}
                          {employee.position && <span>• {employee.position}</span>}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableEmployeeSelect;