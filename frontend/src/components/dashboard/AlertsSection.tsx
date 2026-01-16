import { useState } from 'react';
import { Bell, X, Cake, Trophy } from 'lucide-react';
import { useTodayAlerts } from '@/hooks/queries';
import type { TodayAlert } from '@/types';

const AlertsSection = () => {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const { data: alerts = [], isLoading } = useTodayAlerts();

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  // Safely handle alerts - filter only birthday/milestone/anniversary types
  const visibleAlerts = (alerts || []).filter((alert: TodayAlert) =>
    !dismissedAlerts.has(alert.employeeId) &&
    (alert.type === 'birthday' || alert.type === 'anniversary' || alert.type === 'milestone')
  );

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <h3 className="text-sm font-medium text-foreground">
          Today's Celebrations
        </h3>
      </div>

      <div className="space-y-3">
        {visibleAlerts.map((alert) => (
          <div
            key={`alert-${alert.type}-${alert.employeeId}`}
            className={`flex items-start gap-3 p-3 rounded-lg border ${alert.type === 'birthday'
              ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'birthday' ? (
                <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                  <Cake className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {alert.employeeName}
                  </p>
                  <p className={`text-xs ${alert.type === 'birthday'
                    ? 'text-pink-600 dark:text-pink-400'
                    : 'text-amber-600 dark:text-amber-400'
                    }`}>
                    ID: {alert.employeeId}
                  </p>
                </div>

                <button
                  onClick={() => dismissAlert(alert.employeeId)}
                  className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
                  title="Dismiss alert"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>

              <div className="mt-2">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsSection;
