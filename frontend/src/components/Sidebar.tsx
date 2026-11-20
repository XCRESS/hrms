import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink, SIDEBAR_WIDTH_COLLAPSED } from "./ui/sidebar";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Megaphone,
  LogOut,
  FileText,
  FilePen,
  Receipt,
  DollarSign,
  MessageCircle,
  Shield,
  Settings,
  Palette
} from "lucide-react";
import {
  IconLayoutDashboard,
  IconLayoutDashboardFilled,
  IconUser,
  IconUserFilled,
  IconFileText,
  IconFileTextFilled,
  IconCalendarMonth,
  IconCalendarMonthFilled,
} from "@tabler/icons-react";
import Avatar from "./ui/avatarIcon";
import { cn } from "@/lib/utils";
import { useNavigate, Navigate, useLocation } from "react-router";
import useAuth from "../hooks/authjwt";
import { Outlet } from "react-router";
import { tokenStorage } from "@/lib/tokenStorage";
import { useQueryClient } from "@tanstack/react-query";
import { detachPushOnLogout } from "@/services/pushClient";
import ServiceWorkerBridge from "./notifications/ServiceWorkerBridge";
import FestiveThemeSync from "./festive/FestiveThemeSync";
import MoreMenu from "./MoreMenu";

interface User {
  name?: string;
  email?: string;
  role?: string;
}

interface LinkItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  /** Heading the link is grouped under in the mobile menu; unsectioned links are left out of it. */
  section?: string;
}

