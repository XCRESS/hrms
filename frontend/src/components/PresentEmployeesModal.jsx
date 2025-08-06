import { X, UserCheck } from "lucide-react";

const PresentEmployeesModal = ({ isOpen, onClose, presentEmployees = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] transform transition-all duration-300 ease-out scale-95 animate-modal-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <UserCheck className="text-green-500" size={24} />
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-slate-100">
              Present Employees Today
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {presentEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-slate-400 text-lg font-medium mb-2">No Present Employees</p>
              <p className="text-gray-500 dark:text-slate-500">No employees are present today!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {presentEmployees.length} present employee{presentEmployees.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="grid gap-3">
                {presentEmployees.map((employee, index) => (
                  <div
                    key={employee.employeeId || index}
                    className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-slate-100 text-lg">
                          {employee.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                          Employee ID: {employee.employeeId}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="text-green-500" size={20} />
                        <span className="text-green-600 dark:text-green-400 font-medium text-sm">Present</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PresentEmployeesModal;