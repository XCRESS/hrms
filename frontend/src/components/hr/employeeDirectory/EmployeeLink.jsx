import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../service/apiClient";

export default function EmployeeLink() {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // Fetch all users and employees
  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [userRes, empRes] = await Promise.all([
        apiClient.getAllUsers(),
        apiClient.getEmployees()
      ]);
      setUsers(userRes.users || []);
      setEmployees(empRes.employees || []);
    } catch (err) {
      setMessage("Failed to load users or employees: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLink = async () => {
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
    setLinking(true);
    setMessage(null);
    try {
      await apiClient.linkEmployeeToUser(selectedUser._id || selectedUser.id, selectedEmployee.employeeId, "/employees/link");
      setMessage("Successfully linked user to employee!");
      setSelectedUser(null);
      setSelectedEmployee(null);
      fetchData();
    } catch (err) {
      setMessage("Failed to link: " + (err?.message || ""));
    } finally {
      setLinking(false);
    }
  };

  // Helper to find if an employee is already linked
  const getEmployeeUserEmail = (emp) => {
    if (!emp.employeeId) return null;
    const user = users.find(u => u.employeeId && u.employeeId !== "" && u.employeeId === emp.employeeId);
    return user ? user.email : null;
  };

  // Helper to find if a user is already linked
  const getUserEmployeeId = (user) => {
    return user.employeeId && user.employeeId !== "" ? user.employeeId : null;
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Link User & Employee</h2>
        <button
          className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors"
          onClick={fetchData}
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
                value={selectedUser ? selectedUser._id || selectedUser.id : ""}
                onChange={e => {
                  const user = users.find(u => (u._id || u.id) === e.target.value);
                  setSelectedUser(user || null);
                }}
              >
                <option value="">-- Select User --</option>
                {users.map(user => (
                  <option key={user._id || user.id} value={user._id || user.id}>
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
            disabled={linking || !selectedUser || !selectedEmployee || getUserEmployeeId(selectedUser) || getEmployeeUserEmail(selectedEmployee)}
            className={`w-full py-2 rounded-lg font-semibold transition-colors ${linking ? 'bg-gray-300 dark:bg-slate-600 text-gray-400' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
          >
            {linking ? "Linking..." : "Link User to Employee"}
          </button>
          {message && (
            <div className={`mt-4 text-center ${message.startsWith("Successfully") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{message}</div>
          )}
        </>
      )}
    </div>
  );
} 