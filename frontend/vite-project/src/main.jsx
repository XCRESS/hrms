import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from "react-router";
import Login from "./components/login-form.jsx";
import Signup from "./components/singup-form.jsx";
import ForgotPassword from "./components/forgotPassword.jsx";
import CreateEmployee from './components/create-employee.jsx';
import GetEmployee from './components/get-employee.jsx';
import NotFound from './components/404page.jsx';
import GetProfile from './components/getProfile.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/forgotPassword" element={<ForgotPassword />} />
        <Route path="/employee/create" element={<CreateEmployee />} />
        <Route path="/employee" element={<GetEmployee />} />
        <Route path="/employee/profile" element={<GetProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
