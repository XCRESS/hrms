import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useEmployees, useLinkEmployeeToUser, useUnlinkEmployeeFromUser, useDeleteUser } from "@/hooks/queries";
import { User } from "@/types";
import { Link2, Link2Off, AlertTriangle, Trash2, UserX } from "lucide-react";

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
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [unlinkingUserId, setUnlinkingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch all users and employees
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: employeesData, isLoading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const linkMutation = useLinkEmployeeToUser();
  const unlinkMutation = useUnlinkEmployeeFromUser();
  const deleteMutation = useDeleteUser();

  const users = usersData || [];
  const employees = (employeesData || []) as Employee[];
  const loading = usersLoading || employeesLoading;

  // Users currently linked to an employee
  const linkedUsers = users.filter((u) => u.employeeId && u.employeeId !== "");

  // Employee-role users with no employee link (orphaned accounts)
  const unlinkedUsers = users.filter(
    (u) => u.role === "employee" && (!u.employeeId || u.employeeId === "")
  );

  const handleRefresh = (): void => {
    refetchUsers();
    refetchEmployees();
    setMessage(null);
  };

  const handleLink = (): void => {
    if (!selectedUser || !selectedEmployee) {
      setMessage({ text: "Please select both a user and an employee.", type: "error" });
      return;
    }
    if (getUserEmployeeId(selectedUser)) {
      setMessage({ text: "Selected user is already linked to an employee.", type: "error" });
      return;
    }
    if (getEmployeeUserEmail(selectedEmployee)) {
      setMessage({ text: "Selected employee is already linked to a user.", type: "error" });
      return;
    }

    setMessage(null);
    linkMutation.mutate(
      { userId: selectedUser._id, employeeId: selectedEmployee.employeeId },
      {
        onSuccess: () => {
          setMessage({ text: "Successfully linked user to employee!", type: "success" });
          setSelectedUser(null);
          setSelectedEmployee(null);
          refetchUsers();
          refetchEmployees();
        },
        onError: (err: Error) => {
          setMessage({ text: "Failed to link: " + (err?.message || ""), type: "error" });
        },
      }
    );
  };

  const handleUnlink = (userId: string, userName: string): void => {
    if (!window.confirm(`Are you sure you want to unlink "${userName}"? They will lose login access to the employee portal.`)) {
      return;
    }
    setUnlinkingUserId(userId);
    setMessage(null);
    unlinkMutation.mutate(
      { userId },
      {
        onSuccess: () => {
          setMessage({ text: `Successfully unlinked user "${userName}" from their employee profile.`, type: "success" });
          setUnlinkingUserId(null);
          refetchUsers();
          refetchEmployees();
        },
        onError: (err: Error) => {
          setMessage({ text: "Failed to unlink: " + (err?.message || ""), type: "error" });
          setUnlinkingUserId(null);
        },
      }
    );
  };

  const handleDeleteUser = (userId: string, userName: string): void => {
    if (!window.confirm(
      `Permanently delete the account "${userName}"?\n\nThis cannot be undone. The user will need a new account to access the system.`
    )) return;
    setDeletingUserId(userId);
    setMessage(null);
    deleteMutation.mutate(userId, {
      onSuccess: () => {
        setMessage({ text: `User "${userName}" has been permanently deleted.`, type: "success" });
        setDeletingUserId(null);
        refetchUsers();
      },
      onError: (err: Error) => {
        setMessage({ text: "Delete failed: " + (err?.message || ""), type: "error" });
        setDeletingUserId(null);
      },
    });
  };

  // Helper to find if an employee is already linked
  const getEmployeeUserEmail = (emp: Employee): string | null => {
    if (!emp.employeeId) return null;
    const user = users.find((u) => u.employeeId && u.employeeId !== "" && u.employeeId === emp.employeeId);
    return user ? user.email : null;
  };

  // Helper to find if a user is already linked
  const getUserEmployeeId = (user: User): string | null => {
    return user.employeeId && user.employeeId !== "" ? user.employeeId : null;
  };

  // Helper to get employee name for a linked user
  const getEmployeeNameForUser = (user: User): string => {
    const emp = employees.find((e) => e.employeeId === user.employeeId);
    if (!emp) return user.employeeId || "Unknown";
    return emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.employeeId;
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 space-y-8">
      {/* ── Link Section ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">
              <Link2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">Link User &amp; Employee</h2>
          </div>
          <button
            className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-100 rounded-lg font-medium hover:bg-cyan-200 dark:hover:bg-cyan-600 transition-colors text-sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="mb-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
            onClick={() => navigate("/auth/signup")}
          >
            + Create New User
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 dark:text-slate-400 py-6">Loading users and employees...</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-semibold mb-2 text-sm text-slate-700 dark:text-slate-300">Select User:</label>
                <select
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 text-sm"
                  value={selectedUser ? selectedUser._id : ""}
                  onChange={(e) => {
                    const user = users.find((u) => u._id === e.target.value);
                    setSelectedUser(user || null);
                  }}
                >
                  <option value="">-- Select User --</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email}, {user.role})
                      {getUserEmployeeId(user) ? ` [Linked: ${getUserEmployeeId(user)}]` : ""}
                    </option>
                  ))}
                </select>
                {selectedUser && getUserEmployeeId(selectedUser) && (
                  <div className="text-amber-600 dark:text-amber-400 mt-1 text-xs">
                    Already linked to employee ID: {getUserEmployeeId(selectedUser)}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-2 text-sm text-slate-700 dark:text-slate-300">Select Employee:</label>
                <select
                  className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 text-sm"
                  value={selectedEmployee ? selectedEmployee.employeeId : ""}
                  onChange={(e) => {
                    const emp = employees.find((emp) => emp.employeeId === e.target.value);
                    setSelectedEmployee(emp || null);
                  }}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp.employeeId}>
                      {emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()} ({emp.employeeId})
                      {getEmployeeUserEmail(emp) ? ` [Linked: ${getEmployeeUserEmail(emp)}]` : ""}
                    </option>
                  ))}
                </select>
                {selectedEmployee && getEmployeeUserEmail(selectedEmployee) && (
                  <div className="text-amber-600 dark:text-amber-400 mt-1 text-xs">
                    Already linked to user: {getEmployeeUserEmail(selectedEmployee)}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleLink}
              disabled={
                linkMutation.isPending ||
                !selectedUser ||
                !selectedEmployee ||
                !!getUserEmployeeId(selectedUser!) ||
                !!getEmployeeUserEmail(selectedEmployee!)
              }
              className={`w-full py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                linkMutation.isPending
                  ? "bg-gray-300 dark:bg-slate-600 text-gray-400"
                  : "bg-cyan-600 text-white hover:bg-cyan-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Link2 className="w-4 h-4" />
              {linkMutation.isPending ? "Linking..." : "Link User to Employee"}
            </button>
          </>
        )}

        {/* Shared message banner */}
        {message && (
          <div
            className={`mt-4 text-center text-sm px-4 py-2 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* ── All User Accounts (unified table) ── */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <Link2Off className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">User Accounts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                All employee-role users — linked or orphaned — managed in one place.
              </p>
            </div>
          </div>
          {/* Summary badges */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
              {linkedUsers.length} Linked
            </span>
            <span className="px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">
              {unlinkedUsers.length} Orphaned
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 dark:text-slate-400 py-10">Loading...</div>
        ) : (linkedUsers.length === 0 && unlinkedUsers.length === 0) ? (
          <div className="text-center text-slate-400 dark:text-slate-500 py-10">
            <UserX className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No employee user accounts found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">User</th>
                  <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                  <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Linked Employee</th>
                  <th className="text-left pb-3 font-semibold text-slate-600 dark:text-slate-400">Created</th>
                  <th className="text-right pb-3 font-semibold text-slate-600 dark:text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* Linked users first */}
                {linkedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-100">{user.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                        Linked
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-1">
                        <span className="text-slate-700 dark:text-slate-300">{getEmployeeNameForUser(user)}</span>
                        <span className="text-xs text-slate-400">({user.employeeId})</span>
                      </span>
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleUnlink(user._id, user.name)}
                        disabled={unlinkingUserId === user._id || unlinkMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {unlinkingUserId === user._id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-500 border-t-transparent"></div>
                            Unlinking...
                          </>
                        ) : (
                          <>
                            <Link2Off className="w-3 h-3" />
                            Unlink
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Separator row when both groups exist */}
                {linkedUsers.length > 0 && unlinkedUsers.length > 0 && (
                  <tr>
                    <td colSpan={6} className="py-2 px-0">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 border-t border-dashed border-orange-200 dark:border-orange-800"></div>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap px-2">
                          ↓ Orphaned — not linked to any employee
                        </span>
                        <div className="flex-1 border-t border-dashed border-orange-200 dark:border-orange-800"></div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Orphaned users below */}
                {unlinkedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors bg-orange-50/20 dark:bg-orange-900/5">
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-100">{user.name}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-400">{user.email}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"></span>
                        Orphaned
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 dark:text-slate-500 text-xs italic">Not linked</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        disabled={deletingUserId === user._id || deleteMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingUserId === user._id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-500 border-t-transparent"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Combined notice */}
            <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/40 rounded-lg border border-slate-200 dark:border-slate-600">
              <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong>Unlink</strong> removes portal access but keeps the account — you can re-link later.&nbsp;
                <strong>Delete</strong> permanently removes the account and cannot be undone.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeLink;
