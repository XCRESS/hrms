import { UserX } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Employee {
  employeeId: string;
  name: string;
}

interface AbsentEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  absentEmployees?: Employee[];
}

const AbsentEmployeesModal = ({ isOpen, onClose, absentEmployees = [] }: AbsentEmployeesModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] gap-0 p-0">
        {/* Header */}
        <DialogHeader className="flex-row items-center gap-2 space-y-0 p-6 pr-14 border-b border-gray-200 dark:border-slate-700 text-left">
          <UserX className="text-red-500 shrink-0" size={24} />
          <DialogTitle className="text-2xl font-semibold text-gray-800 dark:text-slate-100">
            Absent Employees Today
          </DialogTitle>
          <DialogDescription className="sr-only">
            List of employees marked absent today.
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {absentEmployees.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 dark:text-slate-400 text-lg font-medium mb-2">No Absent Employees</p>
              <p className="text-gray-500 dark:text-slate-500">All employees are present today!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {absentEmployees.length} absent employee{absentEmployees.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid gap-3">
                {absentEmployees.map((employee, index) => (
                  <div
                    key={employee.employeeId || index}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
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
                        <UserX className="text-red-500" size={20} />
                        <span className="text-red-600 dark:text-red-400 font-medium text-sm">Absent</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AbsentEmployeesModal;