/** Layout route for every authenticated page: renders the sidebar once and swaps only the <Outlet />. */
export default function AppLayout() {
  // All hooks must be called at the top level, before any conditional returns.
  const location = useLocation();
  const navigate = useNavigate();
  const userObject = useAuth() as User | null;
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const token = tokenStorage.get();
  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If token exists but user is not yet resolved, or token was invalid and cleared by useAuth
  // wait for user object to be populated or for token to be removed triggering above redirect.
  if (!userObject) {
    // Re-check token after useAuth has processed it (in case it was removed due to expiration)
    const currentToken = tokenStorage.get();
    if (!currentToken) {
      return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }
    // Show loading spinner while token is being validated
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
          <div className="text-sm text-muted-foreground">Authenticating...</div>
        </div>
      </div>
    );
  }
  const user = userObject;

  const handleLogout = async () => {
    await detachPushOnLogout();
    tokenStorage.remove();
    queryClient.clear();
    navigate("/");
  };

  // No text-* colour: the icon inherits currentColor so active/hover reach it.
  const iconClass = "h-5 w-5 shrink-0 transition-colors duration-200";
  const tabIcon = "h-6 w-6 shrink-0";

  // Three highest-traffic destinations per role; the rest live in "More".
  const isHR = user?.role === "hr" || user?.role === "admin";
  const mobileTabs: LinkItem[] = isHR
    ? [
        { label: "Dashboard", href: "/dashboard", icon: <IconLayoutDashboard className={tabIcon} />, activeIcon: <IconLayoutDashboardFilled className={tabIcon} /> },
        { label: "Employees", href: "/employees", icon: <IconUser className={tabIcon} />, activeIcon: <IconUserFilled className={tabIcon} /> },
        { label: "Requests", href: "/admin/requests", icon: <IconFileText className={tabIcon} />, activeIcon: <IconFileTextFilled className={tabIcon} /> },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: <IconLayoutDashboard className={tabIcon} />, activeIcon: <IconLayoutDashboardFilled className={tabIcon} /> },
        { label: "Attendance", href: "/attendance/my", icon: <IconCalendarMonth className={tabIcon} />, activeIcon: <IconCalendarMonthFilled className={tabIcon} /> },
        { label: "Requests", href: "/requests", icon: <IconFileText className={tabIcon} />, activeIcon: <IconFileTextFilled className={tabIcon} /> },
      ];

  const links: LinkItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className={iconClass} />,
    },
    ...((isHR
      ? [
            {
              label: "Employees",
              href: "/employees",
              icon: <Users className={iconClass} />,
            },
            {
              label: "Requests",
              href: "/admin/requests",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Expenses",
              section: "Workspace",
              href: "/admin/expenses",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "Holidays",
              section: "Workspace",
              href: "/holidays",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Announcements",
              section: "Workspace",
              href: "/announcements",
              icon: <Megaphone className={iconClass} />,
            },
            {
              label: "Policies",
              section: "Workspace",
              href: "/policies",
              icon: <Shield className={iconClass} />,
            },
            {
              label: "Task Reports",
              section: "People & payroll",
              href: "/task-reports",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Salary",
              section: "People & payroll",
              href: "/salary",
              icon: <DollarSign className={iconClass} />,
            },
            {
              label: "Letters",
              section: "People & payroll",
              href: "/letters",
              icon: <FilePen className={iconClass} />,
            },
            {
              label: "HR Buddy",
              section: "Tools",
              href: "/chatbot",
              icon: <MessageCircle className={iconClass} />,
            },
            {
              label: "Settings",
              section: "Preferences",
              href: "/settings",
              icon: <Settings className={iconClass} />,
            },
        ]
      : user?.role === "employee"
      ? [
            {
              label: "Attendance",
              section: "Your work",
              href: "/attendance/my",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Task Reports",
              section: "Your work",
              href: "/task-reports/my",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Salary Slips",
              section: "Your work",
              href: "/salary-slips/my",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "My Letters",
              section: "Your work",
              href: "/letters/my",
              icon: <FilePen className={iconClass} />,
            },
            {
              label: "Requests",
              section: "Your work",
              href: "/requests",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Expenses",
              section: "Your work",
              href: "/expenses/my",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "Holidays",
              section: "Company",
              href: "/holidays",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Announcements",
              section: "Company",
              href: "/announcements",
              icon: <Megaphone className={iconClass} />,
            },
            {
              label: "Appearance",
              section: "Preferences",
              href: "/appearance",
              icon: <Palette className={iconClass} />,
            },
        ]
      : []) as LinkItem[]),
    {
      label: "Logout",
      onClick: handleLogout,
      icon: <LogOut className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />,
    },
  ];

  return (
    <div
      data-app-shell=""
      className={cn(
        "mx-auto flex w-full flex-1 flex-col overflow-hidden bg-gray-100 md:flex-row dark:bg-neutral-800",
        // Rounded corners and a border only from md up. On mobile the fixed
        // bottom nav is clipped by this container's overflow-hidden, so the
        // rounding cut its corners and the border left a visible gutter down
        // each side — the bar read as a floating island rather than an edge.
        "md:rounded-md md:border md:border-neutral-200 dark:md:border-neutral-700",
        // Height comes from flex-1 against #root, which index.css pins to the
        // viewport. Setting h-dvh here as well fought that: a fixed 100dvh plus
        // this element's own border overflowed the pinned parent, and the
        // document grew a second scrollbar over a dead gutter.
        "min-h-0",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        {/* No border class here: this className reaches both the desktop rail
            and the mobile bottom bar, and each needs its own edge (right vs
            top). They set their own in ui/sidebar.tsx. */}
        <SidebarBody
          className="justify-between gap-4 z-50"
          tabs={mobileTabs}
          menu={
            <MoreMenu
              user={user}
              items={links.filter((link) => !mobileTabs.some((t) => t.href === link.href))}
              onLogout={handleLogout}
            />
          }
        >
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto scrollbar-hide min-h-0">
            <div className="mt-4 flex flex-col gap-0.5">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="shrink-0 pt-2 border-t border-sidebar-border">
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
      {/* Offset matches the collapsed rail. The rail expands on hover/focus as
          an overlay above the content rather than pushing it, so this stays
          fixed at the collapsed width — previously it was a hardcoded 80px
          that silently assumed the same thing. */}
      <div
        className="flex-1 overflow-y-auto bg-background min-w-0 transition-all duration-300 md:ml-(--sidebar-offset)"
        style={{ '--sidebar-offset': `${SIDEBAR_WIDTH_COLLAPSED}px` } as React.CSSProperties}
      >
        <ServiceWorkerBridge />
        <FestiveThemeSync />
        <Outlet />
        {/* Spacer for the fixed mobile bottom bar. Without it the last rows of
            every scrollable page sit underneath the tabs and cannot be reached.
            Padding on this container would not work — it scrolls, so the pad
            would scroll away with the content.
            Height tracks the bar: min-h-14 (3.5rem) plus its bottom inset. */}
        <div
          aria-hidden="true"
          className="md:hidden"
          style={{ height: 'calc(3.5rem + max(0.25rem, env(safe-area-inset-bottom)))' }}
        />
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
      <span className="font-medium whitespace-pre text-black dark:text-white">
        HRMS
      </span>
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