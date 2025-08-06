"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Link2,
  CalendarOff,
  HelpingHand,
  CalendarDays,
  Megaphone,
  CheckSquare,
  LogOut,
  KeyRound,
  FileText,
  Receipt,
  DollarSign,
  MessageCircle,
  Shield
} from "lucide-react";
import Avatar from "./ui/avatarIcon";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/authjwt";
import { Outlet } from "react-router-dom";
 
export default function SidebarDemo() {
  // All hooks must be called at the top level, before any conditional returns.
  const location = useLocation();
  const navigate = useNavigate();
  const userObject = useAuth();
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("authToken");
  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If token exists but user is not yet resolved, or token was invalid and cleared by useAuth
  // wait for user object to be populated or for token to be removed triggering above redirect.
  if (!userObject) {
    // Re-check token after useAuth has processed it (in case it was removed due to expiration)
    const currentToken = localStorage.getItem("authToken");
    if (!currentToken) {
      return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }
    return null; // Or a loading spinner, e.g., <p>Loading user...</p>
  }
  const user = userObject;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/auth/login");
  };

  const iconClass = "h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200";
  const accentIconClass = (color) => `h-5 w-5 shrink-0 text-${color}-700 dark:text-${color}-300`;

  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className={iconClass} />,
    },
    // HR/admin links
    ...(() => {
      try {
        if (user && (user.role === "hr" || user.role === "admin")) {
          return [
            {
              label: "Employees",
              href: "/employees",
              icon: <Users className={iconClass} />,
            },
            
            
            {
              label: "Requests",
              href: "/admin/requests",
              icon: <FileText className={accentIconClass('blue')} />,
            },
            {
              label: "Holidays",
              href: "/holidays",
              icon: <CalendarDays className={accentIconClass('yellow')} />,
            },
            {
              label: "Announcements",
              href: "/announcements",
              icon: <Megaphone className={accentIconClass('pink')} />,
            },
            {
              label: "Policies",
              href: "/policies",
              icon: <Shield className={accentIconClass('indigo')} />,
            },
            {
              label: "Task Reports",
              href: "/task-reports",
              icon: <FileText className={accentIconClass('purple')} />,
            },
            {
              label: "Salary",
              href: "/salary",
              icon: <DollarSign className={accentIconClass('green')} />,
            },
            {
              label: "HR Buddy",
              href: "/chatbot",
              icon: <MessageCircle className={accentIconClass('orange')} />,
            },
          ];
        } else if (user && user.role === "employee") {
          return [
            {
              label: "Attendance",
              href: "/attendance/my",
              icon: <CalendarDays className={accentIconClass('blue')} />,
            },
            {
              label: "Task Reports",
              href: "/task-reports/my",
              icon: <FileText className={accentIconClass('purple')} />,
            },
            {
              label: "Salary Slips",
              href: "/salary-slips/my",
              icon: <Receipt className={accentIconClass('green')} />,
            },
            {
              label: "Requests",
              href: "/requests",
              icon: <FileText className={accentIconClass('blue')} />,
            },
            {
              label: "Holidays",
              href: "/holidays",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Announcements",
              href: "/announcements",
              icon: <Megaphone className={iconClass} />,
            },
          ];
        }
      } catch (err) {
        console.error("Sidebar role check failed", err);
      }
      return [];
    })(),
    {
      label: "Logout",
      onClick: handleLogout,
      icon: <LogOut className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />,
    },
  ];

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
        "h-screen",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10 z-50 border-r-1">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || "User",
                href: "/profile",
                icon: <Avatar name={user?.name || "User"} />,
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-w-0 md:ml-[60px] transition-all duration-300">
        <Outlet />
      </div>
    </div>
  );
}
export const Logo = () => {
  return (
    <a
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        HRMS
      </motion.span>
    </a>
  );
};
export const LogoIcon = () => {
  return (
    <a
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black dark:text-white"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};
 
