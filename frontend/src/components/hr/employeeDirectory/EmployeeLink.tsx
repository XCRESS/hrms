import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useEmployees, useLinkEmployeeToUser } from "@/hooks/queries";
import { User } from "@/types";

interface Employee {
  _id: string;
  employeeId: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

const EmployeeLink: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch all users and employees
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const linkMutation = useLinkEmployeeToUser();

  const users = usersData || [];
  const employees = (employeesData || []) as Employee[];
  const loading = usersLoading || employeesLoading;

  const handleRefresh = (): void => {
    refetchUsers();
    refetchEmployees();
    setMessage(null);
  };

  const handleLink = (): void => {
    if (!selectedUser || !selectedEmployee) {
      setMessage("Please select both a user and an employee.");
      return;
    }
    // Check if already linked
    if (getUserEmployeeId(selectedUser)) {
      setMessage("Selected user is already linked to an employee.");
      return;
    }
    if (getEmployeeUserEmail(selectedEmployee)) {
      setMessage("Selected employee is already linked to a user.");
      return;
    }

    setMessage(null);
    linkMutation.mutate(
      {
        userId: selectedUser._id,
        employeeId: selectedEmployee.employeeId
      },
      {
        onSuccess: () => {
          setMessage("Successfully linked user to employee!");
          setSelectedUser(null);
          setSelectedEmployee(null);
          refetchUsers();
          refetchEmployees();
        },
        onError: (err: Error) => {
          setMessage("Failed to link: " + (err?.message || ""));
        }
      }
    );
  };

  // Helper to find if an employee is already linked
  const getEmployeeUserEmail = (emp: Employee): string | null => {
    if (!emp.employeeId) return null;
    const user = users.find(u => u.employeeId && u.employeeId !== "" && u.employeeId === emp.employeeId);
    return user ? user.email : null;
  };

  // Helper to find if a user is already linked
  const getUserEmployeeId = (user: User): string | null => {
    return user.employeeId && user.employeeId !== "" ? user.employeeId : null;
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Link User & Employee</h2>
        <button
          className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors"
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          onClick={() => navigate("/auth/signup")}
        >
          + Create New User
        </button>
      </div>
      {loading ? (
        <div className="text-center text-gray-500 dark:text-slate-400">Loading users and employees...</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold mb-2">Select User:</label>
              <select
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100"
                value={selectedUser ? selectedUser._id : ""}
                onChange={e => {
                  const user = users.find(u => u._id === e.target.value);
                  setSelectedUser(user || null);
                }}
              >
                <option value="">-- Select User --</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email}, {user.role})
                    {getUserEmployeeId(user) ? ` [Linked: ${getUserEmployeeId(user)}]` : ""}
                  </option>
                ))}
              </select>
              {selectedUser && getUserEmployeeId(selectedUser) && (
                <div className="text-amber-600 dark:text-amber-400 mt-1 text-sm">This user is already linked to employee ID: {getUserEmployeeId(selectedUser)}</div>
              )}
            </div>
            <div>
              <label className="block font-semibold mb-2">Select Employee:</label>
              <select
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100"
                value={selectedEmployee ? selectedEmployee.employeeId : ""}
                onChange={e => {
                  const emp = employees.find(emp => emp.employeeId === e.target.value);
                  setSelectedEmployee(emp || null);
                }}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp.employeeId}>
                    {(emp.fullName || (emp.firstName + ' ' + emp.lastName))} ({emp.employeeId})
                    {getEmployeeUserEmail(emp) ? ` [Linked: ${getEmployeeUserEmail(emp)}]` : ""}
                  </option>
                ))}
              </select>
              {selectedEmployee && getEmployeeUserEmail(selectedEmployee) && (
                <div className="text-amber-600 dark:text-amber-400 mt-1 text-sm">This employee is already linked to user: {getEmployeeUserEmail(selectedEmployee)}</div>
              )}
            </div>
          </div>
          <button
            onClick={handleLink}
            disabled={linkMutation.isPending || !selectedUser || !selectedEmployee || !!getUserEmployeeId(selectedUser) || !!getEmployeeUserEmail(selectedEmployee)}
            className={`w-full py-2 rounded-lg font-semibold transition-colors ${linkMutation.isPending ? 'bg-gray-300 dark:bg-slate-600 text-gray-400' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
          >
            {linkMutation.isPending ? "Linking..." : "Link User to Employee"}
          </button>
          {message && (
            <div className={`mt-4 text-center ${message.startsWith("Successfully") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{message}</div>
          )}
        </>
      )}
    </div>
  );
}

export default EmployeeLink;
