export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export class GeoError extends Error {
  constructor(
    message: string,
    public readonly reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout'
  ) {
    super(message);
    this.name = 'GeoError';
  }
}

interface AcquireOptions {
  /** Resolve as soon as a fix is at least this accurate (meters). */
  targetAccuracy?: number;
  /** Give up waiting for a better fix after this long and use the best one. */
  maxWaitMs?: number;
  onProgress?: (accuracy: number) => void;
}

const toFix = (position: GeolocationPosition): GeoFix => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  capturedAt: new Date().toISOString(),
});

/**
 * The first fix a phone reports is usually a coarse Wi-Fi/cell estimate
 * (100m+); GPS refines it over the next few seconds. A single
 * getCurrentPosition takes whatever comes first, which is why on-site
 * employees got "location too imprecise". This watches and keeps the best.
 */
export function acquireBestFix({ targetAccuracy = 30, maxWaitMs = 12_000, onProgress }: AcquireOptions = {}): Promise<GeoFix> {
  if (!('geolocation' in navigator)) {
    return Promise.reject(new GeoError('This device does not support location.', 'unsupported'));
  }

  return new Promise((resolve, reject) => {
    let best: GeoFix | null = null;
    let settled = false;

    const finish = (outcome: () => void) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      outcome();
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fix = toFix(position);
        if (!best || fix.accuracy < best.accuracy) {
          best = fix;
          onProgress?.(fix.accuracy);
        }
        if (fix.accuracy <= targetAccuracy) finish(() => resolve(fix));
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          finish(() => reject(new GeoError('Location permission is blocked for this site.', 'denied')));
        } else if (!best && error.code === error.POSITION_UNAVAILABLE) {
          finish(() => reject(new GeoError('Your location is unavailable. Turn on location services.', 'unavailable')));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs }
    );

    const timer = setTimeout(() => {
      finish(() =>
        best ? resolve(best) : reject(new GeoError('Timed out getting your location.', 'timeout'))
      );
    }, maxWaitMs);
  });
}

export async function getGeoPermission(): Promise<PermissionState | 'unsupported'> {
  if (!('geolocation' in navigator)) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'prompt';
  }
}

export const formatDistance = (meters: number): string =>
  meters >= 1000 ? `${(meters / 1000).toFixed(meters >= 10_000 ? 0 : 1)} km` : `${Math.round(meters)} m`;

/** Mirrors the backend OfficeLocation bounds. */
export const MIN_GEOFENCE_RADIUS = 50;
export const MAX_GEOFENCE_RADIUS = 5000;

/**
 * Accepts "12.97, 77.59", or a Google/Apple Maps link — the usual way HR
 * actually has an office's location to hand.
 */
export function parseCoordinates(text: string): { latitude: number; longitude: number } | null {
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|ll|query|daddr)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) return { latitude, longitude };
  }
  return null;
}
