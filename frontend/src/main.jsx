import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/login-form.jsx";
import Signup from "./components/singup-form.jsx";
import ForgotPassword from "./components/forgotPassword.jsx";
import CreateEmployee from './components/create-employee.jsx';
import NotFound from './components/404page.jsx';
import GetProfile from './components/getProfile.jsx';
import HRMSDashboard from './components/dashboard.jsx';
import SidebarDemo from './components/sidebar.jsx';
import LoaderGate from './components/loadingAnimation.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { Toaster } from './components/ui/toast.jsx';
import LeavesAll from './components/hr/LeavesAll.jsx';
import HelpAll from './components/hr/HelpAll.jsx';
import EmployeeDirectory from './components/hr/employeeDirectory/EmployeeDirectory.jsx';
import EmployeeLink from './components/hr/EmployeeLink.jsx';
import HolidayManagementPage from './components/hr/HolidayManagementPage.jsx';
import AnnouncementsPage from './components/hr/AnnouncementsPage.jsx';
import PasswordRequestsPage from './components/hr/PasswordRequestsPage.jsx';
import MyRegularizations from './components/regularization/MyRegularizations.jsx';
import RegularizationAll from './components/regularization/RegularizationAll.jsx';
import TaskReportsManage from './components/hr/TaskReportsManage.jsx';
import MyAttendance from './components/employee/MyAttendance.jsx';
import MyTaskReports from './components/employee/MyTaskReports.jsx';
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
                <Route path="create" element={<CreateEmployee />} />
                <Route path="employee" element={<EmployeeDirectory />} />
                <Route path="link" element={<EmployeeLink />} />
                <Route path="leaves" element={<LeavesAll />} />
                <Route path="help" element={<HelpAll />} />
                <Route path="holidays" element={<HolidayManagementPage />} />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="password" element={<PasswordRequestsPage />} />
                <Route path="regularization" element={<RegularizationAll />} />
                <Route path="regularization/my" element={<MyRegularizations />} />
                <Route path="attendance/my" element={<MyAttendance />} />
                <Route path="task-reports/my" element={<MyTaskReports />} />
                <Route path="profile" element={<GetProfile />} />
                <Route path="task-reports" element={<TaskReportsManage />} />
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
