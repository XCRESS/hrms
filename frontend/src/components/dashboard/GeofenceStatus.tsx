import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Crosshair, Loader2, MapPin, MapPinOff, SignalLow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { useGeofenceCheck } from '@/hooks/queries/useOfficeLocations';
import { acquireBestFix, formatDistance, getGeoPermission, GeoError } from '@/utils/geolocation';

const tone = {
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  muted: 'border-border bg-muted text-muted-foreground',
} as const;

function Chip({ kind, icon, children }: { kind: keyof typeof tone; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p role="status" className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', tone[kind])}>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Tells the employee whether check-in will pass *before* they tap it. Only
 * reads location when permission is already granted, so it never prompts on
 * page load.
 */
export default function GeofenceStatus() {
  const queryClient = useQueryClient();

  const { data: permission } = useQuery({
    queryKey: queryKeys.geo.permission(),
    queryFn: getGeoPermission,
    staleTime: Infinity,
  });

  const fixQuery = useQuery({
    queryKey: queryKeys.geo.fix(),
    queryFn: () => acquireBestFix({ maxWaitMs: 8000 }),
    enabled: permission === 'granted',
    staleTime: 60_000,
    refetchInterval: 90_000,
    retry: false,
  });

  const { data: check } = useGeofenceCheck(fixQuery.data);

  const locate = async () => {
    await queryClient.fetchQuery({ queryKey: queryKeys.geo.fix(), queryFn: () => acquireBestFix({ maxWaitMs: 8000 }) }).catch(() => {});
    void queryClient.invalidateQueries({ queryKey: queryKeys.geo.permission() });
  };

  if (!permission || permission === 'unsupported') return null;

  if (permission === 'denied' || (fixQuery.error instanceof GeoError && fixQuery.error.reason === 'denied')) {
    return (
      <Chip kind="warn" icon={<MapPinOff className="size-4" />}>
        Location is blocked. Allow it in your browser's site settings to check in.
      </Chip>
    );
  }

  if (permission === 'prompt') {
    return (
      <Chip kind="muted" icon={<Crosshair className="size-4" />}>
        <button type="button" onClick={locate} className="underline underline-offset-2 hover:text-foreground">
          Check whether I'm at the office
        </button>
      </Chip>
    );
  }

  if (fixQuery.isFetching && !check) {
    return (
      <Chip kind="muted" icon={<Loader2 className="size-4 animate-spin" />}>
        Finding your location…
      </Chip>
    );
  }

  if (fixQuery.isError) {
    return (
      <Chip kind="warn" icon={<MapPinOff className="size-4" />}>
        Couldn't get your location.{' '}
        <button type="button" onClick={() => fixQuery.refetch()} className="underline underline-offset-2">
          Try again
        </button>
      </Chip>
    );
  }

  if (!check || !check.officesConfigured || !check.office) return null;

  if (check.accuracyTooLow) {
    return (
      <Chip kind="warn" icon={<SignalLow className="size-4" />}>
        Weak signal (±{Math.round(fixQuery.data?.accuracy ?? 0)} m). Move near a window for an accurate check-in.
      </Chip>
    );
  }

  if (check.inside) {
    return (
      <Chip kind="ok" icon={<MapPin className="size-4" />}>
        You're at <strong className="font-semibold">{check.office.name}</strong>
      </Chip>
    );
  }

  return (
    <Chip kind={check.enforced ? 'warn' : 'muted'} icon={<MapPin className="size-4" />}>
      {formatDistance(check.distance ?? 0)} from {check.office.name}
      {check.enforced && (check.canRequestWFH ? ' · check-in will ask for a WFH request' : ' · check-in needs you on-site')}
    </Chip>
  );
}
