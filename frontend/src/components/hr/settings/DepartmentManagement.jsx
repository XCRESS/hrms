import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, UserCheck, Eye, Users, AlertTriangle } from 'lucide-react';
import apiClient from '../../../service/apiClient';

const DepartmentManagement = ({ 
  departmentStats, 
  loadingDeptStats, 
  expandedDept, 
  setExpandedDept,
  openAddModal,
  openRenameModal, 
  openDeleteModal,
  showAddDeptModal,
  showRenameDeptModal,
  showDeleteDeptModal,
  setShowAddDeptModal,
  setShowRenameDeptModal,
  setShowDeleteDeptModal,
  newDeptName,
  setNewDeptName,
  selectedDeptForAction,
  setSelectedDeptForAction,
  handleAddDepartment,
  handleRenameDepartment,
  handleDeleteDepartment,
  resetMessages,
  fetchDepartmentStats,
  fetchDepartments
}) => {
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedDeptForEmployees, setSelectedDeptForEmployees] = useState(null);
  const [availableEmployees, setAvailableEmployees] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [employeeToAssign, setEmployeeToAssign] = useState(null);

  const openEmployeeModal = async (dept) => {
    setSelectedDeptForEmployees(dept);
    setShowEmployeeModal(true);
    setLoadingEmployees(true);
    
    try {
      const response = await apiClient.getAvailableEmployees(dept.name);
      setAvailableEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleAssignEmployee = async (employee) => {
    if (employee.department && employee.department !== selectedDeptForEmployees.name) {
      // Show confirmation for changing department
      setEmployeeToAssign(employee);
      setShowConfirmModal(true);
    } else {
      // Direct assignment for employees without department
      await assignEmployee(employee);
    }
  };

  const assignEmployee = async (employee) => {
    setAssigningEmployee(true);
    try {
      await apiClient.assignEmployeeToDepartment(selectedDeptForEmployees.name, employee.employeeId);
      
      // Close modals
      setShowEmployeeModal(false);
      setShowConfirmModal(false);
      setEmployeeToAssign(null);
      setSelectedDeptForEmployees(null);
      setAvailableEmployees(null);
      
      // Refresh department data without page reload
      if (fetchDepartmentStats && typeof fetchDepartmentStats === 'function') {
        await fetchDepartmentStats();
      }
      if (fetchDepartments && typeof fetchDepartments === 'function') {
        await fetchDepartments();
      }
    } catch (error) {
      console.error('Error assigning employee:', error);
    } finally {
      setAssigningEmployee(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-end">
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {/* Department List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        {loadingDeptStats ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Loading departments...</p>
          </div>
        ) : departmentStats.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No departments found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {departmentStats.map((dept) => (
              <div key={dept.name} className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">{dept.name}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEmployeeModal(dept)}
                      className="p-2 text-green-500 hover:text-green-700 transition-colors"
                      title="Manage employees"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    {dept.employeeCount > 0 && (
                      <button
                        onClick={() => setExpandedDept(expandedDept === dept.name ? null : dept.name)}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                        title="View employees"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openRenameModal(dept)}
                      className="p-2 text-blue-500 hover:text-blue-700 transition-colors"
                      title="Rename department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(dept)}
                      className="p-2 text-red-500 hover:text-red-700 transition-colors"
                      title="Delete department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Expanded Employee List */}
                {expandedDept === dept.name && dept.employees.length > 0 && (
                  <div className="mt-4 sm:pl-13">
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 sm:p-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Department Employees
                      </h4>
                      <div className="grid gap-2">
                        {dept.employees.map((employee) => (
                          <div key={employee._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                            <div className="min-w-0">
                              <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                                ({employee.employeeId})
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {employee.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Department</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Create a new department</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 transition-all"
                  placeholder="Enter department name"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddDeptModal(false);
                  setNewDeptName('');
                  resetMessages();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDepartment}
                disabled={!newDeptName.trim()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Department Modal */}
      {showRenameDeptModal && selectedDeptForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rename Department</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Rename "{selectedDeptForAction.name}"
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  New Department Name
                </label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                  placeholder="Enter new department name"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRenameDeptModal(false);
                  setNewDeptName('');
                  setSelectedDeptForAction(null);
                  resetMessages();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameDepartment}
                disabled={!newDeptName.trim() || newDeptName.trim() === selectedDeptForAction.name}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rename Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {showDeleteDeptModal && selectedDeptForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Delete Department</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                This action cannot be undone
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete <strong>"{selectedDeptForAction.name}"</strong>?
              </p>
              {selectedDeptForAction.employeeCount > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Warning:</strong> This department has {selectedDeptForAction.employeeCount} employee{selectedDeptForAction.employeeCount !== 1 ? 's' : ''}. 
                    Their department field will be cleared.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteDeptModal(false);
                  setSelectedDeptForAction(null);
                  resetMessages();
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDepartment}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Assignment Modal */}
      {showEmployeeModal && selectedDeptForEmployees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                Manage Employees - {selectedDeptForEmployees.name}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                Assign employees to this department
              </p>
            </div>
            
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-h-[calc(95vh-180px)] sm:max-h-[calc(90vh-200px)] overflow-y-auto">
              {loadingEmployees ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">Loading employees...</p>
                </div>
              ) : availableEmployees ? (
                <div className="space-y-6">
                  {/* Current Department Employees */}
                  {availableEmployees.employeesInDepartment.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-green-600" />
                        Current Department Employees ({availableEmployees.employeesInDepartment.length})
                      </h4>
                      <div className="grid gap-2">
                        {availableEmployees.employeesInDepartment.map((employee) => (
                          <div key={employee._id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                ({employee.employeeId})
                              </span>
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Already in {selectedDeptForEmployees.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Employees Without Department */}
                  {availableEmployees.employeesWithoutDepartment.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        Available Employees ({availableEmployees.employeesWithoutDepartment.length})
                      </h4>
                      <div className="grid gap-2">
                        {availableEmployees.employeesWithoutDepartment.map((employee) => (
                          <div key={employee._id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                ({employee.employeeId})
                              </span>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {employee.email}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssignEmployee(employee)}
                              disabled={assigningEmployee}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Employees in Other Departments */}
                  {availableEmployees.employeesInOtherDepartments.length > 0 && (
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        Employees in Other Departments ({availableEmployees.employeesInOtherDepartments.length})
                      </h4>
                      <div className="grid gap-2">
                        {availableEmployees.employeesInOtherDepartments.map((employee) => (
                          <div key={employee._id} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                ({employee.employeeId})
                              </span>
                              <div className="text-xs text-amber-600 dark:text-amber-400">
                                Currently in: {employee.department}
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssignEmployee(employee)}
                              disabled={assigningEmployee}
                              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                              Move Here
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No employees message */}
                  {availableEmployees.employeesWithoutDepartment.length === 0 && 
                   availableEmployees.employeesInOtherDepartments.length === 0 && 
                   availableEmployees.employeesInDepartment.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No employees available</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Failed to load employees</p>
                </div>
              )}
            </div>
            
            <div className="p-3 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2 sm:gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowEmployeeModal(false);
                  setSelectedDeptForEmployees(null);
                  setAvailableEmployees(null);
                }}
                className="px-3 sm:px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Changing Department */}
      {showConfirmModal && employeeToAssign && selectedDeptForEmployees && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Confirm Department Change
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to change <strong>{employeeToAssign.firstName} {employeeToAssign.lastName}</strong> department from{' '}
                <strong className="text-red-600 dark:text-red-400">{employeeToAssign.department}</strong> to{' '}
                <strong className="text-green-600 dark:text-green-400">{selectedDeptForEmployees.name}</strong>?
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setEmployeeToAssign(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => assignEmployee(employeeToAssign)}
                disabled={assigningEmployee}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {assigningEmployee ? 'Moving...' : 'Yes, Move Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;