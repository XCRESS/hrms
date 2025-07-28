import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/login-form.jsx";
import Signup from "./components/singup-form.jsx";
import ForgotPassword from "./components/forgotPassword.jsx";

import NotFound from './components/404page.jsx';
import SidebarDemo from './components/sidebar.jsx';
import LoaderGate from './components/loadingAnimation.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { Toaster } from './components/ui/toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Lazy load heavy components
const HRMSDashboard = lazy(() => import('./components/dashboard.jsx'));
const GetProfile = lazy(() => import('./components/getProfile.jsx'));
const EmployeeDirectory = lazy(() => import('./components/hr/employeeDirectory/EmployeeDirectory.jsx'));
const AddEmployee = lazy(() => import('./components/hr/employeeDirectory/AddEmployee.jsx'));
const EmployeeLink = lazy(() => import('./components/hr/employeeDirectory/EmployeeLink.jsx'));
const HolidayManagementPage = lazy(() => import('./components/hr/HolidaysPage.jsx'));
const AnnouncementsPage = lazy(() => import('./components/hr/AnnouncementsPage.jsx'));
const TaskReportsManage = lazy(() => import('./components/hr/TaskReportsPage.jsx'));
const TaskReportGenerator = lazy(() => import('./components/hr/TaskReportGenerator.jsx'));
const MyAttendance = lazy(() => import('./components/employee/MyAttendance.jsx'));
const MyTaskReports = lazy(() => import('./components/employee/MyTaskReports.jsx'));
const MySalarySlips = lazy(() => import('./components/employee/MySalarySlips.jsx'));
const SalarySlipManagement = lazy(() => import('./components/hr/salary/SalarySlipManagement.jsx'));
const SalaryStructureManagement = lazy(() => import('./components/hr/salary/SalaryStructureManagement.jsx'));
const SalaryHub = lazy(() => import('./components/hr/salary/SalaryHub.jsx'));
const MyRequests = lazy(() => import('./components/employee/MyRequests.jsx'));
const AdminRequestsPage = lazy(() => import('./components/hr/AdminRequestsPage.jsx'));
const ChatBot = lazy(() => import('./components/chatbot/chatbot.jsx'));

// Optimized loading component with reduced animation
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LoaderGate>
        <Toaster>
          <ThemeProvider>
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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
                  <Route path="chatbot" element={<ChatBot />} />
                </Route>

                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/signup" element={<Signup />} />
                <Route path="/auth/forgotPassword" element={<ForgotPassword />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </Toaster>
      </LoaderGate>
    </ErrorBoundary>
  </StrictMode>,
)
