import { Users, UserCheck, UserX, FileText, Calendar, LucideIcon } from "lucide-react";

interface SummaryData {
  presentToday?: number;
  absentToday?: number;
  totalPendingRequests?: number;
  upcomingHolidays?: number;
}

interface Stat {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'green' | 'red' | 'amber' | 'purple';
  clickable: boolean;
  onClick?: () => void;
}

interface AdminStatsProps {
  summaryData: SummaryData | null | undefined;
  isLoading: boolean;
  onPendingRequestsClick: () => void;
  onHolidaysClick: () => void;
  onAbsentEmployeesClick: () => void;
  onPresentEmployeesClick: () => void;
}

const AdminStats = ({
  summaryData,
  isLoading,
  onPendingRequestsClick,
  onHolidaysClick,
  onAbsentEmployeesClick,
  onPresentEmployeesClick
}: AdminStatsProps) => {
  const stats: Stat[] = [
    {
      title: "Present Today",
      value: summaryData?.presentToday ?? "...",
      icon: UserCheck,
      color: "green",
      clickable: true,
      onClick: onPresentEmployeesClick
    },
    {
      title: "Absent Today",
      value: summaryData?.absentToday ?? "...",
      icon: UserX,
      color: "red",
      clickable: true,
      onClick: onAbsentEmployeesClick
    },
    {
      title: "Pending Requests",
      value: summaryData?.totalPendingRequests ?? "...",
      icon: FileText,
      color: "amber",
      clickable: true,
      onClick: onPendingRequestsClick
    },
    {
      title: "Upcoming Holidays",
      value: summaryData?.upcomingHolidays ?? "...",
      icon: Calendar,
      color: "purple",
      clickable: true,
      onClick: onHolidaysClick
    },
  ];

  const colorClasses: Record<Stat['color'], string> = {
    green: "bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-300",
    red: "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300",
    amber: "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    purple: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300",
  };

  const textClasses: Record<Stat['color'], string> = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card rounded-xl shadow-lg p-3 sm:p-5 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-muted rounded-full"></div>
            </div>
            <div className="h-6 sm:h-8 bg-muted rounded w-1/2 mt-3 sm:mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const Element = stat.clickable ? 'button' : 'div';

        return (
          <Element
            key={stat.title}
            className={`bg-card rounded-xl shadow-xl p-3 sm:p-4 lg:p-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
              stat.clickable ? 'cursor-pointer hover:bg-muted dark:hover:bg-muted focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 w-full text-left' : ''
            }`}
            onClick={stat.clickable ? stat.onClick : undefined}
            aria-label={stat.clickable ? `View ${stat.title}: ${stat.value} ${stat.title.toLowerCase()}` : undefined}
            role={stat.clickable ? 'button' : undefined}
            tabIndex={stat.clickable ? 0 : undefined}
            onKeyDown={stat.clickable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                stat.onClick?.();
              }
            } : undefined}
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
                <span className="sr-only">{stat.title}: </span>
                {stat.title}
              </p>
              <div className={`p-1.5 sm:p-2 rounded-full ${colorClasses[stat.color]}`} aria-hidden="true">
                <Icon size={16} className="sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${textClasses[stat.color]}`} aria-live="polite">
              {stat.value}
            </p>
          </Element>
        );
      })}
    </div>
  );
};

export default AdminStats;
