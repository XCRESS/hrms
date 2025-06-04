import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/login-form.jsx";
import Signup from "./components/singup-form.jsx";
import ForgotPassword from "./components/forgotPassword.jsx";
import CreateEmployee from './components/create-employee.jsx';
import GetEmployee from './components/get-employee.jsx';
import NotFound from './components/404page.jsx';
import GetProfile from './components/getProfile.jsx';
import HRMSDashboard from './components/dashboard.jsx';
import SidebarDemo from './components/sidebar.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ToastContext } from './components/ui/toast.jsx';
import LeavesAll from './components/hr/LeavesAll';
import HelpAll from './components/hr/HelpAll';
import HolidaysManage from './components/hr/HolidaysManage';
import AnnouncementsManage from './components/hr/AnnouncementsManage';
import EmployeeDirectory from './components/hr/EmployeeDirectory';
import EmployeeLink from './components/hr/EmployeeLink';
import MyRegularizations from './components/regularization/MyRegularizations';
import RegularizationAll from './components/regularization/RegularizationAll';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastContext>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SidebarDemo />}>
              {/* <Route path="/" element={<App />} /> */}
              <Route path="/employee/create" element={<CreateEmployee />} />
              <Route path="/employee" element={<EmployeeDirectory />} />
              <Route path="/employee/profile" element={<GetProfile />} />
              <Route path="/dashboard" element={<HRMSDashboard/>} />
              <Route path="/leaves/all" element={<LeavesAll />} />
              <Route path="/help/all" element={<HelpAll />} />
              <Route path="/holidays/manage" element={<HolidaysManage />} />
              <Route path="/announcements/manage" element={<AnnouncementsManage />} />
              <Route path="/employee/link" element={<EmployeeLink />} />
              <Route path="/regularization/my" element={<MyRegularizations />} />
              <Route path="/regularization/all" element={<RegularizationAll />} />
            </Route>

            {/* auth routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/forgotPassword" element={<ForgotPassword />} />

            {/* not found route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ToastContext>
  </StrictMode>,
)
