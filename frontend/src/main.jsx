import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/login-form.jsx";
import Signup from "./components/singup-form.jsx";
import ForgotPassword from "./components/forgotPassword.jsx";

import NotFound from './components/404page.jsx';
import GetProfile from './components/getProfile.jsx';
import HRMSDashboard from './components/dashboard.jsx';
import SidebarDemo from './components/sidebar.jsx';
import LoaderGate from './components/loadingAnimation.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { Toaster } from './components/ui/toast.jsx';
import EmployeeDirectory from './components/hr/employeeDirectory/EmployeeDirectory.jsx';
import AddEmployee from './components/hr/employeeDirectory/AddEmployee.jsx';
import EmployeeLink from './components/hr/employeeDirectory/EmployeeLink.jsx';
import HolidayManagementPage from './components/hr/HolidaysPage.jsx';
import AnnouncementsPage from './components/hr/AnnouncementsPage.jsx';
import TaskReportsManage from './components/hr/TaskReportsPage.jsx';
import TaskReportGenerator from './components/hr/TaskReportGenerator.jsx';
import MyAttendance from './components/employee/MyAttendance.jsx';
import MyTaskReports from './components/employee/MyTaskReports.jsx';
import MySalarySlips from './components/employee/MySalarySlips.jsx';
import SalarySlipManagement from './components/hr/salary/SalarySlipManagement.jsx';
import SalaryStructureManagement from './components/hr/salary/SalaryStructureManagement.jsx';
import SalaryHub from './components/hr/salary/SalaryHub.jsx';
import MyRequests from './components/employee/MyRequests.jsx';
import AdminRequestsPage from './components/hr/AdminRequestsPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { API_ENDPOINTS } from './service/apiEndpoints.js';

// Get server URL for LoaderGate
const serverUrl = API_ENDPOINTS.BASE_URL.replace('/api', '');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LoaderGate serverUrl={serverUrl}>
        <Toaster>
          <ThemeProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<SidebarDemo />}>
                <Route index element={<HRMSDashboard />} />
                <Route path="dashboard" element={<HRMSDashboard />} />
                
                <Route path="employees" element={<EmployeeDirectory />} />
                <Route path="employees/add" element={<AddEmployee />} />
                <Route path="employees/link" element={<EmployeeLink />} />
                <Route path="holidays" element={<HolidayManagementPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="attendance/my" element={<MyAttendance />} />
                <Route path="task-reports/my" element={<MyTaskReports />} />
                <Route path="salary-slips/my" element={<MySalarySlips />} />
                <Route path="profile" element={<GetProfile />} />
                <Route path="task-reports" element={<TaskReportsManage />} />
                <Route path="task-reports/generate" element={<TaskReportGenerator />} />
                <Route path="salary" element={<SalaryHub />} />
                <Route path="salary-structures" element={<SalaryStructureManagement />} />
                <Route path="salary-slips" element={<SalarySlipManagement />} />
                <Route path="requests" element={<MyRequests />} />
                <Route path="admin/requests" element={<AdminRequestsPage />} />
              </Route>

              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/forgotPassword" element={<ForgotPassword />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </Toaster>
      </LoaderGate>
    </ErrorBoundary>
  </StrictMode>,
)
