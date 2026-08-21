import { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink, SIDEBAR_WIDTH_COLLAPSED } from "./ui/sidebar";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Megaphone,
  LogOut,
  FileText,
  Receipt,
  DollarSign,
  MessageCircle,
  Shield,
  Settings,
  Palette
} from "lucide-react";
import Avatar from "./ui/avatarIcon";
import { cn } from "@/lib/utils";
import { useNavigate, Navigate, useLocation } from "react-router";
import useAuth from "../hooks/authjwt";
import { Outlet } from "react-router";
import { tokenStorage } from "@/lib/tokenStorage";

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
}

/**
 * Layout route for every authenticated page: renders the persistent sidebar
 * once and swaps only the <Outlet />. Was named `SidebarDemo`, a leftover from
 * the component this was originally adapted from.
 */
export default function AppLayout() {
  // All hooks must be called at the top level, before any conditional returns.
  const location = useLocation();
  const navigate = useNavigate();
  const userObject = useAuth() as User | null;
  const [open, setOpen] = useState(false);

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

  const handleLogout = () => {
    // Goes through tokenStorage rather than localStorage directly: the raw
    // call left `authTokenExpiresAt` behind, so isExpired() kept reading a
    // stale expiry after logout. tokenStorage.remove() clears both keys and
    // swallows the quota/permission errors localStorage can throw in private
    // browsing.
    //
    // The setTimeout(0) that used to wrap this navigate() was unnecessary —
    // localStorage writes are synchronous and already committed here. All it
    // did was leave one frame where the app rendered logged-out but had not
    // navigated yet.
    tokenStorage.remove();
    navigate("/");
  };

  const iconClass = "h-5 w-5 shrink-0 text-sidebar-foreground transition-colors duration-200";

  const links: LinkItem[] = [
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
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Expenses",
              href: "/admin/expenses",
              icon: <Receipt className={iconClass} />,
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
            {
              label: "Policies",
              href: "/policies",
              icon: <Shield className={iconClass} />,
            },
            {
              label: "Task Reports",
              href: "/task-reports",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Salary",
              href: "/salary",
              icon: <DollarSign className={iconClass} />,
            },
            {
              label: "HR Buddy",
              href: "/chatbot",
              icon: <MessageCircle className={iconClass} />,
            },
            {
              label: "Settings",
              href: "/settings",
              icon: <Settings className={iconClass} />,
            },
          ] as LinkItem[];
        } else if (user && user.role === "employee") {
          return [
            {
              label: "Attendance",
              href: "/attendance/my",
              icon: <CalendarDays className={iconClass} />,
            },
            {
              label: "Task Reports",
              href: "/task-reports/my",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Salary Slips",
              href: "/salary-slips/my",
              icon: <Receipt className={iconClass} />,
            },
            {
              label: "Requests",
              href: "/requests",
              icon: <FileText className={iconClass} />,
            },
            {
              label: "Expenses",
              href: "/expenses/my",
              icon: <Receipt className={iconClass} />,
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
            {
              label: "Appearance",
              href: "/appearance",
              icon: <Palette className={iconClass} />,
            },
          ] as LinkItem[];
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
        // h-dvh, not h-screen: 100vh ignores mobile browser chrome, so the
        // layout ran taller than the visible area while the URL bar showed.
        "h-dvh",
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-4 z-50 border-r-1">
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
        className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 min-w-0 transition-all duration-300 md:ml-(--sidebar-offset)"
        style={{ '--sidebar-offset': `${SIDEBAR_WIDTH_COLLAPSED}px` } as React.CSSProperties}
      >
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