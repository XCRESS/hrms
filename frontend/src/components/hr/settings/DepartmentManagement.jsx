import React from 'react';
import { Building2, Plus, Edit2, Trash2, UserCheck, Eye } from 'lucide-react';

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
  resetMessages
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Department Management</h2>
            <p className="text-slate-600 dark:text-slate-400">Manage departments and employee assignments</p>
          </div>
        </div>
        
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Department
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
              <div key={dept.name} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{dept.name}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {dept.employeeCount} employee{dept.employeeCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
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
                  <div className="mt-4 pl-13">
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Department Employees
                      </h4>
                      <div className="grid gap-2">
                        {dept.employees.map((employee) => (
                          <div key={employee._id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-600">
                            <div>
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {employee.firstName} {employee.lastName}
                              </span>
                              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                                ({employee.employeeId})
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
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
    </div>
  );
};

export default DepartmentManagement;