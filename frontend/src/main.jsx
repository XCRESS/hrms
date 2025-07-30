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
import { DataCacheProvider } from './contexts/DataCacheContext.jsx';
import { Toaster } from './components/ui/toast.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import DebugPanel from './components/DebugPanel.jsx';
import './utils/debugUtils.js'; // Initialize debug utilities

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

// 🚀 PHASE 2 OPTIMIZATION: Enhanced loading component with skeleton
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto"></div>
      <div className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">Loading...</div>
      {/* Skeleton loading for better UX */}
      <div className="hidden sm:block space-y-2 w-64">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  </div>
);

// 🚀 PHASE 2 OPTIMIZATION: Component-specific loading states for better UX
const DashboardLoader = () => (
  <div className="p-6 space-y-6">
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse shadow-sm">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
    {/* Main content skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse shadow-sm">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse shadow-sm">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced loading states for different component types
const TableLoader = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse shadow-sm">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
        </div>
      ))}
    </div>
  </div>
);

const FormLoader = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse shadow-sm">
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <LoaderGate>
        <Toaster>
          <ThemeProvider>
            <DataCacheProvider>
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
              <DebugPanel />
            </DataCacheProvider>
          </ThemeProvider>
        </Toaster>
      </LoaderGate>
    </ErrorBoundary>
  </StrictMode>,
)
