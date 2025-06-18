import React, { useEffect, useState, useCallback } from 'react';
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Example if using ShadCN Card
// import { Button } from '@/components/ui/button'; // Example if using ShadCN Button
// import { Input } from '@/components/ui/input'; // Example if using ShadCN Input
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Example

// Updated AttendanceTableChart to display a table
const AttendanceTableChart = ({ attendance }) => {
  if (!attendance || attendance.length === 0) {
    return <div className="text-slate-500 dark:text-slate-400">No attendance records found.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100 dark:bg-slate-700">
          <tr>
            <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
            <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check-In</th>
            <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Check-Out</th>
            <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
            <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Notes</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {attendance.map((rec, idx) => (
            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{new Date(rec.date || rec.checkInTime).toLocaleDateString()}</td>
              <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString() : 'N/A'}</td>
              <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString() : 'N/A'}</td>
              <td className="p-3 whitespace-nowrap">
                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${rec.status === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : rec.status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100' : rec.status === 'Half-day' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' : 'bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-100'}`}>
                  {rec.status}
                </span>
              </td>
              <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">{rec.notes || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function EmployeeDirectory() {
  const userObject = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);

  const fetchEmployeeData = useCallback(async () => {
    if (!selectedEmployeeId) return;
    setProfileLoading(true);
    setProfileError(null);
    setEmployeeProfile(null);
    setAttendance([]);
    setLeaves([]);
    try {
      const res = await apiClient.get(`/employees/${selectedEmployeeId}`);
      setEmployeeProfile(res);
      if (res && res.employeeId) {
        try {
          const lv = await apiClient.get(`/leaves/all?employeeId=${res.employeeId}`);
          setLeaves(lv.leaves || []);
        } catch (lvErr) {
          setLeaves([]);
          setProfileError(prev => (prev ? prev + '; ' : '') + 'Failed to fetch leaves. ' + (lvErr?.message || ''));
        }
        try {
          const att = await apiClient.getAttendanceRecords({ employeeId: res.employeeId });
          setAttendance(att.data?.records || att.records || []);
        } catch (attErr) {
          setAttendance([]);
          setProfileError(prev => (prev ? prev + '; ' : '') + 'Failed to fetch attendance. ' + (attErr?.message || ''));
        }
      } else {
        setLeaves([]);
        setAttendance([]);
        if (res && !res.employeeId) {
          console.warn("Employee profile fetched but missing employeeId, cannot fetch leaves or attendance.");
        }
      }
    } catch (err) {
      setProfileError('Failed to load employee details. ' + (err?.message || ''));
    } finally {
      setProfileLoading(false);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);
  
  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await apiClient.getEmployees();
        setEmployees(res.employees || []);
        try {
          const userRes = await apiClient.getAllUsers();
          setUsers(userRes.users || []);
        } catch (userErr) {
          setUsers([]);
          console.error('Failed to load users.', userErr);
        }
      } catch (err) {
        setError('Failed to load employees list. ' + (err?.message || ''));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!userObject) return <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading user data...</div>;
  const user = userObject;

  if (user.role !== 'hr' && user.role !== 'admin') {
    return <div className="p-6 text-center text-red-500">Not authorized to view this page.</div>;
  }

  const filteredEmployees = employees.filter(e =>
    (e.fullName || `${e.firstName} ${e.lastName}`).toLowerCase().includes(search.toLowerCase())
  );

  const isEmployeeLinked = (employeeId) => {
    return users.some(u => u.employeeId === employeeId);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      {/* Sidebar: Employee List */}
      <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
          />
        </div>
        <div className="flex-grow overflow-y-auto">
          {loading && employees.length === 0 ? (
            <div className="p-4 text-slate-500 dark:text-slate-400">Loading employees...</div>
          ) : error ? (
            <div className="p-4 text-red-500">{error}</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-4 text-slate-500 dark:text-slate-400">No employees found.</div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEmployees.map((e) => (
                <li
                  key={e._id}
                  className={`p-4 cursor-pointer hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors ${selectedEmployeeId === e._id ? 'bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-50 font-semibold' : ''}`}
                  onClick={() => setSelectedEmployeeId(e._id)}
                >
                  <div className="flex justify-between items-center">
                    <span>{e.fullName || `${e.firstName} ${e.lastName}`}</span>
                    <div className="flex items-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isEmployeeLinked(e.employeeId) ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                        {isEmployeeLinked(e.employeeId) ? 'Linked' : 'Unlinked'}
                      </span>
                      {!isEmployeeLinked(e.employeeId) && (
                        <button
                          className="ml-2 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                          onClick={evt => { evt.stopPropagation(); window.location.href = '/auth/signup'; }}
                        >
                          Create User
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Main Panel: Employee Details */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {!selectedEmployeeId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2 text-xl font-semibold">Select an employee</p>
              <p className="text-sm">Choose an employee from the list to view their details.</p>
            </div>
          </div>
        ) : profileLoading ? (
          <div className="text-center p-10 text-slate-500 dark:text-slate-400">Loading employee details...</div>
        ) : profileError ? (
          <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg shadow">{profileError}</div>
        ) : employeeProfile ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 md:p-8">
            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">
                {employeeProfile.firstName} {employeeProfile.lastName}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {employeeProfile.position} &mdash; {employeeProfile.department}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              {/* Contact & Work Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Contact & Work</h3>
                <p><strong>Email:</strong> {employeeProfile.email}</p>
                <p><strong>Phone:</strong> {employeeProfile.phone}</p>
                <p><strong>Employee ID:</strong> {employeeProfile.employeeId}</p>
                <p><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${employeeProfile.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                    {employeeProfile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                <p><strong>Employment Type:</strong> {employeeProfile.employmentType}</p>
                <p><strong>Joining Date:</strong> {employeeProfile.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Office:</strong> {employeeProfile.officeAddress}</p>
                <p><strong>Supervisor:</strong> {employeeProfile.reportingSupervisor}</p>
              </div>

              {/* Personal Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Personal Information</h3>
                <p><strong>Date of Birth:</strong> {employeeProfile.dateOfBirth ? new Date(employeeProfile.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Gender:</strong> {employeeProfile.gender}</p>
                <p><strong>Marital Status:</strong> {employeeProfile.maritalStatus}</p>
                <p><strong>Father's Name:</strong> {employeeProfile.fatherName}</p>
                <p><strong>Mother's Name:</strong> {employeeProfile.motherName}</p>
                <p><strong>Address:</strong> {employeeProfile.address}</p>
                <p><strong>Aadhaar:</strong> {employeeProfile.aadhaarNumber}</p>
                <p><strong>PAN:</strong> {employeeProfile.panNumber}</p>
                <p><strong>Emergency:</strong> {employeeProfile.emergencyContactName} ({employeeProfile.emergencyContactNumber})</p>
              </div>

              {/* Financial Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Financial Information</h3>
                <p><strong>Salary:</strong> {employeeProfile.salary?.toLocaleString() || 'N/A'}</p>
                <p><strong>Bank:</strong> {employeeProfile.bankName}</p>
                <p><strong>Account #:</strong> {employeeProfile.bankAccountNumber}</p>
                <p><strong>IFSC:</strong> {employeeProfile.bankIFSCCode}</p>
                <p><strong>Payment Mode:</strong> {employeeProfile.paymentMode}</p>
              </div>
            </div>

            {/* Attendance Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-3">Attendance Records</h3>
              <AttendanceTableChart attendance={attendance} />
            </div>

            {/* Leave Requests Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-3">Leave Requests</h3>
              {leaves.length === 0 ? (
                <div className="text-slate-500 dark:text-slate-400">No leave requests found.</div>
              ) : (
                <div className="w-full">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Type</th>
                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                        <th className="p-3 text-left font-semibold text-slate-600 dark:text-slate-300">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                      {leaves.map((lv, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{lv.leaveType}</td>
                          <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-200">{lv.leaveDate ? new Date(lv.leaveDate).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${lv.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-100' : lv.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'}`}>
                              {lv.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs break-words">{lv.leaveReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 