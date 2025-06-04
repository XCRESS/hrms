import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/authjwt';
import apiClient from '../../service/apiClient';

export default function EmployeeDirectory() {
  const user = useAuth();
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
          setError('Failed to load users. ' + (userErr?.message || ''));
        }
      } catch (err) {
        setError('Failed to load employees. ' + (err?.message || ''));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEmployeeId) return;
    setProfileLoading(true);
    setProfileError(null);
    setEmployeeProfile(null);
    setAttendance([]);
    setLeaves([]);
    (async () => {
      try {
        // 1. Fetch full profile by /employees/:id
        const res = await apiClient.get(`/employees/${selectedEmployeeId}`);
        setEmployeeProfile(res);
        console.log('Employee profile:', res);
        // 2. Fetch leaves by employeeId
        if (res && res.employeeId) {
          try {
            const lv = await apiClient.get(`/leaves/all?employeeId=${res.employeeId}`);
            setLeaves(lv.leaves || []);
          } catch (lvErr) {
            setLeaves([]);
            setProfileError('Failed to fetch leaves. ' + (lvErr?.message || ''));
          }
        } else {
          setLeaves([]);
        }
        // 3. Fetch attendance by employeeId
        if (res && res.employeeId) {
          try {
            console.log('Fetching attendance for employeeId:', res.employeeId);
            const att = await apiClient.getAttendanceRecords({ employeeId: res.employeeId });
            console.log('Attendance API response:', att);
            setAttendance(att.data?.records || att.records || []);
          } catch (attErr) {
            setAttendance([]);
            setProfileError('Failed to fetch attendance records. ' + (attErr?.message || ''));
          }
        } else {
          setAttendance([]);
        }
      } catch (err) {
        setProfileError('Failed to load employee details. ' + (err?.message || ''));
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [selectedEmployeeId]);

  // Only HR/admin can access
  if (!user) return <div>Loading...</div>;
  if (user.role !== 'hr' && user.role !== 'admin') return <div>Not authorized.</div>;

  // Filter employees by search
  const filteredEmployees = employees.filter(e =>
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  // Helper: check if employee is linked to a user
  const isEmployeeLinked = (employeeId) => {
    return users.some(u => u.employeeId === employeeId);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      {/* Sidebar: Employee List */}
      <div style={{ width: 320, borderRight: '1px solid #e5e7eb', background: '#fff', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #d1d5db' }}
          />
        </div>
        {loading ? (
          <div style={{ padding: 16 }}>Loading employees...</div>
        ) : error ? (
          <div style={{ padding: 16, color: 'red' }}>{error}</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ padding: 16 }}>No employees found.</div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filteredEmployees.map((e, idx) => (
              <li
                key={idx}
                style={{
                  padding: 16,
                  cursor: 'pointer',
                  background: selectedEmployeeId === e._id ? '#e0e7ff' : 'transparent',
                  borderBottom: '1px solid #f1f5f9',
                  fontWeight: selectedEmployeeId === e._id ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onClick={() => setSelectedEmployeeId(e._id)}
              >
                <span>{e.fullName}</span>
                <span style={{ fontSize: 12, color: isEmployeeLinked(e.employeeId) ? 'green' : 'red', marginLeft: 8 }}>
                  {isEmployeeLinked(e.employeeId) ? 'Linked' : 'Unlinked'}
                </span>
                {!isEmployeeLinked(e.employeeId) && (
                  <button
                    style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); window.location.href = '/hr/link-user-employee'; }}
                  >Create User</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Main Panel: Employee Details */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        {!selectedEmployeeId ? (
          <div style={{ color: '#64748b', fontSize: 24, textAlign: 'center', marginTop: 80 }}>
            Select an employee to view details
          </div>
        ) : profileLoading ? (
          <div>Loading employee details...</div>
        ) : profileError ? (
          <div style={{ color: 'red' }}>{profileError}</div>
        ) : employeeProfile ? (
          <div style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 32 }}>
            <h2 style={{ fontSize: 28, marginBottom: 8 }}>{employeeProfile.firstName} {employeeProfile.lastName}</h2>
            <div style={{ color: '#64748b', marginBottom: 16 }}>{employeeProfile.position} &mdash; {employeeProfile.department}</div>
            <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
              <div>
                <strong>Email:</strong> {employeeProfile.email}<br />
                <strong>Phone:</strong> {employeeProfile.phone}<br />
                <strong>Employee ID:</strong> {employeeProfile.employeeId}<br />
                <strong>Status:</strong> {employeeProfile.isActive ? 'Active' : 'Inactive'}<br />
                <strong>Employment Type:</strong> {employeeProfile.employmentType}<br />
                <strong>Joining Date:</strong> {employeeProfile.joiningDate ? new Date(employeeProfile.joiningDate).toLocaleDateString() : ''}<br />
                <strong>Office:</strong> {employeeProfile.officeAddress}<br />
                <strong>Reporting Supervisor:</strong> {employeeProfile.reportingSupervisor}<br />
              </div>
              <div>
                <strong>Personal Info</strong><br />
                <strong>DOB:</strong> {employeeProfile.dateOfBirth ? new Date(employeeProfile.dateOfBirth).toLocaleDateString() : ''}<br />
                <strong>Gender:</strong> {employeeProfile.gender}<br />
                <strong>Marital Status:</strong> {employeeProfile.maritalStatus}<br />
                <strong>Father:</strong> {employeeProfile.fatherName}<br />
                <strong>Mother:</strong> {employeeProfile.motherName}<br />
                <strong>Address:</strong> {employeeProfile.address}<br />
                <strong>Aadhaar:</strong> {employeeProfile.aadhaarNumber}<br />
                <strong>PAN:</strong> {employeeProfile.panNumber}<br />
                <strong>Emergency Contact:</strong> {employeeProfile.emergencyContactName} ({employeeProfile.emergencyContactNumber})<br />
              </div>
              <div>
                <strong>Financial Info</strong><br />
                <strong>Salary:</strong> {employeeProfile.salary}<br />
                <strong>Bank Name:</strong> {employeeProfile.bankName}<br />
                <strong>Account #:</strong> {employeeProfile.bankAccountNumber}<br />
                <strong>IFSC:</strong> {employeeProfile.bankIFSCCode}<br />
                <strong>Payment Mode:</strong> {employeeProfile.paymentMode}<br />
              </div>
            </div>
            {/* Attendance Chart/Table */}
            <div style={{ marginTop: 32 }}>
              <h3>Attendance</h3>
              {attendance.length === 0 ? (
                <div>No attendance records found.</div>
              ) : (
                <AttendanceTableChart attendance={attendance} />
              )}
            </div>
            {/* Leave Requests */}
            <div style={{ marginTop: 32 }}>
              <h3>Leave Requests</h3>
              {leaves.length === 0 ? (
                <div>No leave requests found.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Type</th>
                      <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Date</th>
                      <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((lv, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{lv.type}</td>
                        <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{lv.leaveDate ? new Date(lv.leaveDate).toLocaleDateString() : ''}</td>
                        <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{lv.status}</td>
                        <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{lv.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Attendance chart/table component
function AttendanceTableChart({ attendance }) {
  // Simple monthly summary chart (present/absent/half-day)
  const summary = attendance.reduce((acc, rec) => {
    acc[rec.status] = (acc[rec.status] || 0) + 1;
    return acc;
  }, {});
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div style={{ background: '#e0f2fe', padding: 12, borderRadius: 8 }}>
          Present: <b>{summary['present'] || 0}</b>
        </div>
        <div style={{ background: '#fee2e2', padding: 12, borderRadius: 8 }}>
          Absent: <b>{summary['absent'] || 0}</b>
        </div>
        <div style={{ background: '#fef9c3', padding: 12, borderRadius: 8 }}>
          Half-day: <b>{summary['half-day'] || 0}</b>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f1f5f9' }}>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Date</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Check In</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Check Out</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Status</th>
            <th style={{ padding: 8, border: '1px solid #e5e7eb' }}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((rec, idx) => (
            <tr key={idx}>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{rec.date ? new Date(rec.date).toLocaleDateString() : ''}</td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString() : '-'}</td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : '-'}</td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{rec.status}</td>
              <td style={{ padding: 8, border: '1px solid #e5e7eb' }}>{rec.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 