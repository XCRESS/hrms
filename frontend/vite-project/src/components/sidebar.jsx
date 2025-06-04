"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "./ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
} from "@tabler/icons-react";
import Avatar from "./ui/avatarIcon";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/authjwt";
import { Outlet } from "react-router-dom";
import { Navigate, useLocation } from "react-router-dom";
 
export default function SidebarDemo() {
  const token = sessionStorage.getItem("authToken");
  const location = useLocation();
  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  const user = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    sessionStorage.removeItem("authToken");
    navigate("/auth/login");
  };
  const links = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: (
        <IconBrandTabler className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    // HR/admin links
    ...(() => {
      try {
        if (user && (user.role === "hr" || user.role === "admin")) {
          return [
            {
              label: "Employees",
              href: "/employee",
              icon: <IconUserBolt className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
            },
            {
              label: "Add Employee",
              href: "/employee/create",
              icon: <IconUserBolt className="h-5 w-5 shrink-0 text-green-700 dark:text-green-300" />,
            },
            {
              label: "Link User & Employee",
              href: "/employee/link",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-orange-700 dark:text-orange-300" />,
            },
            {
              label: "Leave Requests",
              href: "/leaves/all",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />,
            },
            {
              label: "Help Desk",
              href: "/help/all",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-purple-700 dark:text-purple-300" />,
            },
            {
              label: "Holidays",
              href: "/holidays/manage",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-yellow-700 dark:text-yellow-300" />,
            },
            {
              label: "Announcements",
              href: "/announcements/manage",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-pink-700 dark:text-pink-300" />,
            },
            {
              label: "Attendance Regularization",
              href: "/regularization/all",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-300" />,
            },
          ];
        } else if (user && user.role === "employee") {
          return [
            {
              label: "My Regularizations",
              href: "/regularization/my",
              icon: <IconSettings className="h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-300" />,
            },
          ];
        }
      } catch (err) {
        console.error("Sidebar role check failed", err);
      }
      return [];
    })(),
    {
      label: "Profile",
      href: "/employee/profile",
      icon: (
        <IconUserBolt className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <IconSettings className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "Logout",
      onClick: handleLogout,
      icon: (
        <IconArrowLeft className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ];
  const [open, setOpen] = useState(false);
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
                href: "/",
                icon: <Avatar name={user?.name || "User"} />,
                // icon: (
                //   <img
                //     src="https://assets.aceternity.com/manu.png"
                //     className="h-7 w-7 shrink-0 rounded-full"
                //     width={50}
                //     height={50}
                //     alt="Avatar"
                //   />
                // ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex-1 overflow-y-auto h-full">
        <Outlet /> {/* This is where nested routes render */}
      </div>
      {/* Abstract background */}
      {/* <div className="fixed pointer-events-none inset-0 z-0 opacity-5 dark:opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <pattern id="pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M0 50 L50 0 L100 50 L50 100 Z" fill="none" stroke="currentColor" strokeWidth="1"></path>
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="1"></circle>
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern)"></rect>
        </svg>
      </div> */}

    </div>
  );
}
export const Logo = () => {
  return (
    <a
      href="/"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        Punch-In
      </motion.span>
    </a>
  );
};
export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};
 
