import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/authjwt';
import apiClient from '../../../service/apiClient';
import AttendanceSection, { EditAttendanceModal } from './AttendanceSection';
import LeaveSection from './LeaveSection';
import InactiveEmployees from './InactiveEmployees';
import { Edit, Users, UserX, ToggleLeft, ToggleRight, PlusCircle, Link2 } from 'lucide-react';
import { useToast } from '../../ui/toast';









export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const userObject = useAuth();
  const { toast } = useToast();
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
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Format dates using local time to avoid timezone issues
    const startDate = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
    const endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return {
      startDate,
      endDate
    };
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [attendanceUpdateTrigger, setAttendanceUpdateTrigger] = useState(0);
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'
  const [togglingStatus, setTogglingStatus] = useState(null);

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
        // Note: Attendance will now be fetched directly by the AttendanceTable component
        // This ensures it uses the correct API with absent days and proper filtering
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
        // Load only active employees for main directory
        const res = await apiClient.getEmployees({ status: 'active' });
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

  const handleEditAttendance = (record) => {
    setEditingRecord(record);
    setEditModalOpen(true);
  };

  const handleAttendanceUpdate = () => {
    setAttendanceUpdateTrigger(prev => prev + 1);
    setEditModalOpen(false);
    setEditingRecord(null);
  };

  const handleEditEmployee = () => {
    setIsEditingEmployee(true);
    setEditedEmployee({ ...employeeProfile });
  };

  const handleCancelEdit = () => {
    setIsEditingEmployee(false);
    setEditedEmployee(null);
  };

  const handleSaveEmployee = async () => {
    try {
      await apiClient.put(`/employees/${employeeProfile._id}`, editedEmployee);
      setEmployeeProfile(editedEmployee);
      setIsEditingEmployee(false);
      setEditedEmployee(null);
      // Refresh employee list
      const res = await apiClient.getEmployees({ status: 'active' });
      setEmployees(res.employees || []);
    } catch (error) {
      console.error('Failed to update employee:', error);
      alert('Failed to update employee: ' + error.message);
    }
  };

  const handleToggleEmployeeStatus = async (employeeId, currentStatus, employeeName) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    const confirmMessage = currentStatus 
      ? `Are you sure you want to deactivate ${employeeName}? This will prevent them from logging in and remove them from active employee lists.`
      : `Are you sure you want to activate ${employeeName}? This will restore their access to the system.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setTogglingStatus(employeeId);
      const response = await apiClient.toggleEmployeeStatus(employeeId);
      
      if (response.message) {
        toast({
          variant: "success",
          title: `Employee ${action}d`,
          description: response.message
        });
        
        // Refresh employee list and profile if needed
        const res = await apiClient.getEmployees({ status: 'active' });
        setEmployees(res.employees || []);
        
        // If the current profile was deactivated, clear the selection
        if (selectedEmployeeId === employeeId && currentStatus) {
          setSelectedEmployeeId(null);
          setEmployeeProfile(null);
        } else if (selectedEmployeeId === employeeId) {
          // Refresh the current profile
          fetchEmployeeData();
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} employee:`, error);
      toast({
        variant: "error",
        title: "Error",
        description: error.message || `Failed to ${action} employee`
      });
    } finally {
      setTogglingStatus(null);
    }
  };

  const handleFieldChange = (field, value) => {
        if (type === 'date') {
      const [day, month, year] = value.split('/');
      value = new Date(`${year}-${month}-${day}`).toISOString();
    }
    setEditedEmployee(prev => ({ ...prev, [field]: value }));
  };

  const renderField = (label, field, type = 'text', options = []) => {
        let value = isEditingEmployee ? editedEmployee?.[field] || '' : employeeProfile[field];
    if (type === 'date' && value) {
        value = new Date(value).toLocaleDateString('en-GB');
    }
    
    if (!isEditingEmployee) {
      return <p><strong>{label}:</strong> {value || 'N/A'}</p>;
    }

    if (type === 'select') {
      return (
        <div>
          <strong>{label}:</strong>
          <select
            value={value}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
          >
            {options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      );
    }

    if (type === 'date') {
            const formattedValue = value ? new Date(value).toLocaleDateString('en-GB') : '';
      return (
        <div>
          <strong>{label}:</strong>
          <input
            type="date"
            value={formattedValue}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      );
    }

    return (
      <div>
        <strong>{label}:</strong>
        <input
          type={type}
          value={value}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Main Navigation Tabs */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'active'
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm">Active</span>
              </button>
              <button
                onClick={() => setActiveTab('inactive')}
                className={`flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === 'inactive'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md'
                }`}
              >
                <UserX className="w-4 h-4" />
                <span className="text-sm">Inactive</span>
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate('/employees/add')}
                className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-green-600 text-white shadow-lg shadow-green-600/25 hover:bg-green-700 hover:shadow-green-600/30"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </button>
              <button
                onClick={() => navigate('/employees/link')}
                className="flex-1 sm:flex-none flex items-center justify-center sm:justify-start space-x-2 px-4 py-3 sm:py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/30"
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Link User</span>
                <span className="sm:hidden">Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'inactive' ? (
        <div className="p-6">
          <InactiveEmployees />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar: Employee List */}
          <div className="w-full lg:w-80 lg:h-[calc(100vh-80px)] lg:sticky lg:top-20 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-colors"
              />
            </div>
        <div className="flex-grow overflow-y-auto max-h-96 lg:max-h-none">
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
      <div className="flex-1 lg:overflow-y-auto p-6 lg:p-8">
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 lg:p-8">
            <div className="mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-cyan-700 dark:text-cyan-300">
                    {employeeProfile.firstName} {employeeProfile.lastName}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {employeeProfile.position} &mdash; {employeeProfile.department}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {isEditingEmployee ? (
                    <>
                      <button
                        onClick={handleSaveEmployee}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        💾 Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditEmployee}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Employee
                      </button>
                      <button
                        onClick={() => handleToggleEmployeeStatus(
                          employeeProfile._id, 
                          employeeProfile.isActive, 
                          `${employeeProfile.firstName} ${employeeProfile.lastName}`
                        )}
                        disabled={togglingStatus === employeeProfile._id}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                          employeeProfile.isActive
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        } disabled:opacity-50`}
                      >
                        {togglingStatus === employeeProfile._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            {employeeProfile.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                            <span>{employeeProfile.isActive ? 'Deactivate' : 'Activate'}</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 text-sm">
              {/* Contact & Work Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Contact & Work</h3>
                {renderField('Email', 'email', 'email')}
                {renderField('Phone', 'phone', 'tel')}
                <p><strong>Employee ID:</strong> {employeeProfile.employeeId}</p>
                {renderField('Company', 'companyName')}
                <p><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${employeeProfile.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100'}`}>
                    {employeeProfile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                {renderField('Employment Type', 'employmentType', 'select', ['Full-time', 'Part-time', 'Contract', 'Intern'])}
                {renderField('Joining Date', 'joiningDate', 'date')}
                {renderField('Office', 'officeAddress', 'select', ['SanikColony', 'Indore', 'N.F.C.'])}
                {renderField('Supervisor', 'reportingSupervisor')}
              </div>

              {/* Personal Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Personal Information</h3>
                {renderField('Date of Birth', 'dateOfBirth', 'date')}
                {renderField('Gender', 'gender', 'select', ['male', 'female', 'other'])}
                {renderField('Marital Status', 'maritalStatus', 'select', ['single', 'married', 'divorced'])}
                {renderField('Father\'s Name', 'fatherName')}
                {renderField('Father\'s Phone', 'fatherPhone', 'tel')}
                {renderField('Mother\'s Name', 'motherName')}
                {renderField('Mother\'s Phone', 'motherPhone', 'tel')}
                {renderField('Address', 'address')}
                {renderField('Aadhaar', 'aadhaarNumber', 'number')}
                {renderField('PAN', 'panNumber')}
                {renderField('Emergency Contact Name', 'emergencyContactName')}
                {renderField('Emergency Contact Number', 'emergencyContactNumber', 'tel')}
              </div>

              {/* Financial Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-cyan-600 dark:text-cyan-400 mb-2">Financial Information</h3>
                {renderField('Bank', 'bankName')}
                {renderField('Account #', 'bankAccountNumber')}
                {renderField('IFSC', 'bankIFSCCode')}
                {renderField('Payment Mode', 'paymentMode', 'select', ['Bank Transfer', 'Cheque', 'Cash'])}
              </div>
            </div>

            {/* Enhanced Attendance Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Attendance Records</h3>
              <AttendanceSection 
                employeeProfile={employeeProfile} 
                dateRange={dateRange} 
                onDateRangeChange={setDateRange}
                onEditAttendance={handleEditAttendance}
                updateTrigger={attendanceUpdateTrigger}
              />
            </div>

            {/* Enhanced Leave Requests Section */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-cyan-700 dark:text-cyan-300 mb-4">Leave Management</h3>
              <LeaveSection leaves={leaves} employeeProfile={employeeProfile} />
            </div>
          </div>
        ) : null}

        {/* Edit Attendance Modal */}
        <EditAttendanceModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          record={editingRecord}
          employeeProfile={employeeProfile}
          onUpdate={handleAttendanceUpdate}
        />
      </div>
    </div>
    )}
    </div>
  );
} 